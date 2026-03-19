# API Reference

TypeScript API documentation for gstack-industrial.

---

## Module: `types.ts`

Core type definitions.

### `enum Phase`

Development phases for phase detection.

```typescript
enum Phase {
  THINK = 'think',
  PLAN = 'plan',
  BUILD = 'build',
  REVIEW = 'review',
  TEST = 'test',
  SHIP = 'ship'
}
```

### `interface RouterContext`

Context information extracted for matching.

```typescript
interface RouterContext {
  message: string;              // User message (lowercased)
  phase: Phase[];               // Detected phases
  gitStatus: 'clean' | 'dirty' | null;
  uncommittedCount: number;     // Number of uncommitted files
  files: string[];              // List of changed file paths
  currentBranch: string | null;
  config: RouterConfig;         // Router configuration
  sessionState: SessionState;   // Session state for anti-spam
}
```

### `interface TriggerConditions`

Conditions that trigger a skill match.

```typescript
interface TriggerConditions {
  keywords?: string[];          // Keywords to match in message
  phase?: Phase[];              // Required phases
  gitStatus?: 'clean' | 'dirty' | null;
  filePatterns?: string[];      // Glob patterns for file paths
  uncommittedFiles?: {
    min: number;
    max: number;
  };
}
```

### `interface SkillMatcher`

Matcher definition for a skill.

```typescript
interface SkillMatcher {
  skill: string;                // Skill name (e.g., "brainstorming")
  priority: number;             // Priority (lower = higher priority)
  triggers: TriggerConditions;  // Trigger conditions
  explanation: string;          // One-line explanation
}
```

### `interface SkillMatch`

A matched skill with score.

```typescript
interface SkillMatch {
  matcher: SkillMatcher;
  score: number;                // Match score
  reasons: string[];            // Why it matched (for debugging)
}
```

### `interface RouterConfig`

Router configuration.

```typescript
interface RouterConfig {
  enabled: boolean;
  threshold: number;
  maxSuggestionsPerSession: number;
  cooldownMinutes: number;
  disabledSkills: string[];
  priorityBoosts: Record<string, number>;
  quietHours?: {
    enabled: boolean;
    start: string;              // HH:MM format
    end: string;                // HH:MM format
  };
}
```

### `interface SessionState`

Session state for anti-spam mechanisms.

```typescript
interface SessionState {
  suggestionsCount: number;
  lastSuggestions: Array<{
    skill: string;
    timestamp: number;
  }>;
  consecutiveRepeats: Record<string, number>;
}
```

---

## Module: `context-extractor.ts`

Extracts router context from environment.

### `function extractContext(message: string): RouterContext`

Main context extraction function.

**Parameters**:
- `message: string` — User message

**Returns**: `RouterContext`

**Example**:
```typescript
const ctx = extractContext("I need to review my code");
// ctx.phase: [Phase.REVIEW]
// ctx.gitStatus: 'dirty'
// ctx.uncommittedCount: 5
```

### `function detectPhase(message: string): Phase[]`

Detects development phases from message.

**Parameters**:
- `message: string` — User message (will be lowercased)

**Returns**: `Phase[]` — Array of detected phases

**Example**:
```typescript
detectPhase("I need to plan and implement auth");
// Returns: [Phase.PLAN, Phase.BUILD]
```

### `function safeGitExec(command: string): string | null`

Safely executes a git command.

**Parameters**:
- `command: string` — Git command (must be from whitelist)

**Returns**: `string | null` — Command output or null on error

**Security**: Only allows whitelisted git commands.

**Example**:
```typescript
safeGitExec('git status --porcelain');
// Returns: " M src/file.ts\n"
```

---

## Module: `matcher-engine.ts`

Scoring and ranking algorithm.

### `function calculateMatchScore(matcher: SkillMatcher, ctx: RouterContext): number`

Calculates match score for a matcher.

