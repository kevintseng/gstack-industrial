#!/usr/bin/env bun
/**
 * gen-skill-docs.ts
 *
 * Template-based skill documentation generator for gstack integration.
 * Generates SKILL.md files from SKILL.md.tmpl templates with placeholder replacement.
 *
 * Usage:
 *   bun run gen-skill-docs.ts                    # Generate all template-based skills
 *   bun run gen-skill-docs.ts --skill commit     # Generate specific skill
 *   bun run gen-skill-docs.ts --check            # Verify all skills in sync
 *   bun run gen-skill-docs.ts --watch            # Watch mode (auto-regenerate)
 *
 * @see ~/.claude/skills/templates/README.md
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, watch } from 'fs';
import { join, basename } from 'path';

const SKILLS_DIR = `${process.env.HOME}/.claude/skills`;
const TEMPLATES_DIR = `${SKILLS_DIR}/templates`;

interface Metadata {
  skill_name: string;
  custom_placeholders?: Record<string, string>;
}

interface GenerationResult {
  skill: string;
  success: boolean;
  changed: boolean;
  error?: string;
}

/**
 * Load standard section templates
 */
function loadSectionTemplates(): Record<string, string> {
  const sections: Record<string, string> = {};

  const sectionFiles = [
    'universal-preamble-section.md',
    'askuserquestion-standard-section.md',
    'completeness-principle-section.md'
  ];

  for (const file of sectionFiles) {
    const path = join(TEMPLATES_DIR, file);
    if (existsSync(path)) {
      const key = file.replace('-section.md', '').toUpperCase().replace(/-/g, '_');
      sections[`{{${key}_BLOCK}}`] = readFileSync(path, 'utf-8');
    }
  }

  return sections;
}

/**
 * Find all skills with .tmpl templates
 */
function findTemplateBasedSkills(): string[] {
  const skills: string[] = [];

  const entries = readdirSync(SKILLS_DIR);
  for (const entry of entries) {
    const skillPath = join(SKILLS_DIR, entry);
    if (statSync(skillPath).isDirectory() && entry !== 'templates') {
      const tmplPath = join(skillPath, 'SKILL.md.tmpl');
      if (existsSync(tmplPath)) {
        skills.push(entry);
      }
    }
  }

  return skills;
}

/**
 * Load skill metadata (if exists)
 */
