/**
 * Skill Router Type Definitions
 *
 * Core types for the intelligent skill suggestion system.
 */

/**
 * Development phase detection
 */
export enum Phase {
  THINK = 'think',      // Brainstorming, requirements gathering
  PLAN = 'plan',        // Writing implementation plans
  BUILD = 'build',      // Active coding
  REVIEW = 'review',    // Code review, checking work
  TEST = 'test',        // Running tests, debugging
  SHIP = 'ship',        // Ready to merge, create PR
}

/**
 * Git repository status
 */
export type GitStatus = 'clean' | 'dirty' | 'untracked' | 'unknown';

/**
 * Context information extracted from current state
 */
export interface RouterContext {
  // User input
  message: string;              // User's message text
  messageLength: number;        // Character count

  // Git state
  gitStatus: GitStatus;
  currentBranch: string;        // From $_BRANCH
  baseBranch: string;           // From $_BASE_BRANCH
  uncommittedFiles: string[];   // git diff --name-only
  stagedFiles: string[];        // git diff --cached --name-only

  // File context
  currentFile?: string;         // If user mentioned specific file
  filePatterns: string[];       // Extract from message (*.ts, src/)

  // Session state
  activeSessions: number;       // From universal preamble
  eli16Mode: boolean;           // 3+ sessions

  // Phase detection
  currentPhase: Phase;

  // History
  lastSkillUsed?: string;       // Analytics
  recentCommits: number;        // git log --since="1 hour ago" | wc -l

  // Time context
  timeSinceLastCommit?: number; // Minutes
  workingHours: boolean;        // 9am-6pm user's timezone
}

/**
 * Trigger conditions for skill matching
 */
export interface TriggerConditions {
  // Text matching
  keywords?: string[];           // OR match (any keyword triggers)
  keywordsAll?: string[];        // AND match (all keywords required)
  regex?: string;                // Regex pattern match

  // Git conditions
  gitStatus?: GitStatus[];       // 'clean' | 'dirty' | 'untracked'
  branch?: {
    is?: string[];               // Current branch is one of these
    not?: string[];              // Current branch is NOT one of these
    matches?: string;            // Regex match
  };
  uncommittedFiles?: {
    min?: number;                // At least N uncommitted files
    max?: number;                // At most N uncommitted files
  };
  stagedFiles?: {
    min?: number;
    max?: number;
  };

  // File patterns
  filePatterns?: string[];       // Glob patterns in message or git diff

  // Phase
  phase?: Phase[];               // Match if current phase is one of these

  // Session state
  sessionCount?: {
    min?: number;                // At least N active sessions
    max?: number;                // At most N active sessions
  };
  eli16Mode?: boolean;           // Must be in ELI16 mode

  // Time conditions
  timeSinceLastCommit?: {
    min?: number;                // Minutes
    max?: number;
  };
  workingHours?: boolean;        // During work hours (9am-6pm)

  // Usage history
  lastSkillUsed?: string[];      // Last skill used was one of these
  skillNotUsedRecently?: string; // This skill not used in last N hours
}

/**
 * Skill matcher definition
 */
export interface SkillMatcher {
  skill: string;                 // Skill name (e.g., "writing-plans")
  priority: number;              // Lower = higher priority (1-10)
  triggers: TriggerConditions;
  explanation: string;           // One-line explanation
}

/**
 * Skill match result
 */
export interface SkillMatch {
  skill: string;
  score: number;                 // Match score (higher = better fit)
  priority: number;              // Priority from matcher
  explanation: string;
  matchedTriggers: string[];     // Which triggers matched
}

/**
 * Matcher registry
 */
export interface MatcherRegistry {
  matchers: SkillMatcher[];
}

/**
 * User configuration
 */
export interface SkillRouterConfig {
  enabled: boolean;
  threshold: number;                      // Minimum score to suggest (default: 80)
  maxSuggestionsPerSession: number;
  cooldownMinutes: number;                // Time between suggestions
  disabledSkills: string[];               // Skills to never suggest
  priorityBoosts: Record<string, number>; // Skill-specific score boosts
  quietHours?: {
    enabled: boolean;
    start: string;                        // "22:00"
    end: string;                          // "08:00"
  };
}

/**
 * Suggestion outcome tracking
 */
export interface SuggestionOutcome {
  timestamp: string;              // ISO timestamp
  skill: string;
  suggested: boolean;
  accepted: boolean;
  context: string;                // Brief context summary
}

/**
 * Skill analytics
 */
export interface SkillAnalytics {
  skill: string;
  usageCount: number;             // Total invocations
  suggestionCount: number;        // How many times suggested
  acceptanceRate: number;         // % of suggestions accepted
  avgTimeSaved: number;           // Minutes (user-reported)
  lastUsed: string;               // ISO timestamp
}
