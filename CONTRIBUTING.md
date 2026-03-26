# Contributing to gstack-industrial

Thank you for your interest in gstack-industrial! We welcome all forms of contributions.

---

## How to Contribute

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

## Development Setup

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

# 3. Link to Claude Code (for development)
ln -s $(pwd)/skill-router ~/.claude/skills/templates/skill-router-dev
ln -s $(pwd)/standard-sections ~/.claude/skills/templates/standard-sections-dev
ln -s $(pwd)/hooks ~/.claude/hooks-dev

# 4. Test
bun run skill-router/test-cli.ts "test message" --debug
```

---

## Coding Standards

### TypeScript Style

- Use TypeScript strict mode
- Prefer `const` over `let`, never use `var`
- Prefer `interface` over `type` (unless necessary)
- Explicit type annotations (don't rely on inference)

```typescript
// Good
const message: string = "Hello";
interface RouterContext {
  message: string;
  phase: Phase[];
}

// Bad
let message = "Hello";
type RouterContext = {
  message, phase
};
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `matcher-engine.ts`)
- **Functions**: `camelCase` (e.g., `calculateMatchScore`)
- **Interfaces**: `PascalCase` (e.g., `RouterContext`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_THRESHOLD`)

### Comments

- Use JSDoc for public functions
- Add explanatory comments for complex logic
- Don't comment obvious code

```typescript
/**
 * Calculates match score for a matcher.
 *
 * @param matcher - Skill matcher definition
 * @param ctx - Router context
 * @returns Match score (0-500)
 */
function calculateMatchScore(matcher: SkillMatcher, ctx: RouterContext): number {
  // scoring logic...
}
```

---

## Testing

### Running Tests

```bash
# Test router
bun run skill-router/test-cli.ts "I need to brainstorm" --debug

# Test template generator
bun run skill-router/gen-skill-docs.ts --check

# Test auto-discovery
bun run discover:dry

# Test hook
cd ~/.claude/hooks
bun run skill-router-before-message.ts "test message"
```

### Pre-PR Checklist

Before submitting a PR:

- [ ] Basic functionality tests pass
- [ ] Edge cases tested
- [ ] Error handling is correct
- [ ] No TypeScript errors
- [ ] No significant performance regression

---

## Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting (no code change)
- `refactor`: Refactoring (not feat or fix)
- `perf`: Performance improvement
- `test`: Adding or modifying tests
- `chore`: Miscellaneous (build, CI, dependencies)

### Examples

```bash
git commit -m "feat(router): add quiet hours support"
git commit -m "fix(matcher): incorrect phase detection for 'test' keyword"
git commit -m "docs(readme): update installation instructions"
git commit -m "refactor(engine): simplify scoring algorithm"
```

---

## Pull Request Process

### PR Title

Use the same format as commit messages:

```
feat(router): add multi-language support
fix(matcher): handle empty message gracefully
```

### PR Description Template

```markdown
## Description

[What does this PR do?]

## Motivation

[Why is this change needed?]

## Changes

- [ ] Change A
- [ ] Change B
- [ ] Change C

## Testing

[How to test this change?]

## Checklist

- [ ] Code follows coding standards
- [ ] Tests pass
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow convention
```

### Review Process

1. **Automated checks**: CI runs template sync validation
2. **Code review**: Maintainer reviews your code
3. **Revisions**: Address feedback
4. **Merge**: Maintainer merges after approval

---

## Documentation

### Updating Docs

When your changes affect documentation, please update:

- **README.md** — Main documentation (English / zh-TW / ja)
- **INSTALL.md** — Installation guide
- **skill-router/README.md** — Router architecture and configuration

### Documentation Style

- Use clear, concise language
- Provide code examples
- Use tables and lists for readability
- Include screenshots where applicable

---

## Issue Labels

| Label | Description |
|-------|-------------|
| `bug` | Bug report |
| `enhancement` | Feature request |
| `documentation` | Documentation improvement |
| `good first issue` | Good for newcomers |
| `help wanted` | Help needed |
| `question` | Discussion |
| `wontfix` | Won't fix |

---

## Questions?

- Open a [Discussion](https://github.com/kevintseng/gstack-industrial/discussions)
- Or ask in [Issues](https://github.com/kevintseng/gstack-industrial/issues)

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
