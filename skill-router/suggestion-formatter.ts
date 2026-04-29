/**
 * Suggestion Formatter
 *
 * Formats skill suggestions for display to user, and generates
 * structured XML context blocks for Claude injection on skill accept.
 */

import { SkillMatch, RouterContext, SavedContext } from './types';

// ─── i18n ─────────────────────────────────────────────────────────────────────

interface LocaleStrings {
  highlyRecommended: string;
  suggested: string;
  mayApply: string;
  /** Template: '{skill}' is replaced with the skill name, e.g. 'Use @{skill}' */
  skillTemplate: string;
  triggeredBy: string;
  hint: string;
}

const LOCALES: Record<string, LocaleStrings> = {
  'en':    { highlyRecommended: 'Highly Recommended', suggested: 'Suggested',        mayApply: 'May Apply',          skillTemplate: 'Use @{skill}',        triggeredBy: 'Triggered by:', hint: 'Hint:'      },
  'zh-TW': { highlyRecommended: '強烈建議',            suggested: '建議',              mayApply: '可能適用',           skillTemplate: '使用 @{skill}',        triggeredBy: '根據：',        hint: '提示：'      },
  'zh-CN': { highlyRecommended: '强烈建议',            suggested: '建议',              mayApply: '可能适用',           skillTemplate: '使用 @{skill}',        triggeredBy: '根据：',        hint: '提示：'      },
  'ja':    { highlyRecommended: '強く推奨',            suggested: '推奨',              mayApply: '参考',               skillTemplate: '@{skill} を実行',      triggeredBy: '根拠：',        hint: 'ヒント：'    },
  'ko':    { highlyRecommended: '강력 추천',           suggested: '추천',              mayApply: '가능한 적용',         skillTemplate: '@{skill} 실행',        triggeredBy: '근거:',         hint: '힌트:'       },
  'pt-BR': { highlyRecommended: 'Altamente Recomendado', suggested: 'Sugerido',       mayApply: 'Pode Aplicar',       skillTemplate: 'Usar @{skill}',        triggeredBy: 'Acionado por:', hint: 'Dica:'      },
  'id':    { highlyRecommended: 'Sangat Disarankan',  suggested: 'Disarankan',        mayApply: 'Mungkin Berlaku',    skillTemplate: 'Gunakan @{skill}',     triggeredBy: 'Dipicu oleh:',  hint: 'Petunjuk:'  },
  'vi':    { highlyRecommended: 'Đề xuất mạnh',       suggested: 'Đề xuất',           mayApply: 'Có thể áp dụng',    skillTemplate: 'Dùng @{skill}',        triggeredBy: 'Kích hoạt bởi:', hint: 'Gợi ý:'    },
};

/**
 * All supported locale tags — single source of truth derived from LOCALES.
 * Import this instead of hardcoding the list elsewhere (e.g. context-extractor.ts).
 */
export const SUPPORTED_LOCALES: readonly string[] = Object.keys(LOCALES);

function getStrings(lang: string): LocaleStrings {
  return LOCALES[lang] ?? LOCALES['en'];
}

// ─── Element 2: Confidence Label ─────────────────────────────────────────────

/**
 * Convert numeric score to a human-readable confidence label.
 * Gives users calibrated trust instead of uniform suggestions.
 */
export function formatConfidenceLabel(score: number, lang: string = 'en'): string {
  const s = getStrings(lang);
  if (score >= 200) return s.highlyRecommended;
  if (score >= 120) return s.suggested;
  return s.mayApply;
}

// ─── Element 4: Contextual Execution Hints ───────────────────────────────────

/**
 * Generate dynamic execution hints based on current context.
 * Combines static per-skill hints with runtime-aware guidance.
 */
export function generateContextualExecutionHints(
  match: SkillMatch,
  ctx: RouterContext
): string[] {
  const hints: string[] = [...(match.executionHints || [])];

  // Dynamic hints based on git state
  if (ctx.uncommittedFiles.length > 0) {
    const preview = ctx.uncommittedFiles.slice(0, 3).join(', ');
    const more = ctx.uncommittedFiles.length > 3
      ? ` (+${ctx.uncommittedFiles.length - 3} more)`
      : '';
    hints.push(`Changed files: ${preview}${more}`);
  }

  if (ctx.stagedFiles.length > 0) {
    hints.push(`${ctx.stagedFiles.length} file(s) already staged`);
  }

  if (ctx.timeSinceLastCommit !== undefined && ctx.timeSinceLastCommit > 60) {
    hints.push(`No commit in ${ctx.timeSinceLastCommit} min — consider checkpointing`);
  }

  // Dynamic hints based on phase
  if (ctx.currentPhase === 'review' && ctx.uncommittedFiles.length > 5) {
    hints.push('Large diff — prioritise security boundaries and error handling first');
  }

  if (ctx.eli16Mode) {
    hints.push('ELI16 mode active — keep explanations concise');
  }

  return hints;
}

// ─── Element 6: Evidence Line ────────────────────────────────────────────────

/**
 * Format trigger evidence as a human-readable "why this was suggested" line.
 */
export function formatEvidence(match: SkillMatch, lang: string = 'en'): string {
  if (match.matchedTriggers.length === 0) return '';
  return `${getStrings(lang).triggeredBy} ${match.matchedTriggers.join(' • ')}`;
}

// ─── Element 5: Structured Suggestion ───────────────────────────────────────

