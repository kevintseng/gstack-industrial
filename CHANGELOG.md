# Changelog

All notable changes to gstack-industrial.

## [1.3.0] - 2026-04-30 — Prompt Engineering, gstack Sync, i18n, Security

gstack-industrial suggestions are now built on Anthropic's internal prompt engineering framework. When you say "yes", Claude receives a structured XML context block — not just a skill name. Each suggestion tells Claude *who* to be, *what context* it was made in, and *how* to execute — reducing the need to explain yourself twice.

Also in this release: auto-discovery now reads `triggers:` and `preamble-tier:` directly from gstack's SKILL.md frontmatter (more accurate than keyword heuristics), 8 new gstack skill matchers, fully localized UI across 8 languages, and a security fix removing private skill names from the public repo.

### Added

- **Confidence labels.** Suggestions now display `強烈建議` / `建議` / `可能適用` based on match score (≥200 / ≥120 / ≥80), so you can calibrate how strongly to heed the suggestion.
- **Evidence line.** Each suggestion shows which signals triggered it (e.g., `根據：keywords: brainstorm • phase: think`), so you understand *why* it was suggested.
- **Context snapshot injection.** When you accept a suggestion ("yes"), Claude receives the context *at the time the suggestion was made* — branch, phase, git status, uncommitted files, time since last commit. This is the time-of-capture vs time-of-use pattern: the snapshot preserves WHY the suggestion was relevant.
- **Execution hints.** Matchers now carry static guidance (e.g., "Run 3+ alternatives before settling on one"), combined with dynamic runtime hints (changed files list, time since last commit, phase-specific advice). Injected into Claude's context on accept.
- **Role definition injection.** Matchers can define `roleContext` (e.g., "rigorous code reviewer with security-first mindset"). This is injected as `<role>` in the XML block when you accept, priming Claude for the specific posture the skill requires.
- **XML-structured context injection.** When you say "yes", Claude receives a `<skill-invocation>` XML block with `<skill>`, `<role>`, `<context>`, `<execution-hints>`, and `<instruction>` — per Anthropic's recommendation for reducing ambiguity between role, context, and instruction.
- **New suggestion format.** Bordered display (━━━) with confidence label, explanation, evidence line, and contextual hints. Consistent with a mini-card UX.
- **Locale-aware suggestion UI.** Suggestion output now renders in the user's system language (EN, zh-TW, zh-CN, ja, ko, pt-BR, id, vi). Confidence labels, evidence prefix, and call-to-action are fully translated.
- **Auto-discovery reads gstack frontmatter.** `auto-discover.ts` now parses `triggers:` (YAML list) and `preamble-tier:` from SKILL.md frontmatter. Explicit triggers are preferred over heuristic keyword extraction — more accurate routing with less false positives.
- **`preamble-tier: 1` priority boost.** Skills marked as gstack core skills receive a +1 priority boost in auto-discovery, ensuring fundamental skills are suggested before extended ones.
- **8 new matchers for gstack skills:** `scrape`, `skillify`, `landing-report`, `learn`, `canary`, `land-and-deploy`, `health`, `plan-tune`. Includes regex triggers for natural-language phrases.

### Changed

- `formatSuggestion()` now always shows evidence (previously conditional). Evidence is strictly better than none.
- `SkillMatcher` and `SkillMatch` types extended with `executionHints?: string[]` and `roleContext?: string`.
- `SavedContext` interface added — snapshot preserved in session state and restored on "yes".
- Six built-in matchers (`brainstorming`, `writing-plans`, `sa:comprehensive-code-review`, `systematic-debugging`, `verification-before-completion`, `finishing-a-development-branch`) now include `roleContext` and `executionHints`.
- Auto-discovery prefers frontmatter `triggers:` over heuristic keyword extraction when available.
- `parseFrontmatter()` extended to handle YAML list syntax (`key:\n  - item`), required to read gstack's `triggers:` field.
- `SUPPORTED_LOCALES` is now a single export from `suggestion-formatter.ts`; `context-extractor.ts` imports it instead of maintaining its own copy.

### Fixed

