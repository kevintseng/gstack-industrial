## AskUserQuestion Standard Format

When presenting options to the user, ALWAYS use the four-part structure:

```markdown
**Re-ground:** (1-2 sentences, use $_BRANCH)
Working on [project], branch: $_BRANCH. [Current task].

**Problem:** (ELI16 - use analogies, not jargon)
[Plain English explanation with analogies]

**RECOMMENDATION:** Choose [X] because [reason]

Completeness scores:
- Option A: [score]/10
- Option B: [score]/10

**Options:**
A) [Complete implementation]
   (human: ~[time] / CC: ~[time])
   Completeness: [score]/10

B) [Shortcut]
   (human: ~[time] / CC: ~[time])
   Completeness: [score]/10
```

**Key Principles:**
- Use `$_BRANCH` from Universal Preamble (not `git branch --show-current`)
- ELI16 mode: Explain Like I'm 16 (plain English, analogies, no jargon)
- Always provide completeness scores (0-10 scale)
- Show human vs CC+Smart-Agents effort estimates
- Lead with recommendation, then present options

**Full specification:** `~/.claude/skills/templates/askuserquestion-standard.md`
