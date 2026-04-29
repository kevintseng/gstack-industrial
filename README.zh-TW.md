<div align="center">

# gstack-industrial

**對的時機，自動推薦最適合的 Claude Code skill**

*建立在 [gstack](https://github.com/garrytan/gstack) 之上的增強層。需要先安裝 gstack。*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/v/release/kevintseng/gstack-industrial?style=for-the-badge&color=blue)](https://github.com/kevintseng/gstack-industrial/releases)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-D97757?style=for-the-badge)](https://claude.ai/code)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?style=for-the-badge&logo=bun)](https://bun.sh)

[![Stars](https://img.shields.io/github/stars/kevintseng/gstack-industrial?style=social)](https://github.com/kevintseng/gstack-industrial/stargazers)
[![Issues](https://img.shields.io/github/issues/kevintseng/gstack-industrial)](https://github.com/kevintseng/gstack-industrial/issues)

[**English**](README.md) | [**繁體中文**](README.zh-TW.md) | [**简体中文**](README.zh-CN.md) | [**日本語**](README.ja.md) | [**한국어**](README.ko.md) | [**Português**](README.pt-BR.md) | [**Bahasa**](README.id.md) | [**Tiếng Việt**](README.vi.md)

</div>

---

你裝了幾十個 Claude Code skills，卻永遠記不住哪個情境該用哪個？

**gstack-industrial** 監看你傳送的每則訊息，在對的時機主動建議最相關的 skill。說「yes」後 Claude 就收到完整準備好的上下文：要扮演什麼角色、建議當下的專案狀態、以及如何執行。

---

## 建議長這樣

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
(說「yes」執行，或「stop suggesting」關閉建議)
```

說 **「yes」** 後 Claude 會收到結構化簡報：

```xml
<skill-invocation>
  <skill>brainstorming</skill>
  <role>You are a structured brainstorming facilitator...</role>
  <context>
    <branch>feature/auth-redesign</branch>
    <phase>think</phase>
    <git-status>dirty</git-status>
    <uncommitted-files>src/auth.ts, src/session.ts (+2 更多)</uncommitted-files>
    <last-commit>47 minutes ago</last-commit>
  </context>
  <execution-hints>
    <hint>先探索問題空間，不要急著提出解決方案</hint>
    <hint>在評估任何方案前先生成 3 個以上的替代方案</hint>
    <hint>47 分鐘沒有 commit — 考慮 checkpoint</hint>
  </execution-hints>
  <instruction>現在執行 @brainstorming skill，使用上方的上下文聚焦執行。</instruction>
</skill-invocation>
```

Claude 知道該做什麼，不需要再解釋一遍。

---

## 功能特色

- **自動發現** — 掃描所有已安裝的 SKILL.md，自動建立路由規則
- **上下文感知** — 根據你的訊息文字、git 狀態、開發階段、使用歷史匹配
- **校準信心標籤** — `強烈建議` / `建議` / `可能適用`，讓你知道採納強度
- **完整上下文注入** — 說「yes」後傳送結構化 XML 簡報（角色 + 專案快照 + 執行提示）
- **從使用中學習** — 提升你接受的 skill，降低你拒絕的 skill 優先級
- **零垃圾訊息** — 5 分鐘冷卻、500 個 session 上限、同 skill 不連續建議 3 次
- **多語言介面** — 建議以你的語言呈現（自動偵測系統 locale）
- **完全本地** — 無 telemetry、無網路呼叫，所有狀態在 `~/.claude/`

---

## 前置條件

**需要先安裝 gstack：**

```bash
cd ~/.claude/skills
git clone https://github.com/garrytan/gstack.git
cd gstack && ./setup
```

也需要 [Bun](https://bun.sh) >= 1.0.0：

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## 安裝（2 分鐘）

```bash
# 1. 下載
git clone https://github.com/kevintseng/gstack-industrial.git
cd gstack-industrial

# 2. 安裝
bun run install
```

安裝腳本會自動：

- 複製 skill-router 到 `~/.claude/skills/templates/skill-router/`
- 複製 hooks 到 `~/.claude/hooks/`
- 掃描你已安裝的 skills 並建立路由規則
- 註冊 `UserPromptSubmit` hook（每則訊息自動建議）
- 註冊 `SessionStart` hook（每次 session 重新整理路由規則）
- 建立預設設定檔 `~/.claude/config/skill-router.json`

**冪等** — 安全重複執行。

### 更新

```bash
git pull
bun run install
```

---

## 它怎麼知道該建議什麼？

每則訊息分析六個訊號：

| 訊號 | 範例 |
|------|------|
| **你說的話** | 「brainstorm」→ 建議 `/brainstorming` |
| **Git 狀態** | 7 個未提交檔案 → 建議 code review |
| **開發階段** | 「準備 merge」→ 建議 `/ship` |
| **Repo 模式** | Solo 專案用較低門檻（60）；團隊用較高（85） |
| **你的歷史** | 常接受 `/qa` → 它的分數持續上升 |
| **Skill 序列** | `/ship` 後預測你可能需要 `/document-release` |

**評分模型：**

```
關鍵字匹配      每個 +50 分
Regex 匹配      +75 分
階段匹配        +100 分
Git 狀態        +30 分
檔案模式        每個 +40 分
回饋歷史        ±自訂
─────────────────────────────
顯示門檻：80（可調整）
```

---

## 與 gstack 的關係

gstack-industrial 是 **gstack 的上層加強**，不是取代：

| gstack 提供 | gstack-industrial 加上 |
|------------|----------------------|
| 36+ skills（`/ship`、`/review`、`/qa` 等） | **在對的時機自動建議** |
| `gstack-repo-mode`（solo/collaborative 偵測） | **Repo 模式感知門檻** |
| `timeline.jsonl`（skill 完成追蹤） | **序列預測**（讀 gstack timeline） |
| 手動呼叫 skill | **主動建議** 透過 UserPromptSubmit hook |

---

## Auto-Discovery

每次 session 啟動，自動掃描 `~/.claude/skills/` 下所有 SKILL.md：

1. **解析 frontmatter** — 讀取 `name` 和 `description`
2. **提取關鍵字** — 從 description 提取觸發詞
3. **推斷開發階段** — think/plan/build/review/test/ship
4. **合併路由規則** — 新 skills 自動加入，手動規則永不覆蓋

**手動觸發：**

```bash
# 掃描並更新
bun run discover

# 預覽（不寫入）
bun run discover:dry
```

---

## 設定（選用）

預設即可使用。編輯 `~/.claude/config/skill-router.json` 自訂：

**關閉特定 skill 的建議：**
```json
{ "disabledSkills": ["skill-judge"] }
```

**安靜時間（晚上不打擾）：**
```json
{
  "quietHours": { "enabled": true, "start": "22:00", "end": "08:00" }
}
```

**提升特定 skill 優先級：**
```json
{
  "priorityBoosts": { "brainstorming": 20, "systematic-debugging": 15 }
}
```

**語言設定**（預設自動偵測系統 locale）：
```json
{ "lang": "zh-TW" }
```

支援：`en`、`zh-TW`、`zh-CN`、`ja`、`ko`、`pt-BR`、`id`、`vi`

**調整 repo 模式門檻：**
```json
{
  "repoModeThresholds": { "solo": 60, "collaborative": 85, "unknown": 80 }
}
```

詳細說明：[INSTALL.md](INSTALL.md)

---

## 測試

```bash
cd ~/.claude/skills/templates/skill-router

# 基本測試
bun run test-cli.ts "我要 review 程式碼"

# 顯示上下文除錯資訊
bun run test-cli.ts "所有測試通過，準備 merge" --debug

# 看多個建議
bun run test-cli.ts "測試掛了" --multi
```

---

## 移除

```bash
rm -rf ~/.claude/skills/templates/skill-router
rm ~/.claude/skills/templates/*-section.md
rm ~/.claude/hooks/skill-router-before-message.ts
rm ~/.claude/hooks/skill-discovery-session-start.sh
rm ~/.claude/config/skill-router.json
rm ~/.claude/sessions/skill-router-state.json
rm ~/.claude/state/skill-discovery-last-run
# 然後編輯 ~/.claude/settings.json 移除兩個 hook 條目
```

---

## 參與貢獻

歡迎提交 PR。詳見 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 授權

MIT — 詳見 [LICENSE](LICENSE)

---

## 致謝

- **[Garry Tan](https://github.com/garrytan)** — gstack 哲學與原始基礎設施
- **[Claude Code](https://claude.ai/code)** — 整合平台
- **[Anthropic](https://www.anthropic.com)** — 驅動建議品質的 6 元素 prompt engineering 框架