- Hook: `router.getContext()` was called inside the try block AND outside, causing context to be captured twice. Now captured once before the try block.
- Hook: `import type { SavedContext }` used relative path that breaks when hook is deployed to `~/.claude/hooks/`. Fixed by defining `SavedContext` inline in the hook file.
- `learn` matcher: scored below `verification-before-completion` on clean branches (125 vs 130); added `gitStatus: clean` to lift intent score above context noise (now 155).
- `scrape` matcher: only scored +50 (keyword) in "ship" phase, below the 80 threshold; added `regex: \bscrape\b` for phase-independent triggering (now 125).
- `canary` matcher: only scored +50 in non-ship phases (below threshold); added `regex: \bcanary\b` for phase-independent triggering.
- `health` matcher: only scored +50 in non-review/think phases (below threshold); added regex for phase-independent triggering.
- `parseFrontmatter`: `fm.description as string` was unsafe if a SKILL.md used a list for `description`; now guarded with `typeof` check.
- `preamble-tier` parsing: `parseInt()` could return `NaN` for invalid values; now coerced to `undefined`.

### Security

- Removed 159 auto-discovered private skill names from `matchers.json` in the public repo. Only the 28 hand-curated seed entries are committed. Auto-discovered entries are machine-local and must not be committed.

### Documentation

- Comprehensive README overhaul: clearer pain opener, prerequisites section, corrected install command (`bun run install`, not `bun install`), explicit testing examples, and removed internal file structure section.
- Added 5 new language READMEs: Simplified Chinese (zh-CN), Korean (ko), Brazilian Portuguese (pt-BR), Indonesian (id), Vietnamese (vi).
- Fixed `bun install` → `bun run install` in all 8 READMEs and INSTALL.md (`bun install` invokes bun's package manager; `bun run install` runs the project's install script).
- Localized confidence labels and demo blocks in all language READMEs.

## [1.2.0] - 2026-04-04 — Learning, Repo-Mode Awareness, Visible Warnings

gstack-industrial now learns from your usage. When you accept a suggestion, it remembers that pair — next time you accept the first skill, it predicts the next one. When you dismiss a suggestion, that skill gets penalized. Plus: repo-mode aware thresholds (lower for solo devs), visible warnings when limits hit (no more silent failure), and cleaner integration with gstack (reuses `gstack-repo-mode` and `timeline.jsonl` instead of duplicating).

### Added

- **Usage feedback loop.** Tracks accept/dismiss per skill in `~/.claude/sessions/skill-router-feedback.json` (local only). After 3+ interactions, boosts priority for accepted skills, penalizes dismissed ones. Tunable via `feedbackBoost` and `feedbackPenalty` config.
- **Pair learning.** Reads gstack's `timeline.jsonl` to detect skill sequences (e.g., `brainstorming → writing-plans → executing-plans`). After you accept a skill, the predicted next skill gets a strong priority boost. Shows "(based on your pattern)" hint.
- **Repo-mode aware thresholds.** Uses `gstack-repo-mode` binary to detect solo vs collaborative repos. Default thresholds: solo=60 (more proactive), collaborative=85 (less noise), unknown=80. Tunable via `repoModeThresholds` config.
- **Visible limit warnings.** When suggestion limit is hit, shows a warning instead of silently exiting. Tunable via `showLimitWarnings`.
- **Config migration.** `install.ts` now adds missing fields to existing configs on reinstall (no more manual upgrades).

### Changed

- **Default `maxSuggestionsPerSession`: 10 → 500.** The cooldown is the real throttle. 10 was too low for long dev sessions, causing silent failures.
- **Reuse gstack infrastructure.** Repo mode detection and skill sequences now come from gstack, not duplicated here. gstack-industrial is an enhancement layer on top of gstack.
- **Privacy-first messaging.** README emphasizes local-only state, no telemetry.

### Fixed

- **Silent failure when limit reached.** Previously, hitting `maxSuggestionsPerSession` would silently stop suggestions with no notification. Now shows a visible warning with the config path.

## [1.1.1] - 2026-03-26

- Session state reset and doc cleanup

## [1.1.0] - 2026-03-26

- **Auto-Discovery.** Scans all installed SKILL.md files on session start, builds routing rules automatically. Manually-written rules are protected via `autoDiscovered: true` flag.

## [1.0.0] - 2026-03-19

- Initial release
- Skill router with smart matching
- UserPromptSubmit hook for auto-suggestions
- Anti-spam mechanisms (cooldown, session caps)
- Template system with shared standard sections
