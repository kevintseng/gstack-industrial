#!/usr/bin/env bun
/**
 * auto-discover.ts
 *
 * Scans ~/.claude/skills/ for SKILL.md files, extracts metadata,
 * and merges new skills into matchers.json.
 *
 * Runs on session start to keep the skill-router registry up-to-date.
 *
 * Usage:
 *   bun run auto-discover.ts              # Scan and merge
 *   bun run auto-discover.ts --dry-run    # Preview without writing
 *   bun run auto-discover.ts --verbose    # Show all discovered skills
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, basename } from 'path';
import { homedir } from 'os';

// ============================================================================
// Constants
// ============================================================================

const SKILLS_DIR = join(homedir(), '.claude', 'skills');
const MATCHERS_PATH = resolve(import.meta.dir, 'matchers.json');

// Phase keyword mapping — used to infer phase from description
const PHASE_KEYWORDS: Record<string, string[]> = {
  think: ['brainstorm', 'idea', 'think through', 'explore', 'worth building', 'office hours'],
  plan: ['plan', 'architecture', 'design', 'strategy', 'blueprint', 'spec', 'requirements'],
  build: ['implement', 'build', 'create', 'code', 'develop', 'frontend', 'backend', 'component'],
  review: ['review', 'audit', 'check', 'inspect', 'verify', 'security', 'quality'],
  test: ['test', 'qa', 'debug', 'benchmark', 'performance', 'bug', 'failing'],
  ship: ['ship', 'deploy', 'release', 'merge', 'pr', 'land', 'publish', 'canary'],
};

// Words to exclude from auto-generated keywords (too generic)
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'over', 'out', 'up', 'down', 'about', 'against',
  'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
  'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than',
  'too', 'very', 'just', 'because', 'if', 'when', 'where', 'how',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your',
  'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them',
  'use', 'used', 'using', 'run', 'running', 'also', 'then', 'here',
  'there', 'asked', 'want', 'like', 'make', 'made', 'see', 'get',
  'set', 'new', 'one', 'two', 'first', 'last', 'way', 'thing',
  'well', 'back', 'even', 'give', 'take', 'come', 'look', 'find',
  'file', 'files', 'tool', 'tools', 'skill', 'based', 'auto',
]);

// ============================================================================
// Types
// ============================================================================

interface SkillMeta {
  name: string;
  description: string;
  source: string; // e.g., "gstack", "superpowers", "standalone"
  path: string;
}

interface MatcherEntry {
  skill: string;
  priority: number;
  triggers: {
    keywords: string[];
    phase?: string[];
  };
  explanation: string;
  autoDiscovered?: boolean; // marker for auto-generated entries
}

interface MatcherRegistry {
  matchers: MatcherEntry[];
}

// ============================================================================
// SKILL.md Parser
// ============================================================================

/**
 * Parse YAML-like frontmatter from SKILL.md
 * Handles both single-line and multi-line (|) description values.
 */
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, string> = {};
  const lines = yaml.split('\n');

  let currentKey = '';
  let multilineValue = '';
  let inMultiline = false;

  for (const line of lines) {
    if (inMultiline) {
      // Multi-line value continues if indented
      if (line.match(/^\s{2,}/) || line.trim() === '') {
        multilineValue += ' ' + line.trim();
        continue;
      } else {
        // End of multi-line
        result[currentKey] = multilineValue.trim();
        inMultiline = false;
      }
    }

    const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();

      if (value === '|' || value === '>') {
        // Start multi-line
        inMultiline = true;
        multilineValue = '';
      } else {
        result[currentKey] = value.replace(/^["']|["']$/g, '');
      }
    }
  }

  // Handle trailing multi-line
  if (inMultiline && currentKey) {
    result[currentKey] = multilineValue.trim();
  }

  return result;
}

// ============================================================================
// Skill Discovery
// ============================================================================

/**
 * Recursively discover all SKILL.md files under a directory.
 * Stops at depth 3 to avoid deep traversal.
 */
function discoverSkillFiles(dir: string, depth = 0): string[] {
  if (depth > 3) return [];
  if (!existsSync(dir)) return [];

  const results: string[] = [];

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      // Skip hidden dirs, node_modules, dist
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') continue;

      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isFile() && entry === 'SKILL.md') {
        results.push(fullPath);
      } else if (stat.isDirectory()) {
        results.push(...discoverSkillFiles(fullPath, depth + 1));
      }
    }
  } catch {
    // Permission errors, etc.
  }

  return results;
}