**Parameters**:
- `matcher: SkillMatcher` — Matcher definition
- `ctx: RouterContext` — Router context

**Returns**: `number` — Match score

**Scoring**:
- Keywords: +50 per keyword
- Phase: +100 (highest weight)
- Git status: +30
- File patterns: +40 per pattern
- Uncommitted files: +20
- Priority boost: configurable

**Example**:
```typescript
const score = calculateMatchScore(matcher, ctx);
// Returns: 180 (keyword: 50, phase: 100, git: 30)
```

### `function matchSkills(matchers: SkillMatcher[], ctx: RouterContext): SkillMatch[]`

Matches and ranks skills.

**Parameters**:
- `matchers: SkillMatcher[]` — Array of matchers
- `ctx: RouterContext` — Router context

**Returns**: `SkillMatch[]` — Sorted array of matches (highest score first)

**Example**:
```typescript
const matches = matchSkills(matchers, ctx);
// Returns: [
//   {matcher: {...}, score: 180, reasons: [...]},
//   {matcher: {...}, score: 150, reasons: [...]},
//   ...
// ]
```

---

## Module: `suggestion-formatter.ts`

Formats skill suggestions for display.

### `function formatSuggestion(match: SkillMatch, multi?: boolean): string`

Formats a skill suggestion.

**Parameters**:
- `match: SkillMatch` — Matched skill
- `multi?: boolean` — Whether to show in multi-suggestion format

**Returns**: `string` — Formatted suggestion

