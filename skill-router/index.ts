/**
 * Skill Router - Main Entry Point
 *
 * Intelligent skill suggestion system that analyzes context
 * and recommends relevant skills proactively.
 */

export * from './types';
export * from './context-extractor';
export * from './matcher-engine';
export * from './suggestion-formatter';

import { extractContext } from './context-extractor';
import { matchSkills, getTopMatch, THRESHOLD } from './matcher-engine';
import { formatSuggestion, formatMultipleSuggestions, formatContextSummary } from './suggestion-formatter';
import { SkillMatcher, SkillMatch, RouterContext } from './types';

/**
 * Main router function
 * Analyzes message and returns top skill suggestion (if any)
 */
export function route(
  message: string,
  matchers: SkillMatcher[]
): SkillMatch | null {
  const ctx = extractContext(message);
  return getTopMatch(matchers, ctx);
}

/**
 * Get all matching skills (for debugging)
 */
export function routeAll(
  message: string,
  matchers: SkillMatcher[]
): SkillMatch[] {
  const ctx = extractContext(message);
  return matchSkills(matchers, ctx);
}

/**
 * Route with formatted output
 */
export function routeWithOutput(
  message: string,
  matchers: SkillMatcher[],
  options: {
    includeContext?: boolean;
    multiSuggestion?: boolean;
    debugContext?: boolean;
  } = {}
): string {
  const ctx = extractContext(message);
  const matches = matchSkills(matchers, ctx);

  let output = '';

  // Debug context if requested
  if (options.debugContext) {
    output += formatContextSummary(ctx) + '\n\n';
  }

  // No matches
  if (matches.length === 0) {
    return output + `No skill suggestions (threshold: ${THRESHOLD})`;
  }

  // Multiple suggestions
  if (options.multiSuggestion && matches.length > 1) {
    return output + formatMultipleSuggestions(matches, ctx, 3);
  }

  // Single suggestion
  const topMatch = matches[0];
  return output + formatSuggestion(topMatch, ctx, options.includeContext);
}

/**
 * Get router context for debugging
 */
export function getContext(message: string): RouterContext {
  return extractContext(message);
}
