# Skill Router Guide

> **繁體中文** | [English](#english-version)

## 什麼是 Skill Router？

Skill Router 是一個 **context-aware 智能建議系統**，在適當時機自動推薦最相關的 Claude Code skill。

### 核心概念

```
你的訊息 → Router 分析 → 多維度評分 → 超過門檻 → 顯示建議
```

**範例**:

```
你說："我需要想想這個功能要怎麼做"

Router 分析：
- 關鍵字 "想想" → 匹配 brainstorming (+50 分)
- Phase: THINK → 匹配 brainstorming (+100 分)
- 總分: 150 分（超過門檻 80 分）

結果：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 建議使用 @brainstorming
   用結構化思考整理想法
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 運作原理

### 1. Context Extraction（情境萃取）

Router 分析這些資訊：

| 資訊來源 | 提取內容 | 使用時機 |
|---------|---------|---------|
| **Message** | 關鍵字、語氣 | 永遠 |
| **Git** | branch、status、uncommitted files | 當在 git repo |
| **Files** | 檔案類型、路徑模式 | 當有檔案變更 |
| **Phase** | THINK/PLAN/BUILD/REVIEW/TEST/SHIP | 永遠 |
| **Session** | 冷卻狀態、建議歷史 | 永遠 |

**實作**: `context-extractor.ts`

### 2. Phase Detection（階段偵測）

將訊息映射到開發階段：

```typescript
const phaseKeywords = {
  THINK: ['brainstorm', 'idea', 'should i', 'whether', 'consider'],
  PLAN: ['plan', 'approach', 'how to', 'architecture', 'design'],
  BUILD: ['implement', 'create', 'add', 'build', 'write code'],
  REVIEW: ['review', 'check', 'audit', 'look at', 'verify'],
  TEST: ['test', 'debug', 'fix', 'error', 'failing', 'broken'],
  SHIP: ['ready', 'merge', 'deploy', 'release', 'done', 'complete']
};
```

**多階段偵測**: 一個訊息可以匹配多個階段

```
"I need to plan and implement user auth"
→ Phase: [PLAN, BUILD]
```

### 3. Matcher Engine（匹配引擎）

#### 評分演算法

```typescript
function calculateMatchScore(matcher: SkillMatcher, ctx: RouterContext): number {
  let score = 0;

  // 1. 關鍵字匹配 (+50/keyword)
  if (matcher.keywords) {
    matcher.keywords.forEach(kw => {
      if (ctx.message.includes(kw)) score += 50;
    });
  }

  // 2. Phase 匹配 (+100) — 最高權重！
  if (matcher.phase && ctx.phase.some(p => matcher.phase.includes(p))) {
    score += 100;
  }

  // 3. Git status 匹配 (+30)
  if (matcher.gitStatus) {
    if (ctx.gitStatus === matcher.gitStatus) score += 30;
  }

  // 4. File patterns 匹配 (+40/pattern)
  if (matcher.filePatterns) {
    matcher.filePatterns.forEach(pattern => {
      if (ctx.files.some(f => matchPattern(f, pattern))) score += 40;
    });
  }

  // 5. Uncommitted files 範圍 (+20)
  if (matcher.uncommittedFiles) {
    if (ctx.uncommittedCount >= matcher.uncommittedFiles.min &&
        ctx.uncommittedCount <= matcher.uncommittedFiles.max) {
      score += 20;
    }
  }

  // 6. Priority boost（設定檔）
  score += ctx.config.priorityBoosts[matcher.skill] || 0;

  return score;
}
```

#### 門檻系統

預設門檻: **80 分**

```
< 80 分 → 不顯示
≥ 80 分 → 顯示建議
```

可在設定檔調整：

```json
{
  "threshold": 60  // 降低門檻，顯示更多建議
}
```

### 4. Anti-Spam Mechanisms（防干擾機制）

#### Cooldown（冷卻時間）

```
建議顯示 → 5 分鐘內不再建議相同 skill
```

#### Max Suggestions（次數限制）

```
每次對話最多 10 個建議 → 超過就停止
```

#### No 3x Repeat（不連續重複）

```
同一個 skill 連續建議 3 次 → 第 4 次不顯示
```

#### Quiet Hours（安靜時間）

```json
{
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00"
  }
}
```

在此時間內不顯示建議。

---

## 設定

### 設定檔位置

`~/.claude/config/skill-router.json`

### 完整設定範例

```json
{
  "enabled": true,
  "threshold": 80,
  "maxSuggestionsPerSession": 10,
  "cooldownMinutes": 5,
  "disabledSkills": [
    "skill-judge",
    "old-skill"
  ],
  "priorityBoosts": {
    "sa:comprehensive-code-review": 50,
    "writing-plans": 30,
    "brainstorming": 20
  },
  "quietHours": {
    "enabled": false,
    "start": "22:00",
    "end": "08:00"
  }
}
```

### 設定選項說明

| 選項 | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| `enabled` | boolean | `true` | 開啟/關閉 router |
| `threshold` | number | `80` | 最低評分門檻 |
| `maxSuggestionsPerSession` | number | `10` | 每次對話最多建議數 |
| `cooldownMinutes` | number | `5` | 冷卻時間（分鐘）|
| `disabledSkills` | string[] | `[]` | 停用的 skills |
| `priorityBoosts` | object | `{}` | 特定 skill 的加分 |
| `quietHours.enabled` | boolean | `false` | 開啟安靜時間 |
| `quietHours.start` | string | - | 開始時間（HH:MM）|
| `quietHours.end` | string | - | 結束時間（HH:MM）|

---

## Matchers 配置

### Matcher 結構

位置: `skill-router/matchers.json`

```json
{
  "skill": "brainstorming",
  "priority": 1,
  "triggers": {
    "keywords": ["brainstorm", "idea", "should i", "whether"],
    "phase": ["think"],
    "gitStatus": null,
    "filePatterns": null,
    "uncommittedFiles": null
  },
  "explanation": "Brainstorm ideas with structured thinking"
}
```

### Trigger 條件

| 條件 | 型別 | 範例 | 說明 |
|------|------|------|------|
| `keywords` | string[] | `["review", "check"]` | 訊息關鍵字 |
| `phase` | Phase[] | `["review", "ship"]` | 開發階段 |
| `gitStatus` | string | `"dirty"` | Git 狀態 (clean/dirty) |
| `filePatterns` | string[] | `["**/*.test.ts"]` | 檔案 glob patterns |
| `uncommittedFiles` | object | `{"min": 1, "max": 10}` | 未提交檔案數範圍 |

### Priority（優先級）

數字越小 = 優先級越高

```json
{"skill": "brainstorming", "priority": 1},  // 最高優先
{"skill": "writing-plans", "priority": 2},
{"skill": "code-review", "priority": 20}     // 較低優先
```

當多個 skill 評分相同時，priority 決定顯示順序。

---

## Hook Integration

### beforeMessage Hook

位置: `~/.claude/hooks/skill-router-before-message.ts`

**執行時機**: 在 Claude 處理訊息**之前**

**流程**:

```
User message
    ↓