/**
 * Determine source (origin) of a skill based on its path.
 */
function inferSource(skillPath: string): string {
  if (skillPath.includes('/gstack/')) return 'gstack';
  if (skillPath.includes('/templates/')) return 'gstack-industrial';
  if (skillPath.includes('/plugins/')) return 'plugin';
  return 'standalone';
}

/**
 * Derive the skill name from a SKILL.md path.
 * For gstack skills: parent directory name.
 * For standalone skills: parent directory name.
 */
function deriveSkillName(skillPath: string, frontmatter: Record<string, string>): string {
  // Prefer frontmatter name
  if (frontmatter.name) return frontmatter.name;
  // Fall back to parent directory
  return basename(join(skillPath, '..'));
}

/**
 * Discover all skills from the skills directory.
 * Deduplicates by name — prefers gstack > plugin > standalone.
 */
function discoverAllSkills(): SkillMeta[] {
  const skillFiles = discoverSkillFiles(SKILLS_DIR);
  const byName = new Map<string, SkillMeta>();

  // Source priority: higher = preferred when deduplicating
  const SOURCE_PRIORITY: Record<string, number> = {
    'gstack': 3,
    'gstack-industrial': 2,
    'plugin': 1,
    'standalone': 0,
  };

  for (const filePath of skillFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const fm = parseFrontmatter(content);

      if (!fm.description) continue; // Skip skills without description

      const name = deriveSkillName(filePath, fm);
      const source = inferSource(filePath);

      // Skip the top-level gstack SKILL.md (it's a meta-skill for /browse)
      if (name === 'gstack' && filePath.endsWith('skills/gstack/SKILL.md')) continue;

      // Skip template/example skills
      if (name === 'template-skill') continue;

      // Dedup: keep highest-priority source
      const existing = byName.get(name);
      if (existing) {
        const existingPriority = SOURCE_PRIORITY[existing.source] ?? 0;
        const newPriority = SOURCE_PRIORITY[source] ?? 0;
        if (newPriority <= existingPriority) continue; // Existing is better or equal
      }

      byName.set(name, {
        name,
        description: fm.description,
        source,
        path: filePath,
      });
    } catch {
      // Skip unreadable files
    }
  }

  return [...byName.values()];
}

// ============================================================================
// Keyword Extraction
// ============================================================================

/**
 * Extract meaningful keywords from a skill description.
 * Returns 3-8 keywords ranked by relevance.
 */
