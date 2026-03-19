#!/usr/bin/env bun
/**
 * gstack-industrial Installation Script
 *
 * Installs template system and skill router to Claude Code
 */

import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CLAUDE_DIR = join(homedir(), '.claude');
const SKILLS_TEMPLATES = join(CLAUDE_DIR, 'skills', 'templates');
const HOOKS_DIR = join(CLAUDE_DIR, 'hooks');
const CONFIG_DIR = join(CLAUDE_DIR, 'config');

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
}

function copyFile(src: string, dest: string) {
  try {
    copyFileSync(src, dest);
    console.log(`✅ Copied: ${dest}`);
  } catch (error) {
    console.error(`❌ Failed to copy ${src}:`, error);
  }
}

function copyDirectory(src: string, dest: string) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const items = readFileSync(src, 'utf-8').split('\n');
  items.forEach(item => {
    if (item) {
      const srcPath = join(src, item);
      const destPath = join(dest, item);
      if (existsSync(srcPath)) {
        copyFile(srcPath, destPath);
      }
    }
  });
}

async function main() {
  console.log('\n🚀 Installing gstack-industrial...\n');

  // 1. Ensure directories exist
  console.log('📁 Creating directories...');
  ensureDir(SKILLS_TEMPLATES);
  ensureDir(HOOKS_DIR);
  ensureDir(CONFIG_DIR);
  ensureDir(join(CONFIG_DIR, 'sessions'));
  console.log('');

  // 2. Copy skill-router
  console.log('📦 Installing Skill Router...');
  const routerDest = join(SKILLS_TEMPLATES, 'skill-router');
  ensureDir(routerDest);

  const routerFiles = [
    'types.ts',
    'context-extractor.ts',
    'matcher-engine.ts',
    'suggestion-formatter.ts',
    'index.ts',
    'gen-skill-docs.ts',
    'test-cli.ts',
    'matchers.json',
    'README.md'
  ];

  routerFiles.forEach(file => {
    const src = join(process.cwd(), 'skill-router', file);
    const dest = join(routerDest, file);
    if (existsSync(src)) {
      copyFile(src, dest);
    }
  });
  console.log('');

  // 3. Copy standard sections
  console.log('📄 Installing Standard Sections...');
  const sectionsFiles = [
    'universal-preamble-section.md',
    'askuserquestion-standard-section.md',
    'completeness-principle-section.md'
  ];

  sectionsFiles.forEach(file => {
    const src = join(process.cwd(), 'standard-sections', file);
    const dest = join(SKILLS_TEMPLATES, file);
    if (existsSync(src)) {
      copyFile(src, dest);
    }
  });
  console.log('');

  // 4. Copy hook
  console.log('🎣 Installing Hook...');
  const hookSrc = join(process.cwd(), 'hooks', 'skill-router-before-message.ts');
  const hookDest = join(HOOKS_DIR, 'skill-router-before-message.ts');
  if (existsSync(hookSrc)) {
    copyFile(hookSrc, hookDest);
    // Make executable
    try {
      await Bun.spawn(['chmod', '+x', hookDest]).exited;
      console.log(`✅ Made executable: ${hookDest}`);
    } catch (error) {
      console.error('❌ Failed to make hook executable:', error);
    }
  }
  console.log('');

  // 5. Create default config if not exists
  console.log('⚙️  Setting up configuration...');
  const configPath = join(CONFIG_DIR, 'skill-router.json');
  if (!existsSync(configPath)) {
    const defaultConfig = {
      enabled: true,
      threshold: 80,
      maxSuggestionsPerSession: 10,
      cooldownMinutes: 5,
      disabledSkills: [],
      priorityBoosts: {},
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "08:00"
      }
    };
    writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(`✅ Created default config: ${configPath}`);
  } else {
    console.log(`ℹ️  Config already exists: ${configPath}`);
  }
  console.log('');

  // 6. Success message
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Installation complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📖 Next steps:');
  console.log('');
  console.log('1. Test the router:');
  console.log('   cd ~/.claude/skills/templates/skill-router');
  console.log('   bun run test-cli.ts "I need to brainstorm" --debug');
  console.log('');
  console.log('2. Enable hookify integration:');
  console.log('   Add to ~/.claude/settings.json:');
  console.log('   {');
  console.log('     "hooks": {');
  console.log('       "beforeMessage": "~/.claude/hooks/skill-router-before-message.ts"');
  console.log('     }');
  console.log('   }');
  console.log('');
  console.log('3. Generate template-based skills:');
  console.log('   cd ~/.claude/skills/templates');
  console.log('   bun run skill-router/gen-skill-docs.ts');
  console.log('');
  console.log('📚 Documentation: https://github.com/YOUR_USERNAME/gstack-industrial');
  console.log('');
}

main().catch(error => {
  console.error('❌ Installation failed:', error);
  process.exit(1);
});
