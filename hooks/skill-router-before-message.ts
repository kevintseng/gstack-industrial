#!/usr/bin/env bun
/**
 * Skill Router - Before Message Hook
 *
 * Analyzes user messages and suggests relevant skills proactively.
 * All state is local-only (never sent anywhere).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import { spawnSync } from 'child_process';

const ROUTER_PATH = resolve(homedir(), '.claude/skills/templates/skill-router');
const STATE_DIR = resolve(homedir(), '.claude/sessions');
const CONFIG_PATH = resolve(homedir(), '.claude/config/skill-router.json');
const SESSION_STATE_PATH = resolve(STATE_DIR, 'skill-router-state.json');
const FEEDBACK_PATH = resolve(STATE_DIR, 'skill-router-feedback.json');

// ─── Loaders ──────────────────────────────────────────────────────────

async function loadRouter() {
  try {
    const { route, getContext } = await import(resolve(ROUTER_PATH, 'index.ts'));
    return { route, getContext };
  } catch (error) {
    console.error('[skill-router] Failed to load router:', error);
    return null;
  }
}

async function loadMatchers() {
  try {
    const matchersPath = resolve(ROUTER_PATH, 'matchers.json');
    const content = readFileSync(matchersPath, 'utf-8');
    const registry = JSON.parse(content);
    return registry.matchers;
  } catch (error) {
    console.error('[skill-router] Failed to load matchers:', error);
    return [];
  }
}

function loadConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (error) {
    console.error('[skill-router] Failed to load config:', error);
  }

  return {
    enabled: true,
    threshold: 80,
    maxSuggestionsPerSession: 500,
    cooldownMinutes: 5,
    disabledSkills: [],
    priorityBoosts: {},
    repoModeThresholds: { solo: 60, collaborative: 85, unknown: 80 },
    showLimitWarnings: true,
    feedbackBoost: 20,
    feedbackPenalty: 30,
  };
}

function getSessionState() {
  try {
    if (existsSync(SESSION_STATE_PATH)) {
      return JSON.parse(readFileSync(SESSION_STATE_PATH, 'utf-8'));
    }
  } catch {}

  return {
    suggestionsCount: 0,
    lastSuggestionTime: 0,
    lastSuggestedSkill: null,
    disabledThisSession: false,
    suggestionHistory: [],
  };
}

function updateSessionState(updates: any) {
  const state = getSessionState();
  const newState = { ...state, ...updates };
  try {
    writeFileSync(SESSION_STATE_PATH, JSON.stringify(newState, null, 2));
  } catch (error) {
    console.error('[skill-router] Failed to update session state:', error);
  }
}

// ─── Feedback Store (local only) ───────────────────────────────────────

interface FeedbackRecord {
  skill: string;
  accepted: number;
  dismissed: number;
  lastUsedAt: number;
}

function loadFeedback(): Record<string, FeedbackRecord> {
  try {
    if (existsSync(FEEDBACK_PATH)) {
      return JSON.parse(readFileSync(FEEDBACK_PATH, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveFeedback(feedback: Record<string, FeedbackRecord>) {
  try {
    writeFileSync(FEEDBACK_PATH, JSON.stringify(feedback, null, 2));
  } catch {}
}

function recordFeedback(skill: string, action: 'accept' | 'dismiss') {
  const feedback = loadFeedback();
  if (!feedback[skill]) {
    feedback[skill] = { skill, accepted: 0, dismissed: 0, lastUsedAt: 0 };
  }
  if (action === 'accept') {
    feedback[skill].accepted++;
    feedback[skill].lastUsedAt = Date.now();
  } else {
    feedback[skill].dismissed++;
  }
  saveFeedback(feedback);
}

function getFeedbackScore(skill: string): number {
  const feedback = loadFeedback();
  const record = feedback[skill];
  if (!record) return 0;

  const total = record.accepted + record.dismissed;
  if (total < 3) return 0; // Not enough data

  const acceptRate = record.accepted / total;
  return (acceptRate - 0.5) * 2; // Range: -1 to +1
}

// ─── Sequence Learning (reads gstack's timeline.jsonl) ────────────────

// Reuses gstack's timeline.jsonl (no duplicate data store).
// gstack records skill completions per branch in ~/.gstack/projects/{slug}/timeline.jsonl

function getTimelinePath(): string | null {
  // Read slug from gstack
  const slugBin = resolve(homedir(), '.claude/skills/gstack/bin/gstack-slug');
  if (!existsSync(slugBin)) return null;

  try {
    const result = spawnSync(slugBin, [], { encoding: 'utf-8', timeout: 2000 });
    if (result.status !== 0 || !result.stdout) return null;
    // Output: "SLUG=kevintseng-xylon-studio" or similar
    const match = result.stdout.match(/SLUG=([^\s;]+)/);
    if (!match) return null;
    const slug = match[1];
    const timelinePath = resolve(homedir(), '.gstack/projects', slug, 'timeline.jsonl');
    return existsSync(timelinePath) ? timelinePath : null;
  } catch {
    return null;
  }
}

function predictNextSkill(lastAccepted: string | null): string | null {
  if (!lastAccepted) return null;
  const timelinePath = getTimelinePath();
  if (!timelinePath) return null;

  try {
    const content = readFileSync(timelinePath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    // Build pair counts from completed skill events
    const skills: string[] = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.event === 'completed' && entry.skill) {
          skills.push(entry.skill);
        }
      } catch {}
    }

    // Count pairs where prev = lastAccepted
    const pairCounts: Record<string, number> = {};
    for (let i = 0; i < skills.length - 1; i++) {
      if (skills[i] === lastAccepted && skills[i + 1] !== lastAccepted) {
        const next = skills[i + 1];
        pairCounts[next] = (pairCounts[next] || 0) + 1;
      }
    }

    // Return skill with highest count (min 2 occurrences)
    let bestSkill: string | null = null;
    let bestCount = 1;
    for (const [skill, count] of Object.entries(pairCounts)) {
      if (count >= 2 && count > bestCount) {
        bestSkill = skill;
        bestCount = count;
      }
    }

    return bestSkill;
  } catch {
    return null;
  }
}

// ─── Repo Mode Detection (reuses gstack-repo-mode binary) ─────────────

function detectRepoMode(): 'solo' | 'collaborative' | 'unknown' {
  // Reuse gstack's detection: 90-day window, 80% threshold, 7-day cache,
  // user override via gstack-config. No need to reinvent this.
  const gstackBin = resolve(homedir(), '.claude/skills/gstack/bin/gstack-repo-mode');
  if (!existsSync(gstackBin)) return 'unknown';

  try {
    const result = spawnSync(gstackBin, [], {
      encoding: 'utf-8',
      timeout: 2000,
    });
    if (result.status !== 0 || !result.stdout) return 'unknown';
    // Output format: "REPO_MODE=solo" or "REPO_MODE=collaborative" etc.
    const match = result.stdout.match(/REPO_MODE=(solo|collaborative|unknown)/);
    return match ? (match[1] as 'solo' | 'collaborative' | 'unknown') : 'unknown';
  } catch {}
  return 'unknown';
}

// ─── Guards ────────────────────────────────────────────────────────────

function getEffectiveThreshold(config: any, repoMode: string): number {
  if (config.repoModeThresholds && config.repoModeThresholds[repoMode] !== undefined) {
    return config.repoModeThresholds[repoMode];
  }
  return config.threshold;
}

function checkCooldown(state: any, config: any): boolean {
  if (state.lastSuggestionTime === 0) return true;
  const now = Date.now();
  const cooldownMs = config.cooldownMinutes * 60 * 1000;
  return (now - state.lastSuggestionTime) >= cooldownMs;
}

function checkMaxSuggestions(state: any, config: any): boolean {
  return state.suggestionsCount < config.maxSuggestionsPerSession;
}

// ─── User Response Parser ─────────────────────────────────────────────

function parseUserResponse(message: string): {
  isResponse: boolean;
  action: 'accept' | 'decline' | 'stop';
} {
  const msg = message.trim().toLowerCase();
  if (msg.match(/^(yes|y|ok|sure|go|do it|run it)$/)) {
    return { isResponse: true, action: 'accept' };
  }
  if (msg.match(/stop suggest|no more|disable suggest|turn off|quiet/)) {
    return { isResponse: true, action: 'stop' };
  }
  if (msg.match(/^(no|n|nah|nope|not now|skip|pass)$/)) {
    return { isResponse: true, action: 'decline' };
  }
  return { isResponse: false, action: 'decline' };
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  let message = '';
  try {
    const raw = await Bun.stdin.text();
    const trimmed = raw.trim();
    if (trimmed) {
      const data = JSON.parse(trimmed);
      message = data.prompt || data.message || '';
    }
  } catch {}

  if (!message) message = process.argv[2] || '';
  if (!message) process.exit(0);

  const config = loadConfig();
  if (!config.enabled) process.exit(0);

  const state = getSessionState();
  if (state.disabledThisSession) process.exit(0);

  // Handle user response to previous suggestion
  const response = parseUserResponse(message);
  if (response.isResponse) {
    if (response.action === 'stop') {
      updateSessionState({ disabledThisSession: true });
      process.stdout.write(JSON.stringify({
        additionalContext: '✓ Skill suggestions disabled for this session',
      }));
      process.exit(0);
    }

    if (response.action === 'accept' && state.lastSuggestedSkill) {
      recordFeedback(state.lastSuggestedSkill, 'accept');
      // Note: skill sequences are recorded by gstack's timeline hooks,
      // not by us. We just read from ~/.gstack/projects/{slug}/timeline.jsonl

      process.stdout.write(JSON.stringify({
        additionalContext: `💡 User accepted suggestion. Invoke the skill: @${state.lastSuggestedSkill}`,
      }));
      process.exit(0);
    }

    if (response.action === 'decline' && state.lastSuggestedSkill) {
      recordFeedback(state.lastSuggestedSkill, 'dismiss');
      process.stdout.write(JSON.stringify({}));
      process.exit(0);
    }
  }

  if (!checkCooldown(state, config)) process.exit(0);

  // Item 1: Visible warning when limit reached (no more silent failure)
  if (!checkMaxSuggestions(state, config)) {
    if (config.showLimitWarnings !== false) {
      process.stdout.write(JSON.stringify({
        additionalContext: `⚠️  Skill router: suggestion limit reached (${config.maxSuggestionsPerSession}/session). Restart session or raise \`maxSuggestionsPerSession\` in ~/.claude/config/skill-router.json`,
      }));
    }
    process.exit(0);
  }

  const router = await loadRouter();
  if (!router) process.exit(0);

  const matchers = await loadMatchers();
  if (matchers.length === 0) process.exit(0);

  const activeMatchers = matchers.filter(
    (m: any) => !config.disabledSkills.includes(m.skill)
  );

  // Apply priority boosts + feedback adjustments (item 2)
  const feedbackBoost = config.feedbackBoost || 20;
  const feedbackPenalty = config.feedbackPenalty || 30;
  const boostedMatchers = activeMatchers.map((m: any) => {
    let priority = m.priority;
    if (config.priorityBoosts[m.skill]) {
      priority -= config.priorityBoosts[m.skill] / 10;
    }
    const feedbackScore = getFeedbackScore(m.skill);
    if (feedbackScore > 0) {
      priority -= feedbackScore * (feedbackBoost / 10);
    } else if (feedbackScore < 0) {
      priority -= feedbackScore * (feedbackPenalty / 10);
    }
    return { ...m, priority };
  });

  // Item 3: Sequence learning — boost predicted next skill
  const predictedNext = predictNextSkill(state.lastSuggestedSkill);
  const finalMatchers = boostedMatchers.map((m: any) => {
    if (m.skill === predictedNext) {
      return { ...m, priority: m.priority - 3 };
    }
    return m;
  });

  // Item 4: Repo-mode aware threshold
  const repoMode = detectRepoMode();
  const effectiveThreshold = getEffectiveThreshold(config, repoMode);
  const configWithThreshold = { ...config, threshold: effectiveThreshold };

  const match = router.route(message, finalMatchers, configWithThreshold);
  if (!match) process.exit(0);

  if (
    state.lastSuggestedSkill === match.skill &&
    state.suggestionHistory.slice(-3).filter((s: string) => s === match.skill).length >= 3
  ) {
    process.exit(0);
  }

  const predictionHint = predictedNext === match.skill ? ' (based on your pattern)' : '';
  const suggestion = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `💡 Suggestion: Use @${match.skill} for this task${predictionHint}`,
    `   ${match.explanation}`,
    `   (Say "yes" to run, or "stop suggesting" to disable)`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');
  process.stdout.write(JSON.stringify({ additionalContext: suggestion }));

  updateSessionState({
    suggestionsCount: state.suggestionsCount + 1,
    lastSuggestionTime: Date.now(),
    lastSuggestedSkill: match.skill,
    suggestionHistory: [...state.suggestionHistory, match.skill].slice(-10),
  });

  process.exit(0);
}

main().catch((error) => {
  console.error('[skill-router] Error:', error);
  process.exit(1);
});
