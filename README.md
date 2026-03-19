# gstack-industrial

> [English](README.en.md) | **繁體中文**

**讓 Claude Code 自動幫你選對工具**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)

---

## 💡 這是什麼？

你有 168 個 Claude Code skills，但從來記不住該用哪個？

**gstack-industrial** 幫你解決這個問題：

🤖 **自動建議** — 根據你的訊息和專案狀態，自動推薦最適合的 skill
📝 **模板系統** — 一次寫好標準，自動套用到所有 skills
⚡ **零干擾** — 只在真正有用的時候才提示，不會煩你

---

## 📊 與原版 gstack 的差異

| 原版 gstack | gstack-industrial |
|-------------|-------------------|
| 提供 3 個範本檔案 | ✅ **自動生成** skills（不用手動複製貼上）|
| 需要自己記得用哪個 skill | ✅ **自動建議**最適合的 skill |
| 手動更新所有 skills | ✅ 改一次範本，**一鍵更新**全部 |
| - | ✅ 防煩人機制（冷卻時間、次數限制）|

**簡單說**：gstack 提供標準，gstack-industrial 幫你自動化執行

---

## 🚀 快速開始

### 安裝（2 分鐘）

```bash
# 1. 下載
git clone https://github.com/kevintseng/gstack-industrial.git
cd gstack-industrial

# 2. 自動安裝
bun install
# 自動複製到 ~/.claude/ 目錄
```

完成！重啟 Claude Code 就能用。

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

**手動測試**：想看看它怎麼工作？

```bash
cd ~/.claude/skills/templates/skill-router
bun run test-cli.ts "我要 review 程式碼" --debug
```

---

## 🔍 它怎麼知道該建議什麼？

**Smart Router 會分析：**

1. **你說的話** — 「brainstorm」→ 建議 brainstorming skill
2. **專案狀態** — 有未提交的檔案 → 建議 code review
3. **開發階段** — 說「準備 merge」→ 建議 finishing-branch skill

**不會煩你的機制：**
- 5 分鐘內不重複建議
- 每次對話最多 10 個建議
- 同個 skill 不會連續建議 3 次

---

## ⚙️ 進階設定（選用）

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

詳細說明：[INSTALL.md](INSTALL.md)

---

## 📚 延伸閱讀

- **[安裝指南](INSTALL.md)** — 完整安裝步驟與問題排解
- **[原版 gstack](https://github.com/garrytan/gstack)** — 了解背後的哲學

---

## 🤝 參與貢獻

歡迎提交 PR！流程：

1. Fork 這個 repo
2. 建立 feature branch
3. 測試你的改動
4. 提交 PR

---

## 📜 授權

MIT License - 詳見 [LICENSE](LICENSE)

---

## 🙏 致謝

- **[Garry Tan](https://github.com/garrytan)** — gstack 原創哲學
- **[Claude Code](https://claude.ai/code)** — 整合平台

---

**用 ❤️ 為 Claude Code 社群打造**
