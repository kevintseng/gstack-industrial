/**
 * Suggestion Formatter
 *
 * Formats skill suggestions for display to user.
 */

import { SkillMatch, RouterContext } from './types';

/**
 * Format a skill suggestion for display
 */
export function formatSuggestion(
  match: SkillMatch,
  ctx: RouterContext,
  includeContext: boolean = false
): string {
  let output = `💡 Suggestion: Use @${match.skill} for this task\n`;
  output += `${match.explanation}`;

  // Add context details if requested
  if (includeContext && match.matchedTriggers.length > 0) {
    output += ` (${match.matchedTriggers.join(', ')})`;
  }

  output += `\n\n(Say "yes" to run, or "stop suggesting" to disable)`;

  return output;
}

/**
 * Format multiple suggestions
 */
export function formatMultipleSuggestions(
  matches: SkillMatch[],
  ctx: RouterContext,
  limit: number = 3
): string {
  if (matches.length === 0) {
    return 'No skill suggestions found for this context.';
  }

  const topMatches = matches.slice(0, limit);

  let output = `💡 Skill Suggestions:\n\n`;

  topMatches.forEach((match, index) => {
    output += `${index + 1}. @${match.skill} (score: ${match.score})\n`;
    output += `   ${match.explanation}\n`;
    if (match.matchedTriggers.length > 0) {
      output += `   Matched: ${match.matchedTriggers.join(', ')}\n`;
    }
    output += `\n`;
  });

  output += `(Say the number to run, or "stop suggesting" to disable)`;

  return output;
}

/**
 * Format context summary for debugging
 */
export function formatContextSummary(ctx: RouterContext): string {
  const lines: string[] = [];

  lines.push('Router Context:');
  lines.push(`  Message: "${ctx.message.substring(0, 50)}${ctx.message.length > 50 ? '...' : ''}"`);
  lines.push(`  Phase: ${ctx.currentPhase}`);
  lines.push(`  Git: ${ctx.gitStatus} (${ctx.uncommittedFiles.length} uncommitted, ${ctx.stagedFiles.length} staged)`);
  lines.push(`  Branch: ${ctx.currentBranch} → ${ctx.baseBranch}`);

  if (ctx.filePatterns.length > 0) {
    lines.push(`  File patterns: ${ctx.filePatterns.join(', ')}`);
  }

  if (ctx.currentFile) {
    lines.push(`  Current file: ${ctx.currentFile}`);
  }

  lines.push(`  Sessions: ${ctx.activeSessions}${ctx.eli16Mode ? ' (ELI16)' : ''}`);

  if (ctx.timeSinceLastCommit !== undefined) {
    lines.push(`  Last commit: ${ctx.timeSinceLastCommit} minutes ago`);
  }

  lines.push(`  Recent commits (1h): ${ctx.recentCommits}`);

  return lines.join('\n');
}

/**
 * Parse user response
 */
export interface UserResponse {
  action: 'accept' | 'decline' | 'stop' | 'unknown';
  skillIndex?: number;  // For multi-suggestion responses
}

export function parseUserResponse(message: string): UserResponse {
  const msg = message.trim().toLowerCase();

  // Accept responses
  if (msg.match(/^(yes|y|ok|sure|go|do it|run it)$/)) {
    return { action: 'accept' };
  }

  // Number selection (for multiple suggestions)
  const numberMatch = msg.match(/^(\d+)$/);
  if (numberMatch) {
    return { action: 'accept', skillIndex: parseInt(numberMatch[1], 10) - 1 };
  }

  // Stop suggesting
  if (msg.match(/stop suggest|no more|disable suggest|turn off|quiet/)) {
    return { action: 'stop' };
  }

  // Decline
  if (msg.match(/^(no|n|nah|nope|not now|skip|pass)$/)) {
    return { action: 'decline' };
  }

  return { action: 'unknown' };
}

/**
 * Generate explanation with dynamic context
 */
export function generateDynamicExplanation(
  match: SkillMatch,
  ctx: RouterContext
): string {
  let explanation = match.explanation;

  // Add context-specific details
  if (ctx.uncommittedFiles.length > 5) {
    explanation += ` (${ctx.uncommittedFiles.length} uncommitted files)`;
  }

  if (ctx.currentPhase === 'ship' && ctx.stagedFiles.length > 0) {
    explanation += ` (${ctx.stagedFiles.length} files staged)`;
  }

  if (ctx.eli16Mode) {
    explanation += ` (simplified mode active)`;
  }

  return explanation;
}
