# Template System Guide

> **繁體中文** | [English](#english-version)

## 什麼是模板系統？

模板系統讓你用 **placeholders** 自動生成 Claude Code skills，不用手動複製貼上標準段落。

### 問題

傳統做法：
```markdown
<!-- skill-a/SKILL.md -->
# Skill A
[手動複製 universal preamble 內容...]
[手動複製 askuserquestion standard...]
[手動複製 completeness principle...]
```

當你有 168 個 skills 時：
- ❌ 每次更新標準段落要手動改 168 個檔案
- ❌ 容易不一致（有些忘了更新）
- ❌ 無法強制執行標準

### 解決方案

使用模板：
```markdown
<!-- skill-a/SKILL.md.tmpl -->
# Skill A
{{UNIVERSAL_PREAMBLE_BLOCK}}
{{ASKUSERQUESTION_STANDARD_BLOCK}}
{{COMPLETENESS_PRINCIPLE_BLOCK}}
```

執行生成：
```bash
bun run gen-skill-docs.ts --skill skill-a
```

結果：自動替換 placeholders → 生成完整的 `SKILL.md`

---

## 使用方式

### 1. 建立模板檔案

建立 `~/.claude/skills/my-skill/SKILL.md.tmpl`：

```markdown
---
name: my-skill
description: My awesome skill
---

# My Skill

{{UNIVERSAL_PREAMBLE_BLOCK}}

## What this skill does

[Your skill logic here]

## When to use

Use when:
- Condition A
- Condition B

{{ASKUSERQUESTION_STANDARD_BLOCK}}

{{COMPLETENESS_PRINCIPLE_BLOCK}}
```

### 2. 執行生成

```bash
cd ~/.claude/skills/templates
bun run skill-router/gen-skill-docs.ts --skill my-skill
```

### 3. 驗證結果

```bash
cat ~/.claude/skills/my-skill/SKILL.md
# 檢查 placeholders 是否已替換
```

---

## 可用的 Placeholders

### `{{UNIVERSAL_PREAMBLE_BLOCK}}`

**來源**: `standard-sections/universal-preamble-section.md`

**內容**:
- Session awareness（知道並行工作數量）
- Auto branch detection（自動偵測 git branch）
- ELI16 mode（簡化說明模式）
- Analytics tracking（skill 使用統計）

**使用時機**: 每個 skill 的開頭（必須）

### `{{ASKUSERQUESTION_STANDARD_BLOCK}}`

**來源**: `standard-sections/askuserquestion-standard-section.md`

**內容**:
- 四段式提問格式（Re-ground / Problem / Recommendation / Options）
- Completeness scores（完整度評分）
- 人類 vs AI 時間估計

**使用時機**: 當 skill 需要詢問用戶選擇時

### `{{COMPLETENESS_PRINCIPLE_BLOCK}}`

**來源**: `standard-sections/completeness-principle-section.md`

**內容**:
- gstack "Boil the ocean" 原則
- AI 讓完整度成本趨零
- 決策框架（< 100 LOC AND < 30 min → 選完整版）
- Effort Compression 參考表

**使用時機**: 當 skill 需要在「快速」vs「完整」之間做選擇時

---

## 進階功能

### Watch Mode（監看模式）

自動監看 template 變更並重新生成：

```bash
bun run gen-skill-docs.ts --watch
```

當你編輯任何 `.tmpl` 檔案或 `standard-sections/` 時，自動重新生成所有 skills。

### Check Mode（驗證模式）

驗證所有 template-based skills 是否同步：

```bash
bun run gen-skill-docs.ts --check
```

輸出：
```
✅ All template-based skills in sync (12 skills)
```

或：
```
❌ Out of sync:
  - skill-a (SKILL.md older than SKILL.md.tmpl)
  - skill-b (missing SKILL.md)
```

### 生成特定 Skill

只生成一個 skill：

```bash
bun run gen-skill-docs.ts --skill my-skill
```

### 生成所有 Skills

掃描所有子目錄並生成：

```bash
bun run gen-skill-docs.ts
```

---

## CI Integration

在 GitHub Actions 中驗證：

```yaml
name: Validate Templates

on: [push, pull_request]

jobs:
  check-templates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Check template sync
        run: |
          cd ~/.claude/skills/templates
          bun run skill-router/gen-skill-docs.ts --check
```

如果有 skill 沒同步，CI 會失敗 → 強制執行標準。

---

## 最佳實踐

### 1. Template 檔案命名

- ✅ `SKILL.md.tmpl` — 標準命名
- ❌ `skill.template.md` — 不會被偵測

### 2. Placeholder 格式

- ✅ `{{PLACEHOLDER_NAME}}` — 大寫 + 底線
- ❌ `{placeholder}` — 單大括號不會替換
- ❌ `{{ PLACEHOLDER }}` — 空格會導致失敗

### 3. 版本控制

**DO commit**:
- ✅ `SKILL.md.tmpl` — 模板檔案
- ✅ `standard-sections/*.md` — 標準段落

**DON'T commit**:
- ❌ `SKILL.md` — 生成檔案（應該從 tmpl 重新生成）

在 `.gitignore` 加入：
```gitignore
**/SKILL.md
!**/SKILL.md.tmpl
```

### 4. 更新流程

當標準段落變更時：

```bash
# 1. 編輯標準段落
vim standard-sections/universal-preamble-section.md

# 2. 重新生成所有 skills
bun run gen-skill-docs.ts

# 3. 驗證
bun run gen-skill-docs.ts --check

# 4. Commit
git add standard-sections/universal-preamble-section.md
git commit -m "docs: update universal preamble"
```

---

## 故障排除

### "Template not found"

**錯誤**: `Template file not found: /path/to/SKILL.md.tmpl`

**解決**: 確認檔名是 `SKILL.md.tmpl`（不是 `skill.md.tmpl` 或其他）

### "Placeholder not replaced"

**錯誤**: 生成的 SKILL.md 仍包含 `{{PLACEHOLDER}}`

**原因**: Placeholder 名稱錯誤或標準段落檔案不存在

**檢查**:
```bash
ls -la ~/.claude/skills/templates/standard-sections/
# 確認檔案存在且有內容
```

### "Permission denied"

**錯誤**: `EACCES: permission denied`

**解決**:
```bash
chmod +x ~/.claude/skills/templates/skill-router/gen-skill-docs.ts
```

---

## API Reference

### `gen-skill-docs.ts` CLI

```bash
bun run gen-skill-docs.ts [options]
```

**Options**:
- `--skill <name>` — 只生成指定的 skill
- `--watch` — Watch mode（自動重新生成）
- `--check` — 驗證 sync 狀態（不生成）
- `--help` — 顯示幫助

**Exit codes**:
- `0` — 成功
- `1` — 生成失敗或 sync 驗證失敗

---

<a name="english-version"></a>
## English Version

[Coming soon - translate the above content to English]

---

## See Also

- [Skill Router Guide](SKILL_ROUTER.md)
- [Creating Matchers](CREATING_MATCHERS.md)
- [Original gstack](https://github.com/garrytan/gstack)
