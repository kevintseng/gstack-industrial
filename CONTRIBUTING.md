# Contributing to gstack-industrial

> **繁體中文** | [English](#english-version)

感謝你對 gstack-industrial 的興趣！我們歡迎各種形式的貢獻。

---

## 🤝 如何貢獻

### 回報 Bug

發現 bug 了嗎？

1. 檢查 [Issues](https://github.com/kevintseng/gstack-industrial/issues) 看是否已有人回報
2. 如果沒有，開一個新 issue 並提供：
   - **描述**: 發生了什麼？
   - **重現步驟**: 如何重現？
   - **預期行為**: 應該發生什麼？
   - **實際行為**: 實際發生了什麼？
   - **環境**: OS、Bun 版本、Claude Code 版本

### 建議功能

有好點子嗎？

1. 開一個 [Feature Request issue](https://github.com/kevintseng/gstack-industrial/issues/new)
2. 描述：
   - **問題**: 這個功能解決什麼問題？
   - **解決方案**: 你期望的功能是什麼？
   - **替代方案**: 有考慮過其他做法嗎？

### 提交 Pull Request

想貢獻程式碼？太好了！

1. Fork repository
2. 建立 feature branch (`git checkout -b feature/amazing-feature`)
3. 實作你的改動
4. 測試你的改動
5. Commit (`git commit -m 'feat: add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. 開 Pull Request

---

## 🏗️ 開發環境設定

### 前置需求

- [Bun](https://bun.sh) >= 1.0.0
- [Claude Code](https://claude.ai/code)
- Git

### 設定步驟

```bash
# 1. Fork & Clone
git clone https://github.com/<YOUR_USERNAME>/gstack-industrial.git
cd gstack-industrial

# 2. Install dependencies
bun install

# 3. Link to Claude Code
ln -s $(pwd)/skill-router ~/.claude/skills/templates/skill-router-dev
ln -s $(pwd)/standard-sections ~/.claude/skills/templates/standard-sections-dev
ln -s $(pwd)/hooks ~/.claude/hooks-dev

# 4. Test
bun run skill-router/test-cli.ts "test message" --debug
```

---

## 📝 Coding Standards

### TypeScript Style

- 使用 TypeScript strict mode
- 優先使用 `const`，避免 `var`
- 使用 interface 而非 type（除非必要）
- 明確的型別標註（不依賴推斷）

```typescript
// ✅ Good
const message: string = "Hello";
interface RouterContext {
  message: string;
  phase: Phase[];
}

// ❌ Bad
let message = "Hello";  // 使用 let
type RouterContext = {  // 應該用 interface
  message, phase        // 缺少型別
};
```

### 命名慣例

- **檔案**: `kebab-case.ts` (e.g., `matcher-engine.ts`)
- **Functions**: `camelCase` (e.g., `calculateMatchScore`)
- **Interfaces**: `PascalCase` (e.g., `RouterContext`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_THRESHOLD`)

### 註解

- 使用 JSDoc 註解 public functions
- 複雜邏輯加上解釋註解
- 不要註解顯而易見的程式碼

```typescript
/**
 * Calculates match score for a matcher.
 *
 * @param matcher - Skill matcher definition
 * @param ctx - Router context
 * @returns Match score (0-500)
 */
function calculateMatchScore(matcher: SkillMatcher, ctx: RouterContext): number {
  // 評分邏輯...
}
```

---

## 🧪 測試

### 執行測試

```bash
# 測試 router
bun run test-cli.ts "I need to brainstorm" --debug

# 測試 template generator
bun run gen-skill-docs.ts --check

# 測試 hook
cd ~/.claude/hooks
bun run skill-router-before-message.ts "test message"
```

### 測試檢查清單

在提交 PR 前確認：

- [ ] 基本功能測試通過
- [ ] Edge cases 測試通過
- [ ] Error handling 正確
- [ ] 沒有 TypeScript 錯誤
- [ ] 效能沒有明顯降低

---

## 📊 Commit Message Convention

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: 新功能
- `fix`: Bug 修復
- `docs`: 文件變更
- `style`: 格式調整（不影響程式碼）
- `refactor`: 重構（不是 feat 也不是 fix）
- `perf`: 效能改善
- `test`: 新增或修改測試
- `chore`: 雜項（build、CI、依賴更新等）

### Examples

```bash
git commit -m "feat(router): add quiet hours support"
git commit -m "fix(matcher): incorrect phase detection for 'test' keyword"
git commit -m "docs(readme): update installation instructions"
git commit -m "refactor(engine): simplify scoring algorithm"
```

---

## 🔀 Pull Request Process

### PR Title

使用與 commit message 相同的格式：

```
feat(router): add multi-language support
fix(matcher): handle empty message gracefully
```

### PR Description Template

```markdown
## Description

[描述這個 PR 做了什麼]

## Motivation

[為什麼需要這個改動？]

## Changes

- [ ] 改動 A
- [ ] 改動 B
- [ ] 改動 C

## Testing

[如何測試這個改動？]

## Checklist

- [ ] 程式碼遵循 coding standards
- [ ] 測試通過
- [ ] 文件已更新（如果需要）
- [ ] Commit messages 遵循 convention
```

### Review Process

1. **自動檢查**: CI 會執行 template sync 驗證
2. **Code review**: Maintainer 會 review 你的程式碼
3. **修改**: 根據 feedback 修改
4. **Merge**: 通過後 maintainer 會 merge

---

## 📚 文件

### 更新文件

當你的改動影響到文件時，請更新：

- **README.md** — 主要文件（English / zh-TW / ja）
- **INSTALL.md** — 安裝指南
- **docs/** — 詳細文件
  - `TEMPLATE_SYSTEM.md` — 模板系統
  - `SKILL_ROUTER.md` — Router 運作原理
  - `CREATING_MATCHERS.md` — 建立 matchers
  - `API.md` — API 參考

### 文件風格

- 使用清晰、簡潔的語言
- 提供範例程式碼
- 使用表格和清單增加可讀性
- 包含螢幕截圖（如果適用）

---

## 🏷️ Issue Labels

我們使用這些 labels：

| Label | 說明 |
|-------|------|
| `bug` | Bug 回報 |
| `enhancement` | 功能建議 |
| `documentation` | 文件改善 |
| `good first issue` | 適合新手的 issue |
| `help wanted` | 需要幫助 |
| `question` | 問題討論 |
| `wontfix` | 不會修復 |

---

## ❓ Questions?

有問題嗎？

- 開一個 [Discussion](https://github.com/kevintseng/gstack-industrial/discussions)
- 或在 [Issues](https://github.com/kevintseng/gstack-industrial/issues) 問問題

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

<a name="english-version"></a>
## English Version

Thank you for your interest in contributing to gstack-industrial! We welcome all forms of contributions.

---

## 🤝 How to Contribute

### Reporting Bugs

Found a bug?

1. Check [Issues](https://github.com/kevintseng/gstack-industrial/issues) to see if it's already reported
2. If not, open a new issue with:
   - **Description**: What happened?
   - **Steps to Reproduce**: How to reproduce?
   - **Expected Behavior**: What should happen?
   - **Actual Behavior**: What actually happened?
   - **Environment**: OS, Bun version, Claude Code version

### Suggesting Features

Have a great idea?

1. Open a [Feature Request issue](https://github.com/kevintseng/gstack-industrial/issues/new)
2. Describe:
   - **Problem**: What problem does this feature solve?
   - **Solution**: What's the expected feature?
   - **Alternatives**: Any alternative approaches considered?

### Submitting Pull Requests

Want to contribute code? Awesome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Implement your changes
4. Test your changes
5. Commit (`git commit -m 'feat: add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 🏗️ Development Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- [Claude Code](https://claude.ai/code)
- Git

### Setup Steps

```bash
# 1. Fork & Clone
git clone https://github.com/<YOUR_USERNAME>/gstack-industrial.git
cd gstack-industrial

# 2. Install dependencies
bun install

# 3. Link to Claude Code
ln -s $(pwd)/skill-router ~/.claude/skills/templates/skill-router-dev
ln -s $(pwd)/standard-sections ~/.claude/skills/templates/standard-sections-dev
ln -s $(pwd)/hooks ~/.claude/hooks-dev

# 4. Test
bun run skill-router/test-cli.ts "test message" --debug
```

---

[Rest of English version mirrors the Chinese content structure]

---

## 📞 Contact

Questions or need help?

- Open a [Discussion](https://github.com/kevintseng/gstack-industrial/discussions)
- Or ask in [Issues](https://github.com/kevintseng/gstack-industrial/issues)

---

**Thank you for contributing! 🎉**
