# Installation Guide

## Quick Install (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/kevintseng/gstack-industrial.git
cd gstack-industrial

# 2. Run installer
bun run install
# Automatically installs to ~/.claude/
```

The installer handles everything:
- Copies skill-router, hooks, and standard sections
- Registers `UserPromptSubmit` hook (auto-suggest on every message)
- Registers `SessionStart` hook (auto-discover new skills on session start)
- Runs initial auto-discovery to populate `matchers.json`
- Creates default config at `~/.claude/config/skill-router.json`

Installation is idempotent — safe to run multiple times.

---

## Manual Installation

### Prerequisites

- [gstack](https://github.com/garrytan/gstack) installed (required — gstack-industrial is a layer on top)
- [Bun](https://bun.sh) >= 1.0.0
- Claude Code installed

### Step 1: Install Files

```bash
# Create directories
mkdir -p ~/.claude/skills/templates/skill-router
mkdir -p ~/.claude/hooks
mkdir -p ~/.claude/config

# Copy skill-router
cp -r skill-router/* ~/.claude/skills/templates/skill-router/

# Copy standard sections
cp standard-sections/*.md ~/.claude/skills/templates/

# Copy hooks
cp hooks/skill-router-before-message.ts ~/.claude/hooks/
cp hooks/skill-discovery-session-start.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/skill-router-before-message.ts
chmod +x ~/.claude/hooks/skill-discovery-session-start.sh
```

### Step 2: Configure

Create `~/.claude/config/skill-router.json`:

```json
{
  "enabled": true,
  "threshold": 80,
  "maxSuggestionsPerSession": 500,
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

### Step 3: Register Hooks

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

### Step 4: Run Auto-Discovery

```bash
cd ~/.claude/skills/templates/skill-router
bun run auto-discover.ts
```

---

## Update

```bash
# Pull latest changes
git pull

# Re-run installer (idempotent — safe to run multiple times)
bun run install
```

The installer handles updates automatically:
- **Files**: Overwrites all installed skill-router and hook files with the latest versions
- **Config**: Adds any new config fields while preserving your existing settings (merge, not overwrite)
- **Hooks**: Skips hook registration if hooks already exist (no duplicates created)

No manual migration required. After `bun run install`, Claude Code picks up changes on the next session.

---

## Verification

### Test Skill Router

```bash
cd ~/.claude/skills/templates/skill-router

# Test with different messages
bun run test-cli.ts "I need to brainstorm this feature"
bun run test-cli.ts "The test is failing" --debug
bun run test-cli.ts "Ready to merge" --multi
```

### Test Auto-Discovery

```bash
cd /path/to/gstack-industrial

# Preview what would be discovered (no write)
bun run discover:dry

# Actually scan and update
bun run discover
```

### Test Hook Integration

```bash
cd ~/.claude/hooks
bun run skill-router-before-message.ts "I need to review my code"
```

---

## Configuration Reference

### `~/.claude/config/skill-router.json`

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable all suggestions |
| `threshold` | number | `80` | Minimum match score to trigger suggestion |
| `maxSuggestionsPerSession` | number | `500` | Safety cap against runaway loops (cooldown is the real throttle) |
| `cooldownMinutes` | number | `5` | Cooldown between suggestions |
| `disabledSkills` | string[] | `[]` | Skills to never suggest |
| `priorityBoosts` | object | `{}` | Skill name → priority boost (number) |
| `feedbackBoost` | number | `20` | Score boost for skills you often accept |
| `feedbackPenalty` | number | `30` | Score penalty for skills you often dismiss |
| `showLimitWarnings` | boolean | `true` | Show visible warning when session suggestion cap is hit |
| `repoModeThresholds` | object | `{solo:60, collaborative:85, unknown:80}` | Threshold per repo mode (reads gstack-repo-mode) |
| `lang` | string | _(auto)_ | Force UI language. Auto-detected from system locale if unset. Values: `en`, `zh-TW`, `zh-CN`, `ja`, `ko`, `pt-BR`, `id`, `vi` |
| `quietHours.enabled` | boolean | `false` | Enable quiet hours |
| `quietHours.start` | string | `"22:00"` | Quiet hours start (HH:MM) |
| `quietHours.end` | string | `"08:00"` | Quiet hours end (HH:MM) |

---

## Troubleshooting

### "bun: command not found"

Install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
```

### "No such file or directory"

Make sure you're in the correct directory:
```bash
pwd  # Should be in gstack-industrial/
ls   # Should see skill-router/, hooks/, etc.
```

### "Permission denied"

Make hooks executable:
```bash
chmod +x ~/.claude/hooks/skill-router-before-message.ts
chmod +x ~/.claude/hooks/skill-discovery-session-start.sh
```

### Auto-discovery finds 0 skills

Ensure you have SKILL.md files with valid frontmatter under `~/.claude/skills/`:
```yaml
---
name: my-skill
description: What this skill does
---
```

**Optional frontmatter fields** for richer routing (v1.3.0+):
```yaml
---
name: my-skill
description: What this skill does
triggers:
  - keyword one
  - keyword two
preamble-tier: 1
---
```
`triggers:` — explicit routing keywords (preferred over heuristic extraction from description).
`preamble-tier: 1` — marks skill as core/fundamental; gets +1 priority boost in suggestions.

### Hook not firing

Check that the hook is registered in `~/.claude/settings.json` under the correct event type (`UserPromptSubmit` or `SessionStart`).

---

## Uninstall

```bash
# Remove installed files
rm -rf ~/.claude/skills/templates/skill-router
rm ~/.claude/skills/templates/*-section.md
rm ~/.claude/hooks/skill-router-before-message.ts
rm ~/.claude/hooks/skill-discovery-session-start.sh
rm ~/.claude/config/skill-router.json
rm ~/.claude/sessions/skill-router-state.json
rm ~/.claude/state/skill-discovery-last-run

# Manually edit ~/.claude/settings.json to remove the hooks:
# - Remove the UserPromptSubmit entry containing "skill-router-before-message"
# - Remove the SessionStart entry containing "skill-discovery-session-start"
```

---

## Support

- **Issues**: [GitHub Issues](https://github.com/kevintseng/gstack-industrial/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kevintseng/gstack-industrial/discussions)
