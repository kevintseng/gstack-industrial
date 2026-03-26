#!/usr/bin/env bun
/**
 * gstack-industrial Installation Script
 *
 * Installs template system and skill router to Claude Code
 */

import { copyFileSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';
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
    'auto-discover.ts',
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

  // 4. Copy hooks
  console.log('🎣 Installing Hooks...');
  const hookFiles = [
    'skill-router-before-message.ts',
    'skill-discovery-session-start.sh',
  ];

  for (const hookFile of hookFiles) {
    const src = join(process.cwd(), 'hooks', hookFile);
    const dest = join(HOOKS_DIR, hookFile);
    if (existsSync(src)) {
      copyFile(src, dest);
      try {
        await Bun.spawn(['chmod', '+x', dest]).exited;
        console.log(`✅ Made executable: ${dest}`);
      } catch (error) {
        console.error('❌ Failed to make hook executable:', error);
      }
    }
  }
  const hookDest = join(HOOKS_DIR, 'skill-router-before-message.ts');
  const sessionHookDest = join(HOOKS_DIR, 'skill-discovery-session-start.sh');
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

  // 6. Register hook in settings.json (idempotent)
  console.log('🔧 Registering hook in settings.json...');
  const settingsPath = join(CLAUDE_DIR, 'settings.json');
  try {
    let settings: any = {};
    if (existsSync(settingsPath)) {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    }
    let changed = false;
    if (!settings.hooks) settings.hooks = {};
    if (!settings.hooks.UserPromptSubmit) settings.hooks.UserPromptSubmit = [];

    const hookCommand = `bun run ${hookDest}`;
    const hasHook = settings.hooks.UserPromptSubmit.some((entry: any) =>
      entry.hooks?.some((h: any) => h.command?.includes('skill-router-before-message'))
    );

    if (!hasHook) {
      settings.hooks.UserPromptSubmit.push({
        matcher: '*',
        hooks: [{ type: 'command', command: hookCommand }],
      });
      changed = true;
      console.log(`✅ Registered UserPromptSubmit hook`);
    } else {
      console.log(`ℹ️  UserPromptSubmit hook already registered`);
    }

    // Register SessionStart hook for auto-discovery
    if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];

    const sessionHookCommand = `bash ${sessionHookDest}`;
    const hasSessionHook = settings.hooks.SessionStart.some((entry: any) =>
      entry.hooks?.some((h: any) => h.command?.includes('skill-discovery-session-start'))
    );

    if (!hasSessionHook) {
      settings.hooks.SessionStart.push({
        matcher: 'startup',
        hooks: [{ type: 'command', command: sessionHookCommand }],
      });
      changed = true;
      console.log(`✅ Registered SessionStart hook (auto-discovery)`);
    } else {
      console.log(`ℹ️  SessionStart hook already registered`);
    }

    if (changed) {
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      console.log(`✅ settings.json updated`);
    }
  } catch (error) {
    console.error('❌ Failed to register hook:', error);
    console.log('   Manual step: add to ~/.claude/settings.json under hooks');
  }
  console.log('');

  // 7. Run auto-discovery to populate matchers.json
  console.log('🔍 Running skill auto-discovery...');
  try {
    const autoDiscoverPath = join(routerDest, 'auto-discover.ts');
    if (existsSync(autoDiscoverPath)) {
      const proc = Bun.spawn(['bun', 'run', autoDiscoverPath], {
        cwd: routerDest,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      await proc.exited;
      const stdout = await new Response(proc.stdout).text();
      if (stdout.trim()) console.log(stdout.trim());
    }
  } catch (error) {
    console.error('⚠️  Auto-discovery failed (non-critical):', error);
  }
  console.log('');

  // 8. Success message
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
  console.log('2. Generate template-based skills:');
  console.log('   cd ~/.claude/skills/templates');
  console.log('   bun run skill-router/gen-skill-docs.ts');
  console.log('');
  console.log('📚 Documentation: https://github.com/kevintseng/gstack-industrial');
  console.log('');
}

main().catch(error => {
  console.error('❌ Installation failed:', error);
  process.exit(1);
});
