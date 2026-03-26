#!/usr/bin/env bun
/**
 * Skill Router - Before Message Hook
 *
 * Analyzes user messages and suggests relevant skills proactively.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

// Import router
const ROUTER_PATH = resolve(homedir(), '.claude/skills/templates/skill-router');

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
  const configPath = resolve(homedir(), '.claude/config/skill-router.json');

  try {
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('[skill-router] Failed to load config:', error);
  }

  // Default config
  return {
    enabled: true,
    threshold: 80,
    maxSuggestionsPerSession: 10,
    cooldownMinutes: 5,
    disabledSkills: [],
    priorityBoosts: {},
  };
}

function getSessionState() {
  const sessionPath = resolve(homedir(), '.claude/sessions/skill-router-state.json');

  try {
    if (existsSync(sessionPath)) {
      const content = readFileSync(sessionPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    // Ignore, return default state
  }

  return {
    suggestionsCount: 0,
    lastSuggestionTime: 0,
    lastSuggestedSkill: null,
    disabledThisSession: false,
    suggestionHistory: [],
  };
}

function updateSessionState(updates: any) {
  const sessionPath = resolve(homedir(), '.claude/sessions/skill-router-state.json');
  const state = getSessionState();

  const newState = { ...state, ...updates };

  try {
    writeFileSync(sessionPath, JSON.stringify(newState, null, 2));
  } catch (error) {
    console.error('[skill-router] Failed to update session state:', error);
  }
}

function checkCooldown(state: any, config: any): boolean {
  if (state.lastSuggestionTime === 0) return true;

  const now = Date.now();
  const cooldownMs = config.cooldownMinutes * 60 * 1000;
  const timeSinceLastSuggestion = now - state.lastSuggestionTime;

  return timeSinceLastSuggestion >= cooldownMs;
}

function checkMaxSuggestions(state: any, config: any): boolean {
  return state.suggestionsCount < config.maxSuggestionsPerSession;
}

function parseUserResponse(message: string): {
  isResponse: boolean;
  action: 'accept' | 'decline' | 'stop';
} {
  const msg = message.trim().toLowerCase();

  // Accept responses
  if (msg.match(/^(yes|y|ok|sure|go|do it|run it)$/)) {
    return { isResponse: true, action: 'accept' };
  }

  // Stop suggesting
  if (msg.match(/stop suggest|no more|disable suggest|turn off|quiet/)) {
    return { isResponse: true, action: 'stop' };
  }

  // Decline
  if (msg.match(/^(no|n|nah|nope|not now|skip|pass)$/)) {
    return { isResponse: true, action: 'decline' };
  }

  return { isResponse: false, action: 'decline' };
}

async function main() {
  // Read user message from stdin (Claude Code hook protocol)
  let message = '';
  try {
    const raw = await Bun.stdin.text();
    const trimmed = raw.trim();
    if (trimmed) {
      const data = JSON.parse(trimmed);
      message = data.prompt || data.message || '';
    }
  } catch {
    // Ignore stdin parse errors
  }

  // Fallback to argv for CLI testing: bun run hook.ts "message"
  if (!message) {
    message = process.argv[2] || '';
  }

  if (!message) {
    process.exit(0);
  }

  // Load configuration
  const config = loadConfig();

  if (!config.enabled) {
    // Router disabled
    process.exit(0);
  }

  // Check session state
  const state = getSessionState();

  if (state.disabledThisSession) {
    // User disabled suggestions this session
    process.exit(0);
  }

  // Check if this is a response to a previous suggestion
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
      // User accepted suggestion - signal Claude to invoke skill
      process.stdout.write(JSON.stringify({
        additionalContext: `💡 User accepted suggestion. Invoke the skill: @${state.lastSuggestedSkill}`,
      }));
      process.exit(0);
    }

    if (response.action === 'decline') {
      // User declined - continue normally
      process.stdout.write(JSON.stringify({}));
      process.exit(0);
    }
  }

  // Check cooldown
  if (!checkCooldown(state, config)) {
    // Still in cooldown period
    process.exit(0);
  }

  // Check max suggestions
  if (!checkMaxSuggestions(state, config)) {
    // Reached max suggestions for this session
    process.exit(0);
  }

  // Load router
  const router = await loadRouter();
  if (!router) {
    process.exit(0);
  }

  // Load matchers
  const matchers = await loadMatchers();
  if (matchers.length === 0) {
    process.exit(0);
  }

  // Filter out disabled skills
  const activeMatchers = matchers.filter(
    (m: any) => !config.disabledSkills.includes(m.skill)
  );

  // Apply priority boosts
  const boostedMatchers = activeMatchers.map((m: any) => {
    if (config.priorityBoosts[m.skill]) {
      return {
        ...m,
        priority: m.priority - (config.priorityBoosts[m.skill] / 10),
      };
    }
    return m;
  });

  // Route the message
  const match = router.route(message, boostedMatchers);

  if (!match) {
    // No match found
    process.exit(0);
  }

  // Check if same skill was suggested recently
  if (
    state.lastSuggestedSkill === match.skill &&
    state.suggestionHistory.slice(-3).filter((s: string) => s === match.skill).length >= 3
  ) {
    // Same skill suggested 3 times in a row - skip to avoid spam
    process.exit(0);
  }

  // Output suggestion as Claude Code hook additionalContext JSON
  const suggestion = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `💡 Suggestion: Use @${match.skill} for this task`,
    `   ${match.explanation}`,
    `   (Say "yes" to run, or "stop suggesting" to disable)`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');
  process.stdout.write(JSON.stringify({ additionalContext: suggestion }));

  // Update session state
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
