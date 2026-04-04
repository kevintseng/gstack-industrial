<div align="center">

# gstack-industrial

**Auto-suggest the right Claude Code skill for your task**

*Enhancement layer on top of [gstack](https://github.com/garrytan/gstack) — not a replacement.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/v/release/kevintseng/gstack-industrial?style=for-the-badge&color=blue)](https://github.com/kevintseng/gstack-industrial/releases)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-D97757?style=for-the-badge)](https://claude.ai/code)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?style=for-the-badge&logo=bun)](https://bun.sh)

[![Stars](https://img.shields.io/github/stars/kevintseng/gstack-industrial?style=social)](https://github.com/kevintseng/gstack-industrial/stargazers)
[![Issues](https://img.shields.io/github/issues/kevintseng/gstack-industrial)](https://github.com/kevintseng/gstack-industrial/issues)

[**English**](README.md) | [**繁體中文**](README.zh-TW.md) | [**日本語**](README.ja.md)

</div>

---

---

## What is this?

You have hundreds of Claude Code skills installed but can never remember which one to use?

**gstack-industrial** solves this:

- **Auto-Discovery** — Scans all installed SKILL.md files and builds routing rules automatically
- **Auto-Suggest** — Recommends the best skill based on your message and project state
- **Usage feedback** — Learns from what you accept vs dismiss, boosts/penalizes priority
- **Pair learning** — Reads gstack's timeline, predicts next skill after you accept one
- **Repo-mode aware** — Lower threshold for solo devs, higher for collaborative (via gstack)
- **Zero Interruption** — Only suggests when truly helpful, won't spam you

All state is **local-only**. No telemetry. No network calls.

---

## Relationship with gstack

gstack-industrial is a **layer on top of gstack**, not a replacement. It reuses gstack's infrastructure:

| What gstack provides | What gstack-industrial adds |
|----------------------|----------------------------|
| 36+ skills (ship, review, qa, brainstorming, etc.) | **Auto-suggest** any installed skill based on your message |
| `gstack-repo-mode` binary (solo/collaborative detection) | **Repo-mode aware thresholds** (reads gstack's output) |
| `timeline.jsonl` (skill completion tracking) | **Pair learning** (reads gstack's timeline to predict next skill) |
| Manual skill invocation (`/ship`, `/review`, etc.) | **Proactive suggestions** via UserPromptSubmit hook |

**gstack is required** — install gstack first, then gstack-industrial.

---

## Quick Start

### Installation (2 minutes)

```bash
# 1. Clone
git clone https://github.com/kevintseng/gstack-industrial.git
cd gstack-industrial

# 2. Auto-install
bun install
```

The installer automatically:
- Copies skill-router to `~/.claude/skills/templates/skill-router/`
- Copies hooks to `~/.claude/hooks/`
- Scans all installed skills and builds routing rules
- Registers UserPromptSubmit hook (auto-suggest)
- Registers SessionStart hook (auto-discovery)
- Creates default config

Installation is idempotent — running it again won't create duplicate hooks.

### Usage

**Auto mode** (recommended): Do nothing, Claude will auto-suggest at the right time

```
You say: "I need to think about how to implement this feature"
Claude auto-responds:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Suggestion: Use @brainstorming
   Organize ideas with structured thinking
   (Say "yes" to run, or "stop suggesting" to disable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Manual testing**:

```bash
cd ~/.claude/skills/templates/skill-router
bun run test-cli.ts "I need to review my code" --debug
```

---

## Auto-Discovery (v1.1.0)

On every Claude Code session start, auto-discover scans all SKILL.md files under `~/.claude/skills/`:

1. **Parse frontmatter** — Reads `name` and `description` fields
2. **Extract keywords** — Pulls trigger words from descriptions (quoted phrases, slash commands, key terms)
3. **Infer phase** — Determines applicable development phase (think/plan/build/review/test/ship)
4. **Merge into matchers.json** — New skills are added automatically; manually-written rules are never overwritten

**Features:**
- Deduplication: when the same skill exists in multiple sources, priority is gstack > plugin > standalone
- Idempotent: running repeatedly won't create duplicate entries
- Manual rule protection: `autoDiscovered: true` flag distinguishes auto vs manual rules
- 1-hour cooldown: avoids re-scanning on every session resume

**Manual trigger:**

```bash
# Scan and update
bun run discover

# Preview (no write)
bun run discover:dry
```

---

## How does it know what to suggest?

**Smart Router analyzes:**

1. **Your words** — "brainstorm" -> suggests brainstorming skill
2. **Project state** — Uncommitted files -> suggests code review
3. **Development phase** — "ready to merge" -> suggests finishing-branch skill
4. **Repo mode** — Lower threshold for solo devs (60), higher for collaborative (85)
5. **Your history** — Boosts skills you often accept, penalizes ones you dismiss
6. **Skill patterns** — Predicts next skill based on your past sequences (via gstack timeline)

**Anti-spam mechanisms:**
- Cooldown: no repeat suggestions within 5 minutes
- Session cap: 500 suggestions max per session (visible warning when hit, not silent)
- Same skill won't be suggested 3 times in a row
- Feedback-based: skills you dismiss get lower priority over time

---

## Advanced Configuration (Optional)

Works out of the box, but you can customize:

**Disable suggestions for certain skills:**
Edit `~/.claude/config/skill-router.json`:
```json
{
  "disabledSkills": ["skill-judge"]
}
```

**Set quiet hours (no interruptions at night):**
```json
{
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00"
  }
}
```

**Boost priority for specific skills:**
```json
{
  "priorityBoosts": {
    "brainstorming": 20,
    "systematic-debugging": 15
  }
}
```

**Tune repo-mode thresholds:**
```json
{
  "repoModeThresholds": {
    "solo": 60,
    "collaborative": 85,
    "unknown": 80
  }
}
```

**Tune feedback sensitivity:**
```json
{
  "feedbackBoost": 20,
  "feedbackPenalty": 30,
  "showLimitWarnings": true
}
```

Details: [INSTALL.md](INSTALL.md)

---

## File Structure

```
gstack-industrial/
├── skill-router/
│   ├── auto-discover.ts          # Scans SKILL.md -> matchers.json
│   ├── matchers.json             # Routing rules (manual + auto)
│   ├── matcher-engine.ts         # Scoring engine
│   ├── context-extractor.ts      # Context extraction
│   ├── types.ts                  # Type definitions
│   ├── index.ts                  # Router entry point
│   ├── gen-skill-docs.ts         # Template generator
│   ├── suggestion-formatter.ts   # Suggestion formatter
│   └── test-cli.ts               # CLI test tool
├── hooks/
│   ├── skill-router-before-message.ts    # UserPromptSubmit hook
│   └── skill-discovery-session-start.sh  # SessionStart hook
├── standard-sections/            # Shared template sections
├── install.ts                    # Install script
├── package.json
└── README.md
```

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
rm ~/.claude/sessions/skill-router-feedback.json
rm ~/.claude/state/skill-discovery-last-run

# Manually edit ~/.claude/settings.json to remove related hooks
```

---

## Contributing

PRs welcome! Process:

1. Fork this repo
2. Create a feature branch
3. Test your changes
4. Submit PR

See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## License

MIT License - see [LICENSE](LICENSE)

---

## Acknowledgments

- **[Garry Tan](https://github.com/garrytan)** — Original gstack philosophy
- **[Claude Code](https://claude.ai/code)** — Integration platform
