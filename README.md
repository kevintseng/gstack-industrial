<div align="center">

# gstack-industrial

**The right Claude Code skill, at the right moment — automatically.**

*Enhancement layer on top of [gstack](https://github.com/garrytan/gstack). Requires gstack.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/v/release/kevintseng/gstack-industrial?style=for-the-badge&color=blue)](https://github.com/kevintseng/gstack-industrial/releases)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-D97757?style=for-the-badge)](https://claude.ai/code)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?style=for-the-badge&logo=bun)](https://bun.sh)

[![Stars](https://img.shields.io/github/stars/kevintseng/gstack-industrial?style=social)](https://github.com/kevintseng/gstack-industrial/stargazers)
[![Issues](https://img.shields.io/github/issues/kevintseng/gstack-industrial)](https://github.com/kevintseng/gstack-industrial/issues)

[**English**](README.md) | [**繁體中文**](README.zh-TW.md) | [**简体中文**](README.zh-CN.md) | [**日本語**](README.ja.md) | [**한국어**](README.ko.md) | [**Português**](README.pt-BR.md) | [**Bahasa**](README.id.md) | [**Tiếng Việt**](README.vi.md)

</div>

---

You have dozens of Claude Code skills. You never remember which one to use.

**gstack-industrial** watches your messages and — when the moment is right — surfaces the most relevant skill. One word and Claude gets a fully-prepared context: its role, your project state, and exactly how to execute.

---

## What it looks like

```
You say: "I need to brainstorm how to implement this"

Claude responds:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 [Suggested] Use @brainstorming
   Brainstorm ideas with structured thinking
   Triggered by: keywords: brainstorm • phase: think
   Hint: Explore the problem space before proposing solutions
         Generate 3+ diverse alternatives before evaluating any
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(Say "yes" to run, or "stop suggesting" to disable)
```

Say **"yes"** and Claude receives a structured brief:

```xml
<skill-invocation>
  <skill>brainstorming</skill>
  <role>You are a structured brainstorming facilitator. Help explore ideas
  systematically without premature implementation commitments.</role>
  <context>
    <branch>feature/auth-redesign</branch>
    <phase>think</phase>
    <git-status>dirty</git-status>
    <uncommitted-files>src/auth.ts, src/session.ts (+2 more)</uncommitted-files>
    <last-commit>47 minutes ago</last-commit>
  </context>
  <execution-hints>
    <hint>Explore the problem space before proposing solutions</hint>
    <hint>Generate 3+ diverse alternatives before evaluating any</hint>
    <hint>No commit in 47 min — consider checkpointing</hint>
  </execution-hints>
  <instruction>Invoke the @brainstorming skill now, using the context above.</instruction>
</skill-invocation>
```

Claude knows what to do. No re-explaining required.

---

## Features

- **Auto-Discovery** — Scans all installed SKILL.md files and builds routing rules automatically
- **Context-Aware Matching** — Uses your message text, git state, development phase, and usage history
- **Calibrated Confidence** — `Highly Recommended` / `Suggested` / `May Apply` labels let you decide how much to heed it
- **Full Context Injection** — Sends Claude a structured XML brief (role + project snapshot + execution hints) on "yes"
- **Learns from You** — Boosts skills you accept, penalizes ones you dismiss
- **Zero Spam** — 5-minute cooldown, 500-suggestion session cap, same skill never suggested 3× in a row
- **Locale-Aware** — Suggestions appear in your language (EN, zh-TW, zh-CN, ja, ko, pt-BR, id, vi)
- **Local-Only** — No telemetry, no network calls, all state in `~/.claude/`

---

## Prerequisites

**gstack is required.** Install it first:

```bash
# Install gstack (if you haven't already)
cd ~/.claude/skills
git clone https://github.com/garrytan/gstack.git
cd gstack && ./setup
```

You also need [Bun](https://bun.sh) >= 1.0.0:

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## Installation (2 minutes)

```bash
# 1. Clone
git clone https://github.com/kevintseng/gstack-industrial.git
cd gstack-industrial

# 2. Install
bun run install
```

That's it. The installer:

- Copies skill-router to `~/.claude/skills/templates/skill-router/`
- Copies hooks to `~/.claude/hooks/`
- Scans your installed skills and builds routing rules
- Registers `UserPromptSubmit` hook (auto-suggest on every message)
- Registers `SessionStart` hook (refresh routing rules on each session)
- Creates default config at `~/.claude/config/skill-router.json`

**Idempotent** — safe to run multiple times.

### Update

```bash
git pull
bun run install
```

The installer overwrites files with the latest version and migrates new config fields while preserving your existing settings.

---

## How does it know what to suggest?

The router analyzes six signals every time you send a message:

| Signal | Example |
|--------|---------|
| **Your words** | "brainstorm" → suggests `/brainstorming` |
| **Git state** | 7 uncommitted files → suggests code review |
| **Development phase** | "ready to merge" → suggests `/ship` |
| **Repo mode** | Solo project = lower threshold (60); team = higher (85) |
| **Your history** | Accept `/qa` often → its score rises over time |
| **Skill sequences** | After `/ship`, predicts you may want `/document-release` next |

**Scoring at a glance:**

```
Keywords match    +50 per keyword
Regex match       +75
Phase match       +100
Git status        +30
File pattern      +40 per match
Feedback history  ±custom
─────────────────────────────────
Threshold to show: 80 (configurable)
```

---

## Relationship with gstack

gstack-industrial is a **layer on top of gstack**, not a replacement:

| gstack provides | gstack-industrial adds |
|-----------------|------------------------|
| 36+ skills (`/ship`, `/review`, `/qa`, …) | **Auto-suggest** any skill at the right moment |
| `gstack-repo-mode` (solo/collaborative detection) | **Repo-mode aware thresholds** |
| `timeline.jsonl` (skill completion tracking) | **Sequence prediction** (reads gstack's timeline) |
| Manual skill invocation | **Proactive suggestions** via UserPromptSubmit hook |

---

## Auto-Discovery

On every session start, auto-discover scans all SKILL.md files under `~/.claude/skills/`:

1. **Parse frontmatter** — Reads `name` and `description`
2. **Extract keywords** — Pulls trigger words from descriptions
3. **Infer phase** — Determines applicable development phase (think/plan/build/review/test/ship)
4. **Merge into routing rules** — New skills are added; your hand-written rules are never overwritten

**Manual trigger:**

```bash
# Scan and update
bun run discover

# Preview (no write)
bun run discover:dry
```

---

## Configuration (Optional)

Works out of the box. Edit `~/.claude/config/skill-router.json` to customize:

**Disable specific skills:**
```json
{ "disabledSkills": ["skill-judge"] }
```

**Quiet hours (no suggestions at night):**
```json
{
  "quietHours": { "enabled": true, "start": "22:00", "end": "08:00" }
}
```

**Boost or penalize specific skills:**
```json
{
  "priorityBoosts": { "brainstorming": 20, "systematic-debugging": 15 }
}
```

**Language override** (auto-detected from system locale by default):
```json
{ "lang": "zh-TW" }
```

Supported: `en`, `zh-TW`, `zh-CN`, `ja`, `ko`, `pt-BR`, `id`, `vi`

**Tune repo-mode thresholds:**
```json
{
  "repoModeThresholds": { "solo": 60, "collaborative": 85, "unknown": 80 }
}
```

Full reference: [INSTALL.md](INSTALL.md)

---

## Testing

```bash
cd ~/.claude/skills/templates/skill-router

# Basic test
bun run test-cli.ts "I need to review my code"

# With debug context
bun run test-cli.ts "All tests pass, ready to merge" --debug

# See multiple suggestions
bun run test-cli.ts "The test is failing" --multi
```

---

## Uninstall

```bash
rm -rf ~/.claude/skills/templates/skill-router
rm ~/.claude/skills/templates/*-section.md
rm ~/.claude/hooks/skill-router-before-message.ts
rm ~/.claude/hooks/skill-discovery-session-start.sh
rm ~/.claude/config/skill-router.json
rm ~/.claude/sessions/skill-router-state.json
rm ~/.claude/state/skill-discovery-last-run
# Then edit ~/.claude/settings.json to remove the two hook entries
```

---

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE)

---

## Acknowledgments

- **[Garry Tan](https://github.com/garrytan)** — gstack philosophy and original infrastructure
- **[Claude Code](https://claude.ai/code)** — Integration platform
- **[Anthropic](https://www.anthropic.com)** — 6-element prompt engineering framework that powers suggestion quality
