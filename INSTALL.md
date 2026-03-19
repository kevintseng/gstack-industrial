# Installation Guide

## Quick Install (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/kevintseng/gstack-industrial.git
cd gstack-industrial

# 2. Run installer
bun install
# This automatically installs to ~/.claude/

# 3. Test the installation
cd ~/.claude/skills/templates/skill-router
bun run test-cli.ts "I need to brainstorm" --debug
```

---

## Manual Installation

### Prerequisites

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

# Copy hook
cp hooks/skill-router-before-message.ts ~/.claude/hooks/
chmod +x ~/.claude/hooks/skill-router-before-message.ts
```

### Step 2: Configure

Create `~/.claude/config/skill-router.json`:

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

### Step 3: Enable Hook (Optional)

To enable automatic skill suggestions, add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "beforeMessage": "~/.claude/hooks/skill-router-before-message.ts"
  }
}
```

---

## Verification

### Test Template Generator

```bash
cd ~/.claude/skills/templates
bun run skill-router/gen-skill-docs.ts --check
```

Expected output:
```
✅ All template-based skills in sync
```

### Test Skill Router

```bash
cd ~/.claude/skills/templates/skill-router

# Test with different messages
bun run test-cli.ts "I need to brainstorm this feature"
bun run test-cli.ts "The test is failing" --debug
bun run test-cli.ts "Ready to merge" --multi
```

Expected output:
```
Loaded 20 skill matchers

💡 Suggestion: Use @brainstorming for this task
Brainstorm ideas with structured thinking

(Say "yes" to run, or "stop suggesting" to disable)
```

### Test Hook Integration

```bash
cd ~/.claude/hooks
bun run skill-router-before-message.ts "I need to review my code"
```

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

Make hook executable:
```bash
chmod +x ~/.claude/hooks/skill-router-before-message.ts
```

### "Module not found"

Install dependencies:
```bash
cd ~/Developer/Projects/gstack-industrial
bun install
```

---

## Uninstall

```bash
# Remove files
rm -rf ~/.claude/skills/templates/skill-router
rm ~/.claude/skills/templates/*-section.md
rm ~/.claude/hooks/skill-router-before-message.ts
rm ~/.claude/config/skill-router.json
rm ~/.claude/sessions/skill-router-state.json

# Remove hook from settings.json
# Manually edit ~/.claude/settings.json and remove the beforeMessage hook
```

---

## Next Steps

1. **Read the Documentation**: [README.md](README.md)
2. **Create Your First Matcher**: [docs/CREATING_MATCHERS.md](docs/CREATING_MATCHERS.md)
3. **Convert Skills to Templates**: [docs/TEMPLATE_SYSTEM.md](docs/TEMPLATE_SYSTEM.md)

---

## Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/gstack-industrial/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/gstack-industrial/discussions)
