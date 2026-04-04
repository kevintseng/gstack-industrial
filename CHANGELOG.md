# Changelog

All notable changes to gstack-industrial.

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
