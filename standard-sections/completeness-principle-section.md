## Completeness Principle

**Core Rule:** AI makes completeness cost approach zero. Always choose complete over shortcut.

**Decision Framework:**
```
if (LOC_delta < 100 lines) AND (time_delta < 30 min):
    ALWAYS choose complete option
```

**Completeness Scale:**
- **10/10**: 100% complete (all edges, tests, docs, monitoring)
- **8/10**: Production-ready (95% coverage)
- **6/10**: MVP (happy path only)
- **4/10**: PoC (many TODOs)
- **2/10**: Stub (incomplete)

**Effort Compression Reference:**

| Task Type | Human Team | CC+Smart-Agents | Compression |
|-----------|-----------|-----------------|-------------|
| Boilerplate | 2 days | 15 min | ~100x |
| Test writing | 1 day | 15 min | ~50x |
| Feature impl | 1 week | 30 min | ~30x |
| Bug fix + test | 4 hours | 15 min | ~20x |
| Architecture | 2 days | 4 hours | ~5x |
| Research | 1 day | 3 hours | ~3x |

**When presenting options:**
- Always calculate completeness scores for each option
- Show human vs CC effort estimates
- Recommend the more complete option when effort delta is small
- Let user decide when completeness requires significant additional effort

**Full principle:** `~/.claude/skills/templates/completeness-principle.md`