beforeMessage hook 執行
    ↓ (< 10ms)
Router 分析 + 評分
    ↓
超過門檻？
    ├─ 是 → 顯示建議並等待回應
    └─ 否 → 繼續執行 Claude
```

### 啟用 Hook

編輯 `~/.claude/settings.json`：

```json
{
  "hooks": {
    "beforeMessage": "~/.claude/hooks/skill-router-before-message.ts"
  }
}
```

### 用戶回應

當建議顯示時，用戶可以：

| 回應 | 動作 |
|------|------|
| `yes` | 接受建議，執行 skill |
| `no` / `not now` | 拒絕建議，繼續執行 |
| `stop suggesting` | 停用此 session 的所有建議 |

---

## 測試與除錯

### CLI Test Tool

```bash
cd ~/.claude/skills/templates/skill-router

# 基本測試
bun run test-cli.ts "I need to review my code"

# Debug mode（顯示完整 context + 所有匹配）
bun run test-cli.ts "The test is failing" --debug

# 顯示多個建議
bun run test-cli.ts "Ready to merge" --multi
```

### Debug Output 範例

```bash
$ bun run test-cli.ts "review this code" --debug

📊 Context:
  Message: "review this code"
  Phase: [REVIEW]
  Git Status: dirty
  Uncommitted files: 5
  Current branch: feature/auth

🎯 Matches (3):
  1. sa:comprehensive-code-review (score: 180)
     - keyword "review" (+50)
     - phase REVIEW (+100)
     - git dirty (+30)

  2. requesting-code-review (score: 150)
     - keyword "review" (+50)
     - phase REVIEW (+100)

  3. code-simplifier (score: 80)
     - phase REVIEW (+100)
     - priority boost (+20)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Suggestion: Use @sa:comprehensive-code-review
   Run comprehensive code review with Reality Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Performance Metrics

```
Context Extraction: ~2ms
Matcher Scoring:    ~3ms
Session State:      ~1ms
Total:              < 10ms
```

**非阻塞**: Hook 不會延遲 Claude 回應

---

## 進階用法

### 動態 Priority Boost

依據專案需求調整 priority：

```json
{
  "priorityBoosts": {
    "sa:comprehensive-code-review": 50,  // 此專案重視 code review
    "test-driven-development": -30        // 不需要 TDD
  }
}
```

負數 = 降低優先級（但不會完全停用）

### 條件組合

複雜的 trigger 條件：

```json
{
  "skill": "finishing-a-development-branch",
  "triggers": {
    "keywords": ["ready", "merge", "done"],
    "phase": ["ship"],
    "gitStatus": "clean",           // 必須 git clean
    "filePatterns": ["src/**"],     // 必須有 src/ 的改動
    "uncommittedFiles": {
      "min": 0,
      "max": 0                      // 不能有未提交檔案
    }
  }
}
```

**所有條件都符合** → 才會加分

---

## 故障排除

### "No suggestions shown"

**檢查**:
1. 設定檔是否啟用？`"enabled": true`
2. 門檻是否太高？試試降低 `threshold`
3. 是否在 cooldown 期間？
4. 是否已達 max suggestions？

**Debug**:
```bash
bun run test-cli.ts "your message" --debug
# 檢查評分是否 >= threshold
```

### "Wrong skill suggested"

**原因**: Matcher 設定不精確

**解決**: 調整 matchers.json 的 keywords 和 triggers

**範例**:
```json
// 改進前：太廣泛
{"keywords": ["test"]}  // 會匹配 "Can you test this?" (非技術意義)

// 改進後：更精確
{"keywords": ["test failing", "test error", "run test"]}
```

### "Performance slow"

**檢查**:
```bash
bun run test-cli.ts "message" --debug
# 查看 timing 資訊
```

**優化**:
- 減少 matchers 數量
- 簡化 glob patterns
- 減少 git 呼叫次數

---

<a name="english-version"></a>
## English Version

[Coming soon - translate the above content to English]

---

## See Also

- [Template System Guide](TEMPLATE_SYSTEM.md)
- [Creating Matchers](CREATING_MATCHERS.md)
- [API Reference](API.md)
