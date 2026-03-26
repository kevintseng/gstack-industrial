# gstack-industrial

> [English](README.md) | **繁體中文** | [日本語](README.ja.md)

**讓 Claude Code 自動幫你選對工具**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)

---

## 這是什麼？

你裝了上百個 Claude Code skills，但從來記不住該用哪個？

**gstack-industrial** 幫你解決這個問題：

- **自動發現** — 掃描所有已安裝的 SKILL.md，自動建立路由規則
- **自動建議** — 根據你的訊息和專案狀態，推薦最適合的 skill
- **模板系統** — 一次寫好標準，自動套用到所有 skills
- **零干擾** — 只在真正有用的時候才提示，不會煩你

---

## 與原版 gstack 的差異

| 原版 gstack | gstack-industrial |
|-------------|-------------------|
| 提供 28 個 skills | ✅ **自動路由**到任何已安裝的 skill |
| 需要自己記得用哪個 skill | ✅ **自動建議**最適合的 skill |
| 手動安裝 skill 後需自行記憶 | ✅ **Session 啟動時自動掃描**新 skill |
| - | ✅ 防煩人機制（冷卻時間、次數限制）|
| - | ✅ 模板系統（標準 section 共用）|

**簡單說**：gstack 提供 skills，gstack-industrial 幫你自動化發現和路由

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

### 使用方式

**自動模式**（推薦）：什麼都不用做，Claude 會在適當時機自動建議

```
你說："我需要思考一下這個功能要怎麼做"
Claude 自動回應：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 建議使用 @brainstorming
   用結構化思考整理想法
   (回答 "yes" 執行，或 "stop suggesting" 關閉)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

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
4. **分數門檻** — 只有分數 >= 80 的 skill 才會被建議

**不會煩你的機制：**
- 5 分鐘內不重複建議
- 每次對話最多 10 個建議
- 同個 skill 不會連續建議 3 次

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
│   ├── suggestion-formatter.ts   # 建議格式化
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
