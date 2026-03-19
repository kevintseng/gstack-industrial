/**
 * Context Extractor
 *
 * Extracts RouterContext from current environment state.
 *
 * SECURITY NOTE: Uses execSync for git commands.
 * All commands are STATIC (no user input interpolation), making them safe from injection.
 * No user-provided data is passed to any shell command.
 */

import { execSync } from 'child_process';
import { RouterContext, Phase, GitStatus } from './types';

/**
 * Execute safe git command (no user input)
 * @security All commands must be static strings with no interpolation
 */
function safeGitExec(command: string): string {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Extract file patterns from user message
 */
function extractFilePatterns(message: string): string[] {
  const patterns: string[] = [];

  // Match glob patterns: *.ts, **/*.tsx, src/**
  const globRegex = /(?:\*\*\/)?(?:[\w-]+\/)*(?:[\w-]+|\*+)\.[\w]+/g;
  const globMatches = message.match(globRegex) || [];
  patterns.push(...globMatches);

  // Match directory references: src/, tests/
  const dirRegex = /\b([\w-]+\/)+/g;
  const dirMatches = message.match(dirRegex) || [];
  patterns.push(...dirMatches);

  // Match specific extensions mentioned
  if (message.match(/\.tsx?|typescript/i)) patterns.push('**/*.ts', '**/*.tsx');
  if (message.match(/\.jsx?|javascript/i)) patterns.push('**/*.js', '**/*.jsx');
  if (message.match(/test|spec/i)) patterns.push('**/*.test.*', '**/*.spec.*');

  return [...new Set(patterns)]; // Deduplicate
}

/**
 * Detect current development phase
 */
function detectPhase(ctx: Partial<RouterContext>): Phase {
  const msg = ctx.message?.toLowerCase() || '';

  // Explicit phase keywords
  if (msg.match(/brainstorm|idea|worth building|should i|is it feasible/)) {
    return Phase.THINK;
  }

  if (msg.match(/write.*plan|plan.*implement|how.*approach|break.*down/)) {
    return Phase.PLAN;
  }

  if (msg.match(/implement|build|add.*feature|create.*function/)) {
    return Phase.BUILD;
  }

  if (msg.match(/review|check.*code|audit|verify.*implement/)) {
    return Phase.REVIEW;
  }

  if (msg.match(/test|debug|failing|error|fix.*bug/)) {
    return Phase.TEST;
  }

  if (msg.match(/ready|ship|merge|create.*pr|deploy/)) {
    return Phase.SHIP;
  }

  // Infer from git status
  if (ctx.gitStatus === 'clean') {
    return (ctx.recentCommits ?? 0) > 0 ? Phase.SHIP : Phase.THINK;
  }

  if (ctx.gitStatus === 'dirty' && (ctx.uncommittedFiles?.length ?? 0) > 5) {
    return Phase.REVIEW; // Many changes, should review
  }

  if (ctx.gitStatus === 'dirty' && (ctx.stagedFiles?.length ?? 0) > 0) {
    return Phase.SHIP; // Staged, ready to commit
  }

  // Default fallback
  return Phase.BUILD;
}

/**
 * Get git status
 * @security Static command, no user input
 */
function getGitStatus(): GitStatus {
  const status = safeGitExec('git status --porcelain 2>/dev/null');
  if (status === '') return 'clean';
  if (status.match(/^\?\?/m)) return 'untracked';
  if (status) return 'dirty';
  return 'unknown';
}

/**
 * Get current branch
 * @security Static command, no user input
 */
function getCurrentBranch(): string {
  const branch = safeGitExec('git branch --show-current 2>/dev/null');
  return branch || 'unknown';
}

/**
 * Get base branch (main/master/develop)
 * @security Static command, no user input
 */
function getBaseBranch(): string {
  const branches = safeGitExec('git branch -a 2>/dev/null');

  if (branches.includes('main')) return 'main';
  if (branches.includes('master')) return 'master';
  if (branches.includes('develop')) return 'develop';

  return 'main'; // Default fallback
}

/**
 * Get uncommitted files
 * @security Static command, no user input
 */
function getUncommittedFiles(): string[] {
  const files = safeGitExec('git diff --name-only 2>/dev/null');
  return files ? files.split('\n').filter(f => f) : [];
}

/**
 * Get staged files
 * @security Static command, no user input
 */
function getStagedFiles(): string[] {
  const files = safeGitExec('git diff --cached --name-only 2>/dev/null');
  return files ? files.split('\n').filter(f => f) : [];
}

/**
 * Get recent commits count
 * @security Static command, no user input
 */
function getRecentCommits(): number {
  const log = safeGitExec('git log --since="1 hour ago" --oneline 2>/dev/null');
  return log ? log.split('\n').filter(l => l).length : 0;
}

/**
 * Get time since last commit (minutes)
 * @security Static command, no user input
 */
function getTimeSinceLastCommit(): number | undefined {
  const lastCommitTime = safeGitExec('git log -1 --format=%ct 2>/dev/null');
  if (!lastCommitTime) return undefined;

  const now = Math.floor(Date.now() / 1000);
  const diff = now - parseInt(lastCommitTime, 10);
  return Math.floor(diff / 60); // Convert to minutes
}

/**
 * Check if current time is working hours (9am-6pm)
 */
function isWorkingHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 18;
}

/**
 * Get active session count from universal preamble
 * @security Static command with safe path, no user input
 */
function getActiveSessions(): number {
  const sessions = safeGitExec('find ~/.claude/sessions -mmin -120 -type f 2>/dev/null');
  return sessions ? sessions.split('\n').filter(s => s).length : 1;
}

/**
 * Extract current file mention from message
 */
function extractCurrentFile(message: string): string | undefined {
  // Match file paths: src/foo.ts, ./bar.js, /absolute/path.tsx
  const fileRegex = /(?:\.\/|\/)?(?:[\w-]+\/)*[\w-]+\.[\w]+/g;
  const matches = message.match(fileRegex);

  // Return first match that looks like a real file
  return matches?.find(m => m.includes('/')) || matches?.[0];
}

/**
 * Build RouterContext from current state
 */
export function extractContext(message: string): RouterContext {
  const gitStatus = getGitStatus();
  const currentBranch = getCurrentBranch();
  const baseBranch = getBaseBranch();
  const uncommittedFiles = getUncommittedFiles();
  const stagedFiles = getStagedFiles();
  const recentCommits = getRecentCommits();
  const activeSessions = getActiveSessions();

  const partialContext: Partial<RouterContext> = {
    message,
    messageLength: message.length,
    gitStatus,
    currentBranch,
    baseBranch,
    uncommittedFiles,
    stagedFiles,
    recentCommits,
    activeSessions,
  };

  const currentPhase = detectPhase(partialContext);
  const filePatterns = extractFilePatterns(message);
  const currentFile = extractCurrentFile(message);
  const timeSinceLastCommit = getTimeSinceLastCommit();
  const workingHours = isWorkingHours();
  const eli16Mode = activeSessions >= 3;

  return {
    message,
    messageLength: message.length,
    gitStatus,
    currentBranch,
    baseBranch,
    uncommittedFiles,
    stagedFiles,
    currentFile,
    filePatterns,
    activeSessions,
    eli16Mode,
    currentPhase,
    recentCommits,
    timeSinceLastCommit,
    workingHours,
  };
}
