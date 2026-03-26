# Skill Router

**Intelligent skill suggestion system for Claude Code**

Analyzes context (message, git status, files, session state) and proactively suggests relevant skills.

---

## Features

✅ **Context-Aware** — Analyzes message, git status, files, and phase to find best match
✅ **Non-Intrusive** — High threshold (80 points), cooldown (5 min), max suggestions per session
✅ **Configurable** — User config for threshold, disabled skills, priority boosts, quiet hours
✅ **Fast** — <10ms routing time, non-blocking
✅ **Analytics-Ready** — Tracks suggestions, acceptance rate, usage patterns

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│   Claude Code Message Processing Pipeline      │
└────────────┬────────────────────────────────────┘
             │
             │ Before processing message
             ▼
┌─────────────────────────────────────────────────┐
│    skill-router-before-message.ts (Hook)        │
│  1. Load config & session state                 │
│  2. Extract context (git, files, phase)         │
│  3. Run matcher engine                          │
│  4. Output suggestion if score > threshold      │
└────────────┬────────────────────────────────────┘
             │
             │ If match found
             ▼
┌─────────────────────────────────────────────────┐
│             User Sees Suggestion                │
│  💡 Suggestion: Use @skill-name for this task  │
│  [explanation]                                   │
│  (Say "yes" to run, or "stop suggesting")       │
└─────────────────────────────────────────────────┘
```

---

## Components

### Core Engine

Located in `~/.claude/skills/templates/skill-router/`:

| File | Purpose |
|------|---------|
| `types.ts` | Type definitions (Phase, RouterContext, SkillMatcher, etc.) |
| `context-extractor.ts` | Extracts context from environment (git, files, message) |
| `matcher-engine.ts` | Scoring algorithm, threshold filtering, ranking |
| `suggestion-formatter.ts` | Formats suggestions for display |
| `index.ts` | Main router entry point |
| `matchers.json` | Skill matcher registry (manual + auto-discovered) |
| `auto-discover.ts` | Scans SKILL.md files and updates matchers.json |
| `test-cli.ts` | CLI test tool for debugging |

### Hook Integration

- **UserPromptSubmit**: `~/.claude/hooks/skill-router-before-message.ts`
  - Trigger: Before every user message
  - Action: Route message -> suggest skill if match found
  - State: Tracks suggestions, cooldown, user preferences
- **SessionStart**: `~/.claude/hooks/skill-discovery-session-start.sh`
  - Trigger: On session start (with 1-hour cooldown)
  - Action: Auto-discover new skills and update matchers.json

---

## Installation & Setup

### 1. Enable the Hook

The hook is already created at `~/.claude/hooks/skill-router-before-message.ts`.

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run ~/.claude/hooks/skill-router-before-message.ts"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/skill-discovery-session-start.sh"
          }
        ]
      }
    ]
  }
}
```

### 2. Configuration (Optional)

Create `~/.claude/config/skill-router.json`:

```json
{
  "enabled": true,
  "threshold": 80,
  "maxSuggestionsPerSession": 10,
  "cooldownMinutes": 5,
  "disabledSkills": [],
  "priorityBoosts": {
    "sa:comprehensive-code-review": 50,
    "writing-plans": 30
  },
  "quietHours": {
    "enabled": false,
    "start": "22:00",
    "end": "08:00"
  }
}
```

**Config Options:**

- `enabled` — Enable/disable router globally
- `threshold` — Minimum score to suggest (default: 80)
- `maxSuggestionsPerSession` — Limit suggestions per session (default: 10)
- `cooldownMinutes` — Time between suggestions (default: 5)
- `disabledSkills` — Skills to never suggest
- `priorityBoosts` — Boost specific skills' scores
- `quietHours` — Disable suggestions during specific hours

---

## Usage

### Automatic Suggestions

