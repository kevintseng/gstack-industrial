<div align="center">

# gstack-industrial

**對的時機，自動推薦最適合的 Claude Code skill**

*建立在 [gstack](https://github.com/garrytan/gstack) 之上的增強層 — 不是取代*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/v/release/kevintseng/gstack-industrial?style=for-the-badge&color=blue)](https://github.com/kevintseng/gstack-industrial/releases)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-D97757?style=for-the-badge)](https://claude.ai/code)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?style=for-the-badge&logo=bun)](https://bun.sh)

[![Stars](https://img.shields.io/github/stars/kevintseng/gstack-industrial?style=social)](https://github.com/kevintseng/gstack-industrial/stargazers)
[![Issues](https://img.shields.io/github/issues/kevintseng/gstack-industrial)](https://github.com/kevintseng/gstack-industrial/issues)

[**English**](README.md) | [**繁體中文**](README.zh-TW.md) | [**简体中文**](README.zh-CN.md) | [**日本語**](README.ja.md) | [**한국어**](README.ko.md) | [**Português**](README.pt-BR.md) | [**Bahasa**](README.id.md) | [**Tiếng Việt**](README.vi.md)

</div>

---

## 這是什麼？

你裝了上百個 Claude Code skills，但從來記不住該用哪個？

**gstack-industrial** 監看你傳送的每一則訊息，並在對的時機建議最相關的 skill。說「yes」後 Claude 會收到完整準備好的上下文——要扮演什麼角色、建議當下的專案狀態、以及如何執行。

- **自動發現** — 掃描所有已安裝的 SKILL.md，自動建立路由規則
- **上下文感知建議** — 根據你的訊息、git 狀態、開發階段和歷史記錄匹配
- **信心標籤** — `強烈建議` / `建議` / `可能適用`，讓你知道建議強度
- **「yes」→ 完整上下文注入** — 傳送結構化的簡報給 Claude（角色、上下文快照、執行提示），透過 XML
- **從使用中學習** — 提升你接受的 skill，降低你拒絕的 skill 優先級
- **零垃圾訊息** — 5 分鐘冷卻、500 個 session 上限、同個 skill 不連續建議 3 次

所有狀態都是**本地存儲**。無 telemetry、無網路呼叫。

---

## 建議看起來長這樣

```
你說："我需要 brainstorm 這個功能要怎麼做"

Claude 回應：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 [建議] 使用 @brainstorming
   在開始寫程式之前先用結構化方式整理想法
   根據：keywords: brainstorm • phase: think
   提示：先探索問題空間，不要急著提出解決方案
         在評估任何方案前先生成 3 個以上的多樣替代方案
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(Say "yes" to run, or "stop suggesting" to disable)
```

**說「yes」** 後 Claude 會收到：

```xml
<skill-invocation>
  <skill>brainstorming</skill>
  <role>You are a structured brainstorming facilitator. Help explore ideas systematically without premature implementation commitments. Present trade-offs and alternatives — do not write code.</role>
  <context>
    <branch>feature/auth-redesign</branch>
    <phase>think</phase>
    <git-status>dirty</git-status>
    <uncommitted-files>src/auth.ts, src/session.ts, tests/auth.test.ts (+2)</uncommitted-files>
    <last-commit>47 minutes ago</last-commit>
  </context>
  <execution-hints>
    <hint>Explore the problem space before proposing solutions</hint>
    <hint>Generate 3+ diverse alternatives before evaluating any</hint>
    <hint>No commit in 47 min — consider checkpointing</hint>
  </execution-hints>
  <instruction>Invoke the @brainstorming skill now, using the context above to focus your execution.</instruction>
</skill-invocation>
```

Claude 知道該做什麼——不需要再解釋一遍。

---

## 與 gstack 的關係

gstack-industrial 是 **gstack 的上層加強**，不是取代。它重用 gstack 的基礎設施：

| gstack 提供 | gstack-industrial 加上 |
|------------|----------------------|
| 36+ 個 skills（ship、review、qa、brainstorming 等）| **自動建議**任何已安裝的 skill |
| `gstack-repo-mode` binary（solo/collaborative 偵測）| **Repo 模式感知門檻**（讀 gstack 輸出）|
| `timeline.jsonl`（skill 完成記錄）| **序列學習**（讀 gstack timeline 預測下一個 skill）|
| 手動呼叫（`/ship`、`/review` 等）| **主動建議**透過 UserPromptSubmit hook |

**需要先裝 gstack** — 先裝 gstack，再裝 gstack-industrial。

---

## 快速開始

### 安裝（2 分鐘）

```bash
# 1. 下載
git clone https://github.com/kevintseng/gstack-industrial.git
cd gstack-industrial

# 2. 自動安裝
bun install
```

安裝腳本會自動：
- 複製 skill-router 到 `~/.claude/skills/templates/skill-router/`
- 複製 hooks 到 `~/.claude/hooks/`
- 掃描所有已安裝的 skills，建立路由規則
- 註冊 UserPromptSubmit hook（自動建議）
- 註冊 SessionStart hook（自動發現新 skills）
- 建立預設設定檔

安裝是冪等的——重複執行不會產生重複的 hook。

### 更新

```bash
git pull
bun install
```

安裝腳本是冪等的——重新執行會用最新版本覆蓋已安裝的檔案、合併新的設定欄位（保留你的設定），並跳過已存在的 hook 註冊。

### 使用方式

**自動模式**（推薦）：什麼都不用做，Claude 會在適當時機自動建議。

**手動測試**：

```bash
cd ~/.claude/skills/templates/skill-router
bun run test-cli.ts "我要 review 程式碼" --debug
```

---

## Auto-Discovery（v1.1.0 新功能）

每次 Claude Code session 啟動時，auto-discover 會自動掃描 `~/.claude/skills/` 下所有 SKILL.md 檔案：

1. **解析 frontmatter** — 讀取 `name` 和 `description` 欄位
2. **提取關鍵字** — 從 description 中提取觸發詞（引號短語、slash commands、關鍵術語）
3. **推斷階段** — 根據描述判斷適用的開發階段（think/plan/build/review/test/ship）
4. **合併到 matchers.json** — 新 skills 自動加入，手動撰寫的規則不會被覆蓋

**特性：**
- 去重：同名 skill 來自多個來源時，優先保留 gstack > plugin > standalone
- 冪等：重複執行不會產生重複 entries
- 手動規則保護：有 `autoDiscovered: true` 標記區分自動和手動規則
- 1 小時冷卻：避免每次 session resume 都重新掃描

**手動觸發：**

```bash
# 掃描並更新
bun run discover

# 預覽（不寫入）
bun run discover:dry
```

---

## 它怎麼知道該建議什麼？

**Smart Router 分析：**

1. **你說的話** — 「brainstorm」→ 建議 brainstorming skill
2. **專案狀態** — 有未提交的檔案 → 建議 code review
3. **開發階段** — 說「準備 merge」→ 建議 finishing-branch skill
4. **Repo 模式** — Solo dev 用較低門檻（60），collaborative 用較高門檻（85）
5. **你的歷史** — 提升你常接受的 skill 優先級，降低你常拒絕的
6. **Skill 模式** — 根據你過去的序列預測下一個 skill（透過 gstack timeline）

**評分模型：**
- 關鍵字匹配：每個 +50 分
- Regex 匹配：+75 分
- 階段匹配：+100 分
- Git 狀態：+30 分
- 檔案模式：每個 +40 分
- 回饋加成/懲罰：來自使用歷史

**不會煩你的機制：**
- 冷卻時間：5 分鐘內不重複建議
- Session 上限：每個 session 最多 500 個建議（達到上限時顯示可見警告）
- 同個 skill 不會連續建議 3 次
- 回饋驅動：被你拒絕的 skill 優先級會逐步降低

---

## 進階設定（選用）

預設已經可以用，但你可以調整：

**關閉某些 skills 的建議：**
編輯 `~/.claude/config/skill-router.json`：
```json
{
  "disabledSkills": ["skill-judge"]
}
```

**設定安靜時間（晚上不打擾）：**
```json
{
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00"
  }
}
```

**提升特定 skill 的優先級：**
```json
{
  "priorityBoosts": {
    "brainstorming": 20,
    "systematic-debugging": 15
  }
}
```

**調整 repo 模式門檻：**
```json
{
  "repoModeThresholds": {
    "solo": 60,
    "collaborative": 85,
    "unknown": 80
  }
}
```

**調整回饋敏感度：**
```json
{
  "feedbackBoost": 20,
  "feedbackPenalty": 30,
  "showLimitWarnings": true
}
```

詳細說明：[INSTALL.md](INSTALL.md)

---

## 檔案結構

```
gstack-industrial/
├── skill-router/
│   ├── auto-discover.ts          # 自動掃描 SKILL.md → matchers.json
│   ├── matchers.json             # 路由規則（手動 + 自動）
│   ├── matcher-engine.ts         # 評分引擎
│   ├── context-extractor.ts      # 上下文提取
│   ├── types.ts                  # 型別定義
│   ├── index.ts                  # 路由入口
│   ├── gen-skill-docs.ts         # 模板生成器
│   ├── suggestion-formatter.ts   # 建議格式化 + XML 上下文注入
│   └── test-cli.ts               # CLI 測試工具
├── hooks/
│   ├── skill-router-before-message.ts    # UserPromptSubmit hook
│   └── skill-discovery-session-start.sh  # SessionStart hook
├── standard-sections/            # 共用模板 sections
├── install.ts                    # 安裝腳本
├── package.json
└── README.md
```

---

## 移除

```bash
# 移除已安裝的檔案
rm -rf ~/.claude/skills/templates/skill-router
rm ~/.claude/skills/templates/*-section.md
rm ~/.claude/hooks/skill-router-before-message.ts
rm ~/.claude/hooks/skill-discovery-session-start.sh
rm ~/.claude/config/skill-router.json
rm ~/.claude/sessions/skill-router-state.json
rm ~/.claude/sessions/skill-router-feedback.json
rm ~/.claude/state/skill-discovery-last-run

# 手動編輯 ~/.claude/settings.json 移除相關 hooks
```

---

## 參與貢獻

歡迎提交 PR！流程：

1. Fork 這個 repo
2. 建立 feature branch
3. 測試你的改動
4. 提交 PR

詳見 [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 授權

MIT License - 詳見 [LICENSE](LICENSE)

---

## 致謝

- **[Garry Tan](https://github.com/garrytan)** — gstack 原創哲學
- **[Claude Code](https://claude.ai/code)** — 整合平台
- **[Anthropic Prompt Engineering](https://www.anthropic.com)** — 驅動建議品質的 6 元素框架
