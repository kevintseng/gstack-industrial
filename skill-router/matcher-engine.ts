/**
 * Matcher Engine
 *
 * Scores and ranks skills based on context matching.
 */

import { RouterContext, SkillMatcher, SkillMatch, TriggerConditions } from './types';

/**
 * Match score threshold (minimum to suggest)
 */
export const THRESHOLD = 80;

/**
 * Calculate match score for a single matcher
 */
export function calculateMatchScore(
  matcher: SkillMatcher,
  ctx: RouterContext
): number {
  let score = 0;
  const triggers = matcher.triggers;

  // Keyword matching (50 points per match)
  if (triggers.keywords) {
    const keywordMatches = triggers.keywords.filter((kw) =>
      ctx.message.toLowerCase().includes(kw.toLowerCase())
    );
    score += keywordMatches.length * 50;
  }

  // Keywords ALL (all must match) - 100 points if all present
  if (triggers.keywordsAll) {
    const allMatch = triggers.keywordsAll.every((kw) =>
      ctx.message.toLowerCase().includes(kw.toLowerCase())
    );
    if (allMatch) score += 100;
  }

  // Regex matching (75 points if matches)
  if (triggers.regex) {
    const regex = new RegExp(triggers.regex, 'i');
    if (regex.test(ctx.message)) {
      score += 75;
    }
  }

  // Phase matching (100 points if exact match)
  if (triggers.phase?.includes(ctx.currentPhase)) {
    score += 100;
  }

  // Git status matching (30 points)
  if (triggers.gitStatus?.includes(ctx.gitStatus)) {
    score += 30;
  }

  // File pattern matching (40 points per pattern)
  if (triggers.filePatterns && ctx.filePatterns.length > 0) {
    const patternMatches = triggers.filePatterns.filter((pattern) =>
      ctx.filePatterns.some((fp) => matchGlob(fp, pattern))
    );
    score += patternMatches.length * 40;
  }

  // Uncommitted files count (20 points if in range)
  if (triggers.uncommittedFiles) {
    const { min, max } = triggers.uncommittedFiles;
    const count = ctx.uncommittedFiles.length;
    if ((min === undefined || count >= min) && (max === undefined || count <= max)) {
      score += 20;
    }
  }

  // Staged files count (15 points if in range)
  if (triggers.stagedFiles) {
    const { min, max } = triggers.stagedFiles;
    const count = ctx.stagedFiles.length;
    if ((min === undefined || count >= min) && (max === undefined || count <= max)) {
      score += 15;
    }
  }

  // Branch conditions (30 points)
  if (triggers.branch) {
    if (triggers.branch.is?.includes(ctx.currentBranch)) {
      score += 30;
    }
    if (triggers.branch.not && !triggers.branch.not.includes(ctx.currentBranch)) {
      score += 30;
    }
    if (triggers.branch.matches) {
      const regex = new RegExp(triggers.branch.matches);
      if (regex.test(ctx.currentBranch)) {
        score += 30;
      }
    }
  }

  // Session count (10 points if in range)
  if (triggers.sessionCount) {
    const { min, max } = triggers.sessionCount;
    const count = ctx.activeSessions;
    if ((min === undefined || count >= min) && (max === undefined || count <= max)) {
      score += 10;
    }
  }

  // ELI16 mode (10 points if matches)
  if (triggers.eli16Mode !== undefined && triggers.eli16Mode === ctx.eli16Mode) {
    score += 10;
  }

  // Time since last commit (10 points)
  if (triggers.timeSinceLastCommit && ctx.timeSinceLastCommit !== undefined) {
    const { min, max } = triggers.timeSinceLastCommit;
    const time = ctx.timeSinceLastCommit;
    if ((min === undefined || time >= min) && (max === undefined || time <= max)) {
      score += 10;
    }
  }

  // Working hours (5 points)
  if (triggers.workingHours !== undefined && triggers.workingHours === ctx.workingHours) {
    score += 5;
  }

  // Last skill used (20 points if matches)
  if (triggers.lastSkillUsed && ctx.lastSkillUsed) {
    if (triggers.lastSkillUsed.includes(ctx.lastSkillUsed)) {
      score += 20;
    }
  }

  return score;
}

/**
 * Simple glob matching (supports * and **)
 */
function matchGlob(text: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '.*')  // ** matches anything
    .replace(/\*/g, '[^/]*')  // * matches anything except /
    .replace(/\./g, '\\.');   // Escape dots

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(text);
}

/**
 * Get list of matched triggers for debugging
 */
function getMatchedTriggers(
  matcher: SkillMatcher,
  ctx: RouterContext
): string[] {
  const matched: string[] = [];
  const triggers = matcher.triggers;

  if (triggers.keywords) {
    const keywordMatches = triggers.keywords.filter((kw) =>
      ctx.message.toLowerCase().includes(kw.toLowerCase())
    );
    if (keywordMatches.length > 0) {
      matched.push(`keywords: ${keywordMatches.join(', ')}`);
    }
  }

  if (triggers.phase?.includes(ctx.currentPhase)) {
    matched.push(`phase: ${ctx.currentPhase}`);
  }

  if (triggers.gitStatus?.includes(ctx.gitStatus)) {
    matched.push(`git: ${ctx.gitStatus}`);
  }

  if (triggers.filePatterns && ctx.filePatterns.length > 0) {
    matched.push(`files: ${ctx.filePatterns.length} patterns`);
  }

  if (triggers.uncommittedFiles) {
    matched.push(`uncommitted: ${ctx.uncommittedFiles.length}`);
  }

  if (triggers.branch) {
    matched.push(`branch: ${ctx.currentBranch}`);
  }

  return matched;
}

/**
 * Match skills against context
 */
export function matchSkills(
  matchers: SkillMatcher[],
  ctx: RouterContext
): SkillMatch[] {
  const matches: SkillMatch[] = [];

  for (const matcher of matchers) {
    const score = calculateMatchScore(matcher, ctx);

    if (score >= THRESHOLD) {
      matches.push({
        skill: matcher.skill,
        score: score,
        priority: matcher.priority,
        explanation: matcher.explanation,
        matchedTriggers: getMatchedTriggers(matcher, ctx),
      });
    }
  }

  // Sort by score (descending), then priority (ascending)
  return matches.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.priority - b.priority;
  });
}

/**
 * Get top match (if any)
 */
export function getTopMatch(
  matchers: SkillMatcher[],
  ctx: RouterContext
): SkillMatch | null {
  const matches = matchSkills(matchers, ctx);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Boost score based on usage analytics
 */
export function boostByUsageFrequency(
  match: SkillMatch,
  usageCount: number,
  acceptanceRate: number
): SkillMatch {
  // Boost score for frequently used skills
  const usageBoost = Math.log10(usageCount + 1) * 10;

  // Boost score for high acceptance rate
  const acceptanceBoost = acceptanceRate * 20;

  return {
    ...match,
    score: match.score + usageBoost + acceptanceBoost,
  };
}
