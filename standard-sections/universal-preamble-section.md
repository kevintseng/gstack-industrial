## 🚀 Universal Preamble (Mandatory - Execute First)

```bash
# Universal Preamble - provides context awareness
SKILL_NAME="{{SKILL_NAME}}"
source ~/.claude/skills/templates/universal-preamble.sh

# Preamble provides:
# $_BRANCH - current branch (use for branch operations)
# $_BASE_BRANCH - base branch for PRs (use for merge target)
# $_REPO - repository name
# $_SESSIONS - active session count
# $_ELI16_MODE - simplified explanation mode
```

**Standards Reference:**
- **AskUserQuestion Format:** `~/.claude/skills/templates/askuserquestion-standard.md`
- **Completeness Principle:** `~/.claude/skills/templates/completeness-principle.md`

**Context Info:**
- Current Branch: `$_BRANCH`
- Base Branch: `$_BASE_BRANCH`
- Repository: `$_REPO`
- Active Sessions: `$_SESSIONS`

---