The router runs automatically on every message. If a match is found:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Suggestion: Use @brainstorming for this task
   Brainstorm ideas with structured thinking
   (Say "yes" to run, or "stop suggesting" to disable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### User Responses

- **"yes"** — Accept suggestion (skill will be invoked)
- **"no"** / **"not now"** — Decline suggestion
- **"stop suggesting"** — Disable suggestions for this session

### Manual Testing

Test the router without Claude Code:

```bash
# Test with a message
cd ~/.claude/skills/templates/skill-router
bun run test-cli.ts "I need to brainstorm this feature"

# Debug mode (show context + all matches)
bun run test-cli.ts "The test is failing" --debug

# Show multiple suggestions
bun run test-cli.ts "Ready to merge" --multi

# Show only context (no routing)
bun run test-cli.ts "Fix bug" --context
```

---

## How It Works

### 1. Context Extraction

From user message and environment:

```typescript
{
  message: "I need to review my code",
  phase: "review",           // Detected from keywords
  gitStatus: "dirty",         // git status --porcelain
  uncommittedFiles: ["src/foo.ts", "src/bar.ts"],
  currentBranch: "feature/auth",
  activeSessions: 1,
  ...
}
```

### 2. Phase Detection

Keywords → Phase mapping:

- **THINK**: "brainstorm", "idea", "should i"
- **PLAN**: "plan", "approach", "architecture"
- **BUILD**: "implement", "add feature", "create"
- **REVIEW**: "review", "check code", "audit"
- **TEST**: "test", "debug", "failing", "error"
- **SHIP**: "ready", "merge", "create pr", "deploy"

### 3. Matcher Scoring

Each matcher has triggers:

```json
{
  "skill": "sa:comprehensive-code-review",
  "priority": 4,
  "triggers": {
    "keywords": ["review", "check code"],
    "phase": ["review"],
    "gitStatus": ["dirty"],
    "uncommittedFiles": { "min": 3 }
  }
}
```

**Scoring:**
- Keyword match: +50 points per keyword
- Phase match: +100 points
- Git status match: +30 points
- File pattern match: +40 points per pattern
- Uncommitted files in range: +20 points
- Branch condition: +30 points

**Threshold**: 80 points minimum

### 4. Ranking

Sort by:
1. **Score** (descending) — higher = better fit
2. **Priority** (ascending) — lower = more important
3. **Usage frequency** (from analytics)

### 5. Anti-Spam

- Max 1 suggestion per message
- Cooldown: 5 minutes between suggestions
- No repeat: Skip if same skill suggested 3 times in row
- User control: "stop suggesting" disables for session

---

## Matchers Registry

20 manual skills configured in `matchers.json` (plus auto-discovered skills):

| Priority | Skill | Phase | Triggers |
|----------|-------|-------|----------|
| 1 | brainstorming | THINK | "brainstorm", "idea", "should i" |
| 2 | writing-plans | PLAN | "plan", "approach", clean git |
| 3 | executing-plans | BUILD | "execute", plan files exist |
| 4 | sa:comprehensive-code-review | REVIEW | "review", dirty git, 3+ files |
| 5 | systematic-debugging | TEST | "debug", "error", test files |
| 6 | find-bugs | REVIEW | "find bugs", "security" |
| 7 | verification-before-completion | SHIP | "done", "ready" |
| 8 | finishing-a-development-branch | SHIP | "merge", feature branch |
| 9 | commit | SHIP | "commit", dirty git |
| 10 | create-pr | SHIP | "create pr", clean git |
| ... | ... | ... | ... |

See `matchers.json` for complete list.

---

## Examples

### Example 1: Brainstorming

**Message**: "Should I build this feature?"

**Context**:
- Phase: THINK (keyword "should i")
- Git: clean

**Match**: `brainstorming` (score: 150)
- Keyword "should i": +50
- Phase THINK: +100

**Suggestion**:
```
💡 Suggestion: Use @brainstorming for this task
Brainstorm ideas with structured thinking
```

### Example 2: Code Review

**Message**: "I need to review my code changes before committing"

**Context**:
- Phase: REVIEW (keyword "review")
- Git: dirty
- Uncommitted files: 8

**Match**: `sa:comprehensive-code-review` (score: 180)
- Keyword "review": +50
- Phase REVIEW: +100
- Git dirty: +30

**Suggestion**:
```
💡 Suggestion: Use @sa:comprehensive-code-review for this task
Run comprehensive code review with Reality Check
```

### Example 3: Debugging

**Message**: "The test is failing with TypeError"

**Context**:
- Phase: TEST (keyword "failing")
- File patterns: test files detected

**Match**: `systematic-debugging` (score: 190)
- Keyword "failing": +50
- Phase TEST: +100
- File pattern test file: +40

**Suggestion**:
```
💡 Suggestion: Use @systematic-debugging for this task
Systematic root cause analysis for bugs
```

---

## Adding New Matchers

Edit `~/.claude/skills/templates/skill-router/matchers.json`:

```json
{
  "skill": "your-skill-name",
  "priority": 21,
  "triggers": {
    "keywords": ["keyword1", "keyword2"],
    "phase": ["build", "review"],
    "gitStatus": ["dirty"],
    "filePatterns": ["**/*.ts"],
    "uncommittedFiles": { "min": 1, "max": 10 },
    "branch": { "not": ["main", "master"] }
  },
  "explanation": "One-line explanation of what this skill does"
}
```

**Test the new matcher:**
```bash
bun run test-cli.ts "message with your keywords" --debug
```

---

## Troubleshooting

### No Suggestions Appearing

1. **Check if router is enabled**:
   ```bash
   cat ~/.claude/config/skill-router.json
   # Ensure "enabled": true
   ```

2. **Check cooldown**:
   ```bash
   cat ~/.claude/sessions/skill-router-state.json
   # Check lastSuggestionTime
   ```

3. **Test manually**:
   ```bash
   cd ~/.claude/skills/templates/skill-router
   bun run test-cli.ts "your message" --debug
   ```

4. **Check threshold**:
   - Default: 80 points
   - Lower threshold in config for more suggestions

### Wrong Suggestions

1. **Check matched triggers**:
   ```bash
   bun run test-cli.ts "your message" --debug
   # See "Matched:" field
   ```

2. **Adjust matcher triggers** in `matchers.json`

3. **Boost/penalize specific skills** in config:
   ```json
   {
     "priorityBoosts": {
       "skill-to-boost": 50,
       "skill-to-penalize": -50
     }
   }
   ```

### Disable Temporarily

**For current session**:
- Say "stop suggesting" when prompted

**Globally**:
```bash
# Edit config
echo '{"enabled": false}' > ~/.claude/config/skill-router.json
```

---

## Development

### Run Tests

```bash
cd ~/.claude/skills/templates/skill-router

# Test routing
bun run test-cli.ts "test message" --debug

# Test context extraction
bun run test-cli.ts "test message" --context
```

### Debug Hook

```bash
# Run hook directly
cd ~/.claude/hooks
bun run skill-router-before-message.ts "test message"
```

### Modify Matchers

Edit `matchers.json`, then test:
```bash
bun run test-cli.ts "relevant message" --debug
```

---

## Performance

- **Context extraction**: ~2ms
- **Matcher scoring**: ~3ms (20 matchers)
- **Total routing time**: **<10ms**
- **Memory**: ~5MB
- **Non-blocking**: Runs before message processing, no latency impact

---

## Analytics (Future)

Track in `~/.claude/analytics/skill-router.jsonl`:

```jsonl
{"ts":"2026-03-19T10:00:00Z","skill":"brainstorming","suggested":true,"accepted":true}
{"ts":"2026-03-19T10:05:00Z","skill":"writing-plans","suggested":true,"accepted":false}
```

**Metrics**:
- Suggestion acceptance rate
- Most suggested skills
- Phase detection accuracy
- User feedback

---

## Related

- **Design Doc**: `~/Documents/Obsidian-Vault/Projects/Claude-Code-Enhancement/Phase2-Design/phase2-skill-router-design.md`
- **Template System**: `~/.claude/skills/templates/README.md`
- **Universal Preamble**: `~/.claude/skills/templates/universal-preamble.sh`
- **gstack Integration**: Phase 2 of Claude Code enhancement

---

**Status**: ✅ Core engine complete (Week 3 Day 1-4)
**Next**: Matcher refinement based on user feedback (Week 4)