**Example**:
```typescript
formatSuggestion(match);
// Returns:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💡 Suggestion: Use @brainstorming
//    Brainstorm ideas with structured thinking
//    (Say "yes" to run, or "stop suggesting" to disable)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Module: `index.ts`

Main router entry point.

### `function routeSkill(message: string): SkillMatch | null`

Main routing function.

**Parameters**:
- `message: string` — User message

**Returns**: `SkillMatch | null` — Best match or null if no match

**Example**:
```typescript
const match = routeSkill("I need to review my code");
if (match) {
  console.log(formatSuggestion(match));
}
```

### `function routeSkillMulti(message: string, count?: number): SkillMatch[]`

Routes multiple skill suggestions.

**Parameters**:
- `message: string` — User message
- `count?: number` — Number of suggestions (default: 3)

**Returns**: `SkillMatch[]` — Array of top matches

**Example**:
```typescript
const matches = routeSkillMulti("I need to review my code", 3);
matches.forEach(m => console.log(formatSuggestion(m, true)));
```

---

## Module: `gen-skill-docs.ts`

Template generator.

### CLI Usage

```bash
bun run gen-skill-docs.ts [options]
```

**Options**:
- `--skill <name>` — Generate specific skill only
- `--watch` — Watch mode (auto-regenerate on changes)
- `--check` — Check sync status (don't generate)
- `--help` — Show help

**Exit Codes**:
- `0` — Success
- `1` — Generation failed or sync check failed

### `function generateSkillDocs(skillName?: string): Promise<void>`

Generates SKILL.md from templates.

**Parameters**:
- `skillName?: string` — Skill name (optional, generates all if omitted)

**Returns**: `Promise<void>`

**Example**:
```typescript
await generateSkillDocs('brainstorming');
// Generates ~/.claude/skills/brainstorming/SKILL.md
```

### `function checkSync(): Promise<boolean>`

Checks if all templates are in sync.

**Returns**: `Promise<boolean>` — True if all in sync, false otherwise

**Example**:
```typescript
const inSync = await checkSync();
if (!inSync) {
  console.error("Templates out of sync!");
  process.exit(1);
}
```

---

## Module: `test-cli.ts`

CLI test tool.

### CLI Usage

```bash
bun run test-cli.ts <message> [options]
```

**Options**:
- `--debug` — Show full context and all matches
- `--multi` — Show multiple suggestions
- `--help` — Show help

**Example**:
```bash
bun run test-cli.ts "I need to review my code" --debug
```

---

## Configuration Files

### `matchers.json`

Array of skill matchers.

**Structure**:
```json
{
  "matchers": [
    {
      "skill": "brainstorming",
      "priority": 1,
      "triggers": {
        "keywords": ["brainstorm", "idea"],
        "phase": ["think"],
        "gitStatus": null,
        "filePatterns": null,
        "uncommittedFiles": null
      },
      "explanation": "Brainstorm ideas with structured thinking"
    }
  ]
}
```

### `~/.claude/config/skill-router.json`

Router configuration.

**Structure**: See `RouterConfig` interface above.

**Default**:
```json
{
  "enabled": true,
  "threshold": 80,
  "maxSuggestionsPerSession": 10,
  "cooldownMinutes": 5,
  "disabledSkills": [],
  "priorityBoosts": {},
  "quietHours": {
    "enabled": false,
    "start": "22:00",
    "end": "08:00"
  }
}
```

---

## Hooks

### `skill-router-before-message.ts`

Before-message hook for automatic suggestions.

**Location**: `~/.claude/hooks/skill-router-before-message.ts`

**Execution**: Runs before Claude processes user message

**Performance**: < 10ms (non-blocking)

**User Responses**:
- `yes` — Accept suggestion
- `no` / `not now` — Decline suggestion
- `stop suggesting` — Disable for session

---

## Error Handling

### Common Errors

**`ENOENT: no such file or directory`**

Cause: Missing configuration or matcher file

Solution: Run `bun install` to reinstall files

**`SyntaxError: Unexpected token in JSON`**

Cause: Invalid JSON in matchers.json or config

Solution: Validate JSON syntax with `jq`

**`Template not found`**

Cause: Missing SKILL.md.tmpl file

Solution: Create template file with `.tmpl` extension

---

## Performance

### Benchmarks

| Operation | Time |
|-----------|------|
| Context extraction | ~2ms |
| Matcher scoring (20 matchers) | ~3ms |
| Session state check | ~1ms |
| **Total** | **< 10ms** |

### Memory Usage

| Component | Memory |
|-----------|--------|
| Matchers (20) | ~500KB |
| Context | ~100KB |
| Session state | ~50KB |
| **Total** | **~5MB** |

---

## TypeScript Usage

### Import Modules

```typescript
import { Phase, RouterContext, SkillMatcher } from './types';
import { extractContext } from './context-extractor';
import { matchSkills, calculateMatchScore } from './matcher-engine';
import { formatSuggestion } from './suggestion-formatter';
import { routeSkill, routeSkillMulti } from './index';
```

### Example: Custom Routing

```typescript
import { extractContext } from './context-extractor';
import { matchSkills } from './matcher-engine';
import { formatSuggestion } from './suggestion-formatter';
import matchers from './matchers.json';

// Extract context
const ctx = extractContext("I need to review my code");

// Match skills
const matches = matchSkills(matchers.matchers, ctx);

// Filter by threshold
const topMatches = matches.filter(m => m.score >= 80);

// Display top match
if (topMatches.length > 0) {
  console.log(formatSuggestion(topMatches[0]));
}
```

### Example: Custom Matcher

```typescript
import { SkillMatcher, Phase } from './types';

const customMatcher: SkillMatcher = {
  skill: 'my-custom-skill',
  priority: 15,
  triggers: {
    keywords: ['custom', 'special'],
    phase: [Phase.BUILD],
    gitStatus: 'dirty',
    filePatterns: ['src/**/*.ts'],
    uncommittedFiles: { min: 1, max: 10 }
  },
  explanation: 'My custom skill for special cases'
};

// Add to matchers array
matchers.matchers.push(customMatcher);
```

---

## See Also

- [Template System Guide](TEMPLATE_SYSTEM.md)
- [Skill Router Guide](SKILL_ROUTER.md)
- [Creating Matchers](CREATING_MATCHERS.md)
