# Creating Matchers Guide

> **繁體中文** | [English](#english-version)

## 什麼是 Matcher？

Matcher 定義「什麼情況下建議某個 skill」的規則。

**範例**:
```json
{
  "skill": "systematic-debugging",
  "priority": 5,
  "triggers": {
    "keywords": ["error", "bug", "broken", "failing"],
    "phase": ["test"],
    "gitStatus": null,
    "filePatterns": ["**/*.test.ts"],
    "uncommittedFiles": null
  },
  "explanation": "Debug errors with systematic approach"
}
```

**意思**: 當訊息包含 "error/bug/broken/failing"，且處於 TEST 階段，且有 test 檔案變更 → 建議 systematic-debugging

---

## 快速開始

### 1. 編輯 matchers.json

位置: `~/.claude/skills/templates/skill-router/matchers.json`

```json
{
  "matchers": [
    {
      "skill": "your-new-skill",
      "priority": 21,
      "triggers": {
        "keywords": ["keyword1", "keyword2"],
        "phase": ["build"],
        "gitStatus": null,
        "filePatterns": null,
        "uncommittedFiles": null
      },
      "explanation": "One-line explanation of what this skill does"
    }
  ]
}
```

### 2. 測試 Matcher

```bash
cd ~/.claude/skills/templates/skill-router
bun run test-cli.ts "message containing keyword1" --debug
```

檢查：
- 你的 matcher 是否出現在 matches 列表
- 評分是否 ≥ 80
- 是否排在合理的順序

### 3. 調整並迭代

根據測試結果調整 keywords、phase、priority 等。

---

## Trigger 條件詳解

### Keywords（關鍵字）

**用途**: 匹配訊息中的特定字詞

**評分**: +50 分 / 關鍵字

**範例**:

```json
{
  "keywords": ["brainstorm", "idea", "should i", "whether", "consider"]
}
```

**最佳實踐**:

✅ **DO**:
- 使用小寫（系統會自動 lowercase 比對）
- 包含同義詞和變體
- 使用 2-3 字的詞組（更精確）

```json
// 好
{"keywords": ["code review", "review code", "check code"]}

// 不好
{"keywords": ["review"]}  // 太廣泛，"review the plan" 也會匹配
```

❌ **DON'T**:
- 使用太廣泛的單字（"test", "code", "fix"）
- 使用標點符號或特殊字元
- 使用大寫（會被轉成小寫）

### Phase（開發階段）

**用途**: 匹配開發階段

**評分**: +100 分（最高權重！）

**可用階段**:

| Phase | 意義 | 關鍵字範例 |
|-------|------|-----------|
| `think` | 思考、探索 | brainstorm, idea, should i |
| `plan` | 規劃、設計 | plan, approach, architecture |
| `build` | 實作、開發 | implement, create, add |
| `review` | 檢閱、審查 | review, check, audit |
| `test` | 測試、除錯 | test, debug, fix, error |
| `ship` | 部署、完成 | ready, merge, deploy |

**範例**:

```json
{
  "phase": ["review", "ship"]  // 匹配 REVIEW 或 SHIP 階段
}
```

**何時使用**:

- ✅ Skill 明確屬於某個階段 → 設定 phase
- ❌ Skill 可以用在任何階段 → `"phase": null`

**組合使用**:

```json
{
  "keywords": ["review", "check", "audit"],
  "phase": ["review"]  // 強化：keyword + phase 都匹配 = 150 分
}
```

### gitStatus（Git 狀態）

**用途**: 匹配 git working directory 狀態

**評分**: +30 分

**可用值**:
- `"clean"` — 沒有未追蹤或未暫存的變更
- `"dirty"` — 有未追蹤或未暫存的變更
- `null` — 不檢查 git 狀態

**範例**:

```json
// Code review skill — 需要有變更
{
  "skill": "requesting-code-review",
  "triggers": {
    "gitStatus": "dirty"  // 必須有未提交的改動
  }
}

// Merge skill — 需要乾淨
{
  "skill": "finishing-a-development-branch",
  "triggers": {
    "gitStatus": "clean"  // 必須先提交所有改動
  }
}
```

### filePatterns（檔案模式）

**用途**: 匹配檔案路徑 patterns

**評分**: +40 分 / pattern

**Glob 語法**:
- `**/*.ts` — 所有 .ts 檔案
- `src/**` — src/ 下的所有檔案
- `**/*.test.ts` — 所有測試檔案
- `*.md` — 當前目錄的 .md 檔案

**範例**:

```json
{
  "skill": "test-driven-development",
  "triggers": {
    "filePatterns": ["**/*.test.ts", "**/*.spec.ts"]
  }
}

{
  "skill": "frontend-design",
  "triggers": {
    "filePatterns": ["src/components/**", "src/pages/**", "**/*.tsx"]
  }
}
```

**何時使用**:

- ✅ Skill 專門處理特定類型的檔案
- ❌ Skill 與檔案類型無關 → `"filePatterns": null`

### uncommittedFiles（未提交檔案數）

**用途**: 匹配未提交檔案的數量範圍

**評分**: +20 分

**範例**:

```json
{
  "uncommittedFiles": {
    "min": 1,
    "max": 10
  }
}
```

意思: 1-10 個未提交檔案時匹配

**常見場景**:

```json
// 小規模改動的 code review
{
  "skill": "quick-code-review",
  "triggers": {
    "uncommittedFiles": {"min": 1, "max": 5}
  }
}

// 大規模改動的 comprehensive review
{
  "skill": "sa:comprehensive-code-review",
  "triggers": {
    "uncommittedFiles": {"min": 5, "max": 100}
  }
}

// 需要乾淨 working directory
{
  "skill": "finishing-a-development-branch",
  "triggers": {
    "uncommittedFiles": {"min": 0, "max": 0}
  }
}
```

---

## Priority（優先級）

**作用**: 當多個 skill 評分相同時，決定顯示順序

**規則**: 數字越小 = 優先級越高

**範例**:

```json
{"skill": "brainstorming", "priority": 1},          // 最高優先
{"skill": "writing-plans", "priority": 2},
{"skill": "systematic-debugging", "priority": 5},
{"skill": "code-simplifier", "priority": 10},
{"skill": "documentation-audit", "priority": 20}    // 較低優先
```

**如何設定 Priority**:

1. **核心 skills** (1-5) — 最常用、最重要
2. **日常 skills** (6-15) — 經常使用
3. **特殊 skills** (16-30) — 特定情境

---

## 設計 Matcher 的策略

### 策略 1: 單一條件（Simple Match）

適合：專門、明確的 skill

```json
{
  "skill": "brainstorming",
  "priority": 1,
  "triggers": {
    "keywords": ["brainstorm", "idea"],
    "phase": ["think"],
    "gitStatus": null,
    "filePatterns": null,
    "uncommittedFiles": null
  }
}
```

評分: keyword (50) + phase (100) = 150 分

### 策略 2: 多條件組合（Multi-Condition Match）

適合：需要特定情境的 skill

```json
{
  "skill": "finishing-a-development-branch",
  "priority": 15,
  "triggers": {
    "keywords": ["ready", "merge", "done", "complete"],
    "phase": ["ship"],
    "gitStatus": "clean",
    "filePatterns": null,
    "uncommittedFiles": {"min": 0, "max": 0}
  }
}
```

評分: keyword (50) + phase (100) + gitStatus (30) + uncommitted (20) = 200 分

**只有所有條件都符合時才會達到高分** → 非常精準

### 策略 3: 廣泛匹配（Broad Match）

適合：通用的 skill

```json
{
  "skill": "anti-hallucination-protocol",
  "priority": 25,
  "triggers": {
    "keywords": ["verify", "confirm", "check if", "make sure"],
    "phase": null,  // 任何階段都適用
    "gitStatus": null,
    "filePatterns": null,
    "uncommittedFiles": null
  }
}
```

評分: keyword (50) = 50 分

**門檻 80 → 不會顯示**

需要配合 `priorityBoosts` 或降低 threshold：

```json
{
  "priorityBoosts": {
    "anti-hallucination-protocol": 40  // 50 + 40 = 90 → 超過門檻
  }
}
```

---

## 測試 Matchers

### 基本測試

```bash
# 測試訊息
bun run test-cli.ts "I need to review this code"

# 應該顯示 code-review 相關的 skills
```

### Debug 模式

```bash
bun run test-cli.ts "I need to review this code" --debug

# 輸出:
# 📊 Context: ...
# 🎯 Matches (5):
#   1. sa:comprehensive-code-review (score: 180)
#      - keyword "review" (+50)
#      - phase REVIEW (+100)
#      - git dirty (+30)
#   ...
```

### 多建議模式

```bash
bun run test-cli.ts "I need to review this code" --multi

# 顯示前 3 個建議
```

### 測試策略

**1. 正面測試（應該匹配）**:

```bash
# Brainstorming skill
bun run test-cli.ts "I'm brainstorming ideas for this feature"
# 應該建議: @brainstorming

# Code review skill
bun run test-cli.ts "Can you review my changes?"
# 應該建議: @sa:comprehensive-code-review

# TDD skill
bun run test-cli.ts "I need to write tests for the auth module"
# 應該建議: @test-driven-development
```

**2. 負面測試（不應該匹配）**:

```bash
# 不應該匹配 brainstorming
bun run test-cli.ts "I'm implementing the auth feature"
# 應該建議: BUILD 相關的 skills，不是 brainstorming

# 不應該匹配 code-review（沒有改動）
bun run test-cli.ts "Can you explain this function?"
# 應該建議: 其他 skills，不是 code-review
```

**3. 邊界測試（門檻附近）**:

```bash
# 評分剛好 80（門檻）
bun run test-cli.ts "..." --debug
# 檢查: score = 80 → 應該顯示

# 評分 79（低於門檻）
bun run test-cli.ts "..." --debug
# 檢查: score = 79 → 不應該顯示
```

---

## 常見 Matcher 模式

### 模式 1: Phase-Driven Skill

```json
{
  "skill": "brainstorming",
  "priority": 1,
  "triggers": {
    "keywords": ["brainstorm", "idea", "should i"],
    "phase": ["think"]
  }
}
```

**何時使用**: Skill 明確屬於某個開發階段

### 模式 2: File-Type Skill

```json
{
  "skill": "frontend-design",
  "priority": 10,
  "triggers": {
    "keywords": ["ui", "component", "design"],
    "phase": ["build"],
    "filePatterns": ["**/*.tsx", "**/*.css", "src/components/**"]
  }
}
```

**何時使用**: Skill 專門處理特定類型的檔案

### 模式 3: Git-State Skill

```json
{
  "skill": "requesting-code-review",
  "priority": 8,
  "triggers": {
    "keywords": ["review", "check"],
    "phase": ["review"],
    "gitStatus": "dirty",
    "uncommittedFiles": {"min": 1, "max": 100}
  }
}
```

**何時使用**: Skill 需要特定的 git 狀態

### 模式 4: Universal Skill

```json
{
  "skill": "asking-clarifying-questions",
  "priority": 30,
  "triggers": {
    "keywords": ["unclear", "not sure", "don't understand"],
    "phase": null,
    "gitStatus": null,
    "filePatterns": null,
    "uncommittedFiles": null
  }
}
```

**何時使用**: Skill 可以用在任何情境

---

## 進階技巧

### 技巧 1: 同義詞擴展

```json
{
  "keywords": [
    "review", "check", "audit", "inspect", "examine",  // 同義詞
    "code review", "review code",                       // 詞組變體
    "look at", "take a look"                           // 口語表達
  ]
}
```

### 技巧 2: 階段組合

```json
{
  "phase": ["review", "ship"]  // 在 REVIEW 或 SHIP 階段都適用
}
```

### 技巧 3: 條件互補

```json
// Skill A: 小規模 code review
{
  "skill": "quick-review",
  "uncommittedFiles": {"min": 1, "max": 3}
}

// Skill B: 大規模 code review
{
  "skill": "comprehensive-review",
  "uncommittedFiles": {"min": 4, "max": 100}
}
```

### 技巧 4: Priority 分層

```json
// 通用 review skill（高優先級）
{"skill": "requesting-code-review", "priority": 8}

// 專門 review tool（低優先級）
{"skill": "security-review", "priority": 15}
{"skill": "performance-review", "priority": 16}
```

---

## 故障排除

### "Matcher 不起作用"

**檢查**:
1. JSON 語法是否正確？（逗號、括號）
2. skill 名稱是否存在？
3. 評分是否 < 80？（用 --debug 檢查）

### "總是建議錯誤的 skill"

**原因**: keywords 太廣泛

**解決**:
```json
// 改進前
{"keywords": ["test"]}

// 改進後
{"keywords": ["test failing", "test error", "run test", "test suite"]}
```

### "從不建議我的 skill"

**檢查**:
1. 門檻是否太高？試試 `"threshold": 60`
2. Priority boost?
```json
{
  "priorityBoosts": {
    "my-skill": 50
  }
}
```

---

<a name="english-version"></a>
## English Version

[Coming soon - translate the above content to English]

---

## See Also

- [Template System Guide](TEMPLATE_SYSTEM.md)
- [Skill Router Guide](SKILL_ROUTER.md)
- [API Reference](API.md)