function extractKeywords(description: string, skillName: string): string[] {
  const candidates: string[] = [];

  // 1. Extract quoted trigger phrases (e.g., "review this PR")
  const quoted = description.match(/"([^"]+)"/g);
  if (quoted) {
    for (const q of quoted) {
      const phrase = q.replace(/"/g, '').toLowerCase().trim();
      if (phrase.length > 2 && phrase.length < 40) {
        candidates.push(phrase);
      }
    }
  }

  // 2. Extract slash-command references (e.g., /office-hours)
  const slashCmds = description.match(/\/[\w-]+/g);
  if (slashCmds) {
    for (const cmd of slashCmds) {
      const name = cmd.replace('/', '').replace(/-/g, ' ');
      candidates.push(name);
    }
  }

  // 3. Extract meaningful multi-word phrases
  const phrases = description.toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  // Bigrams from description
  for (let i = 0; i < phrases.length - 1; i++) {
    const bigram = `${phrases[i]} ${phrases[i + 1]}`;
    if (!STOP_WORDS.has(phrases[i]) && !STOP_WORDS.has(phrases[i + 1])) {
      candidates.push(bigram);
    }
  }

  // Single meaningful words
  for (const word of phrases) {
    if (word.length >= 4 && !STOP_WORDS.has(word)) {
      candidates.push(word);
    }
  }

  // 4. Add skill name variants
  const nameWords = skillName.replace(/-/g, ' ');
  candidates.push(nameWords);

  // Deduplicate and rank by length (longer = more specific = better)
  const unique = [...new Set(candidates)];
  const ranked = unique
    .sort((a, b) => {
      // Prefer quoted phrases (exact triggers from description)
      const aQuoted = quoted?.some(q => q.replace(/"/g, '').toLowerCase() === a) ? 1 : 0;
      const bQuoted = quoted?.some(q => q.replace(/"/g, '').toLowerCase() === b) ? 1 : 0;
      if (aQuoted !== bQuoted) return bQuoted - aQuoted;
      // Then prefer longer (more specific)
      return b.length - a.length;
    })
    .slice(0, 8);

  return ranked;
}

/**
 * Infer development phases from description.
 */
function inferPhases(description: string): string[] {
  const desc = description.toLowerCase();
  const phases: string[] = [];

  for (const [phase, keywords] of Object.entries(PHASE_KEYWORDS)) {
    if (keywords.some(kw => desc.includes(kw))) {
      phases.push(phase);
    }
  }

  return phases.length > 0 ? phases : ['build']; // Default to build
}

// ============================================================================
// Matcher Generation
// ============================================================================

/**
 * Generate a matcher entry from skill metadata.
 */
function generateMatcher(skill: SkillMeta, priority: number): MatcherEntry {
  const keywords = extractKeywords(skill.description, skill.name);
  const phases = inferPhases(skill.description);

  // Build explanation from first sentence of description
  const firstSentence = skill.description
    .replace(/\n/g, ' ')
    .split(/\.\s/)[0]
    .trim()
    .slice(0, 80);

  return {
    skill: skill.name,
    priority,
    triggers: {
      keywords,
      phase: phases,
    },
    explanation: firstSentence + (firstSentence.endsWith('.') ? '' : ''),
    autoDiscovered: true,
  };
}

// ============================================================================
// Merge Logic
// ============================================================================

/**
 * Load existing matchers.json.
 */
function loadMatchers(): MatcherRegistry {
  try {
    const content = readFileSync(MATCHERS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { matchers: [] };
  }
}

/**
 * Merge new skills into existing matchers.
 * - Existing manual entries are never overwritten
 * - Auto-discovered entries are updated if the skill is re-scanned
 * - New skills get appended
 */
function mergeMatchers(
  existing: MatcherRegistry,
  discovered: SkillMeta[],
): { merged: MatcherRegistry; added: string[]; updated: string[]; skipped: string[] } {
  const added: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  // Index existing matchers by skill name
  const existingByName = new Map<string, { entry: MatcherEntry; index: number }>();
  for (let i = 0; i < existing.matchers.length; i++) {
    existingByName.set(existing.matchers[i].skill, { entry: existing.matchers[i], index: i });
  }

  // Find max priority for appending
  let maxPriority = Math.max(0, ...existing.matchers.map(m => m.priority));

  const result = [...existing.matchers];

  for (const skill of discovered) {
    const existing = existingByName.get(skill.name);

    if (existing) {
      if (existing.entry.autoDiscovered) {
        // Update auto-discovered entry (re-scan may have better keywords)
        const updated_entry = generateMatcher(skill, existing.entry.priority);
        result[existing.index] = updated_entry;
        updated.push(skill.name);
      } else {
        // Manual entry — don't touch
        skipped.push(skill.name);
      }
    } else {
      // New skill
      maxPriority++;
      const newEntry = generateMatcher(skill, maxPriority);
      result.push(newEntry);
      added.push(skill.name);
    }
  }

  return { merged: { matchers: result }, added, updated, skipped };
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  // 1. Discover all skills
  const discovered = discoverAllSkills();

  if (verbose) {
    console.log(`[auto-discover] Found ${discovered.length} skills:`);
    for (const s of discovered) {
      console.log(`  ${s.name} (${s.source}) — ${s.description.slice(0, 60)}...`);
    }
    console.log('');
  }

  if (discovered.length === 0) {
    console.log('[auto-discover] No skills found.');
    process.exit(0);
  }

  // 2. Load existing matchers
  const existing = loadMatchers();

  // 3. Merge
  const { merged, added, updated, skipped } = mergeMatchers(existing, discovered);

  // 4. Report
  if (added.length > 0) {
    console.log(`[auto-discover] +${added.length} new: ${added.join(', ')}`);
  }
  if (updated.length > 0) {
    console.log(`[auto-discover] ~${updated.length} updated: ${updated.join(', ')}`);
  }
  if (verbose && skipped.length > 0) {
    console.log(`[auto-discover] =${skipped.length} manual (unchanged): ${skipped.join(', ')}`);
  }
  if (added.length === 0 && updated.length === 0) {
    console.log('[auto-discover] matchers.json already up-to-date.');
  }

  // 5. Write (unless dry-run)
  if (!dryRun && (added.length > 0 || updated.length > 0)) {
    writeFileSync(MATCHERS_PATH, JSON.stringify(merged, null, 2) + '\n');
    console.log(`[auto-discover] Wrote ${merged.matchers.length} matchers to matchers.json`);
  } else if (dryRun) {
    console.log(`[auto-discover] Dry run — no changes written.`);
  }
}

main();