/**
 * Format a skill suggestion for display to the user.
 * Incorporates all 6 prompt-engineering elements in the human-facing view.
 *
 * `_includeContext` kept for API compatibility with callers in index.ts;
 * evidence is now always shown (strictly better than conditional display).
 */
export function formatSuggestion(
  match: SkillMatch,
  ctx: RouterContext,
  _includeContext: boolean = false
): string {
  const lang = ctx.lang ?? 'en';
  const strings = getStrings(lang);
  const confidence = formatConfidenceLabel(match.score, lang);
  const evidence = formatEvidence(match, lang);
  const hints = generateContextualExecutionHints(match, ctx);
  const skillRef = strings.skillTemplate.replace('{skill}', match.skill);

  const lines = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `💡 [${confidence}] ${skillRef}`,
    `   ${match.explanation}`,
  ];

  if (evidence) {
    lines.push(`   ${evidence}`);
  }

  if (hints.length > 0) {
    lines.push(`   ${strings.hint} ${hints[0]}`);
    for (const hint of hints.slice(1)) {
      lines.push(`         ${hint}`);
    }
  }

  lines.push(`   (Say "yes" to run, or "stop suggesting" to disable)`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return lines.join('\n');
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

  const lang = ctx.lang ?? 'en';
  const strings = getStrings(lang);
  const topMatches = matches.slice(0, limit);
  let output = `💡 Skill Suggestions:\n\n`;

  topMatches.forEach((match, index) => {
    const confidence = formatConfidenceLabel(match.score, lang);
    output += `${index + 1}. @${match.skill} [${confidence}]\n`;
    output += `   ${match.explanation}\n`;
    if (match.matchedTriggers.length > 0) {
      output += `   ${strings.triggeredBy} ${match.matchedTriggers.join(' • ')}\n`;
    }
    output += `\n`;
  });

  output += `(Say the number to run, or "stop suggesting" to disable)`;
  return output;
}

/**
 * Format context summary for debugging.
 * Debug-only output — intentionally English. Only shown with the --debug flag
 * in test-cli.ts and never surfaced to end users, so no i18n required.
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

// ─── Element 3 + 1: XML Context Injection (Claude-facing) ───────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format the saved context snapshot + role definition as structured XML
 * for injection into Claude's additionalContext when a skill is accepted.
 *
 * Uses XML tags per Anthropic's recommendation: helps the model distinguish
 * role, context, and instruction without ambiguity.
 */
export function formatSkillInvocationContext(
  skill: string,
  savedCtx: SavedContext,
  roleContext: string | undefined,
  executionHints: string[] | undefined
): string {
  const timeSince = savedCtx.timeSinceLastCommit !== undefined
    ? `${savedCtx.timeSinceLastCommit} minutes ago`
    : 'unknown';

  const hintLines = (executionHints ?? [])
    .map(h => `    <hint>${escapeXml(h)}</hint>`)
    .join('\n');

  const rawFiles = savedCtx.uncommittedFiles.length > 0
    ? savedCtx.uncommittedFiles.slice(0, 5).join(', ')
        + (savedCtx.uncommittedFiles.length > 5
            ? ` (+${savedCtx.uncommittedFiles.length - 5} more)`
            : '')
    : 'none';
  const uncommittedList = escapeXml(rawFiles);

  const roleBlock = roleContext
    ? `\n  <role>${escapeXml(roleContext)}</role>`
    : '';

  const hintsBlock = hintLines
    ? `\n  <execution-hints>\n${hintLines}\n  </execution-hints>`
    : '';

  return [
    `<skill-invocation>`,
    `  <skill>${escapeXml(skill)}</skill>${roleBlock}`,
    `  <context>`,
    `    <branch>${escapeXml(savedCtx.branch)}</branch>`,
    `    <phase>${escapeXml(savedCtx.phase)}</phase>`,
    `    <git-status>${escapeXml(savedCtx.gitStatus)}</git-status>`,
    `    <uncommitted-files>${uncommittedList}</uncommitted-files>`,
    `    <staged-count>${savedCtx.stagedFiles.length}</staged-count>`,
    `    <recent-commits-1h>${savedCtx.recentCommits}</recent-commits-1h>`,
    `    <last-commit>${escapeXml(timeSince)}</last-commit>`,
    `  </context>${hintsBlock}`,
    `  <instruction>Invoke the @${escapeXml(skill)} skill now, using the context above to focus your execution.</instruction>`,
    `</skill-invocation>`,
  ].join('\n');
}

// ─── Parse User Response ─────────────────────────────────────────────────────

export interface UserResponse {
  action: 'accept' | 'decline' | 'stop' | 'unknown';
  skillIndex?: number;
}

export function parseUserResponse(message: string): UserResponse {
  const msg = message.trim().toLowerCase();

  if (msg.match(/^(yes|y|ok|sure|go|do it|run it)$/)) {
    return { action: 'accept' };
  }

  const numberMatch = msg.match(/^(\d+)$/);
  if (numberMatch) {
    return { action: 'accept', skillIndex: parseInt(numberMatch[1], 10) - 1 };
  }

  if (msg.match(/stop suggest|no more|disable suggest|turn off|quiet/)) {
    return { action: 'stop' };
  }

  if (msg.match(/^(no|n|nah|nope|not now|skip|pass)$/)) {
    return { action: 'decline' };
  }

  return { action: 'unknown' };
}

/**
 * Generate explanation with dynamic context (legacy helper, kept for compat)
 */
export function generateDynamicExplanation(
  match: SkillMatch,
  ctx: RouterContext
): string {
  let explanation = match.explanation;

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
