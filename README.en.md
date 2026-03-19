# gstack-industrial

> **English** | [繁體中文](README.md)

**Let Claude Code auto-suggest the right skills**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)

---

## 💡 What is this?

You have 168 Claude Code skills, but can never remember which one to use?

**gstack-industrial** solves this problem:

🤖 **Auto-suggest** — Recommends the best skill based on your message and project state
📝 **Template system** — Write standards once, auto-apply to all skills
⚡ **Zero interruption** — Only suggests when truly helpful, won't spam you

---

## 📊 Comparison with original gstack

| Original gstack | gstack-industrial |
|-----------------|-------------------|
| Provides 3 template files | ✅ **Auto-generates** skills (no manual copy-paste) |
| You need to remember which skill to use | ✅ **Auto-suggests** the most suitable skill |
| Manually update all skills | ✅ Update template once, **regenerate all** |
| - | ✅ Anti-spam mechanisms (cooldown, limits) |

**In short**: gstack provides the standards, gstack-industrial automates execution

---

## 🚀 Quick Start

### Installation (2 minutes)

```bash
# 1. Download
git clone https://github.com/YOUR_USERNAME/gstack-industrial.git
cd gstack-industrial

# 2. Auto-install
bun install
# Automatically copies to ~/.claude/ directory
```

Done! Restart Claude Code and you're ready.

### Usage

**Auto mode** (recommended): Do nothing, Claude will auto-suggest at the right time

```
You say: "I need to think about how to implement this feature"
Claude auto-responds:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Suggestion: Use @brainstorming
   Organize ideas with structured thinking
   (Say "yes" to run, or "stop suggesting" to disable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Manual testing**: Want to see how it works?

```bash
cd ~/.claude/skills/templates/skill-router
bun run test-cli.ts "I need to review my code" --debug
```

---

## 🔍 How does it know what to suggest?

**Smart Router analyzes:**

1. **Your words** — "brainstorm" → suggests brainstorming skill
2. **Project state** — Uncommitted files → suggests code review
3. **Development phase** — Say "ready to merge" → suggests finishing-branch skill

**Anti-spam mechanisms:**
- No repeat suggestions within 5 minutes
- Max 10 suggestions per conversation
- Same skill won't be suggested 3 times in a row

---

## ⚙️ Advanced Configuration (Optional)

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

Details: [INSTALL.md](INSTALL.md)

---

## 📚 Further Reading

- **[Installation Guide](INSTALL.md)** — Complete installation steps and troubleshooting
- **[Original gstack](https://github.com/garrytan/gstack)** — Understand the philosophy

---

## 🤝 Contributing

PRs welcome! Process:

1. Fork this repo
2. Create a feature branch
3. Test your changes
4. Submit PR

---

## 📜 License

MIT License - see [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- **[Garry Tan](https://github.com/garrytan)** — Original gstack philosophy
- **[Claude Code](https://claude.ai/code)** — Integration platform

---

**Built with ❤️ for the Claude Code community**