function loadMetadata(skillName: string): Metadata {
  const metadataPath = join(SKILLS_DIR, skillName, 'metadata.json');

  if (existsSync(metadataPath)) {
    try {
      const content = readFileSync(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️  Failed to parse metadata.json for ${skillName}: ${error}`);
    }
  }

  return { skill_name: skillName };
}

/**
 * Replace placeholders in template content
 */
function replacePlaceholders(
  template: string,
  sections: Record<string, string>,
  metadata: Metadata
): string {
  let result = template;

  // Replace standard section blocks
  for (const [placeholder, content] of Object.entries(sections)) {
    result = result.replace(new RegExp(placeholder, 'g'), content);
  }

  // Replace skill-specific placeholders
  if (metadata.custom_placeholders) {
    for (const [key, value] of Object.entries(metadata.custom_placeholders)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
  }

  // Replace basic metadata placeholders
  result = result.replace(/\{\{SKILL_NAME\}\}/g, metadata.skill_name);

  return result;
}

/**
 * Validate generated content (check for unresolved placeholders)
 */
function validateGenerated(content: string, skillName: string): string | null {
  const unresolvedPlaceholders = content.match(/\{\{[A-Z_]+\}\}/g);

  if (unresolvedPlaceholders) {
    return `Unresolved placeholders: ${unresolvedPlaceholders.join(', ')}`;
  }

  return null;
}

/**
 * Generate SKILL.md for a single skill
 */
function generateSkillDoc(skillName: string, sections: Record<string, string>): GenerationResult {
  const skillPath = join(SKILLS_DIR, skillName);
  const tmplPath = join(skillPath, 'SKILL.md.tmpl');
  const outPath = join(skillPath, 'SKILL.md');

  try {
    // Load template
    const template = readFileSync(tmplPath, 'utf-8');

    // Load metadata
    const metadata = loadMetadata(skillName);

    // Replace placeholders
    const generated = replacePlaceholders(template, sections, metadata);

    // Validate
    const validationError = validateGenerated(generated, skillName);
    if (validationError) {
      return {
        skill: skillName,
        success: false,
        changed: false,
        error: validationError
      };
    }

    // Check if changed
    let changed = true;
    if (existsSync(outPath)) {
      const existing = readFileSync(outPath, 'utf-8');
      changed = existing !== generated;
    }

    // Write output
    if (changed) {
      writeFileSync(outPath, generated, 'utf-8');
    }

    return {
      skill: skillName,
      success: true,
      changed
    };
  } catch (error) {
    return {
      skill: skillName,
      success: false,
      changed: false,
      error: String(error)
    };
  }
}

/**
 * Generate all template-based skills
 */
function generateAll(sections: Record<string, string>, specificSkill?: string): GenerationResult[] {
  const skills = specificSkill ? [specificSkill] : findTemplateBasedSkills();
  const results: GenerationResult[] = [];

  for (const skill of skills) {
    const result = generateSkillDoc(skill, sections);
    results.push(result);
  }

  return results;
}

/**
 * Check mode: verify all generated files are in sync
 */
function checkMode(sections: Record<string, string>): boolean {
  const results = generateAll(sections);

  const outOfSync = results.filter(r => r.changed);
  const errors = results.filter(r => !r.success);

  if (errors.length > 0) {
    console.error('❌ Generation errors:');
    for (const result of errors) {
      console.error(`   ${result.skill}: ${result.error}`);
    }
    return false;
  }

  if (outOfSync.length > 0) {
    console.error(`❌ ${outOfSync.length} skill(s) out of sync:`);
    for (const result of outOfSync) {
      console.error(`   ${result.skill}`);
    }
    console.error('\nRun without --check to regenerate.');
    return false;
  }

  console.log(`✅ All ${results.length} template-based skills in sync`);
  return true;
}

/**
 * Watch mode: monitor template files and auto-regenerate
 */
function watchMode(sections: Record<string, string>): void {
  console.log('👀 Watch mode enabled. Monitoring for changes...');
  console.log('   Press Ctrl+C to stop.\n');

  const skills = findTemplateBasedSkills();

  // Watch section templates
  for (const sectionFile of ['universal-preamble-section.md', 'askuserquestion-standard-section.md', 'completeness-principle-section.md']) {
    const path = join(TEMPLATES_DIR, sectionFile);
    if (existsSync(path)) {
      watch(path, (eventType) => {
        if (eventType === 'change') {
          console.log(`\n🔄 Section template changed: ${sectionFile}`);
          console.log('   Regenerating all skills...\n');
          const updatedSections = loadSectionTemplates();
          const results = generateAll(updatedSections);
          printResults(results);
        }
      });
    }
  }

  // Watch individual skill templates
  for (const skill of skills) {
    const tmplPath = join(SKILLS_DIR, skill, 'SKILL.md.tmpl');
    const metadataPath = join(SKILLS_DIR, skill, 'metadata.json');

    watch(tmplPath, (eventType) => {
      if (eventType === 'change') {
        console.log(`\n🔄 Template changed: ${skill}`);
        const result = generateSkillDoc(skill, sections);
        printResults([result]);
      }
    });

    if (existsSync(metadataPath)) {
      watch(metadataPath, (eventType) => {
        if (eventType === 'change') {
          console.log(`\n🔄 Metadata changed: ${skill}`);
          const result = generateSkillDoc(skill, sections);
          printResults([result]);
        }
      });
    }
  }
}

/**
 * Print generation results
 */
function printResults(results: GenerationResult[]): void {
  const succeeded = results.filter(r => r.success);
  const changed = results.filter(r => r.success && r.changed);
  const errors = results.filter(r => !r.success);

  if (changed.length > 0) {
    console.log(`✅ Generated ${changed.length} skill(s):`);
    for (const result of changed) {
      console.log(`   ${result.skill}`);
    }
  }

  if (succeeded.length > 0 && changed.length === 0) {
    console.log(`✅ All ${succeeded.length} skill(s) already up-to-date`);
  }

  if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} error(s):`);
    for (const result of errors) {
      console.error(`   ${result.skill}: ${result.error}`);
    }
  }
}

/**
 * Main entry point
 */
function main(): void {
  const args = process.argv.slice(2);

  // Parse CLI arguments
  const checkOnly = args.includes('--check');
  const watchEnabled = args.includes('--watch');
  const skillIndex = args.indexOf('--skill');
  const specificSkill = skillIndex >= 0 && args[skillIndex + 1] ? args[skillIndex + 1] : undefined;

  // Load section templates
  const sections = loadSectionTemplates();

  // Execute based on mode
  if (checkOnly) {
    const success = checkMode(sections);
    process.exit(success ? 0 : 1);
  } else if (watchEnabled) {
    watchMode(sections);
  } else {
    const results = generateAll(sections, specificSkill);
    printResults(results);

    const hasErrors = results.some(r => !r.success);
    process.exit(hasErrors ? 1 : 0);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { generateSkillDoc, generateAll, checkMode, loadSectionTemplates };
