#!/bin/bash
# skill-discovery-session-start.sh
#
# SessionStart hook — resets session state and runs auto-discover.
# Designed to be fast (<1s) and silent on success.

ROUTER_DIR="$HOME/.claude/skills/templates/skill-router"
AUTO_DISCOVER="$ROUTER_DIR/auto-discover.ts"
LAST_RUN_FILE="$HOME/.claude/state/skill-discovery-last-run"
SESSION_STATE="$HOME/.claude/sessions/skill-router-state.json"

# Reset skill-router session state on every new session
if [ -f "$SESSION_STATE" ]; then
  cat > "$SESSION_STATE" << 'RESET'
{"suggestionsCount":0,"lastSuggestionTime":0,"lastSuggestedSkill":null,"disabledThisSession":false,"suggestionHistory":[]}
RESET
fi

# Only run auto-discover if it exists
[ -f "$AUTO_DISCOVER" ] || exit 0

# Rate limit: skip if last run was <1 hour ago
if [ -f "$LAST_RUN_FILE" ]; then
  last_run=$(cat "$LAST_RUN_FILE" 2>/dev/null || echo 0)
  now=$(date +%s)
  elapsed=$(( now - last_run ))
  if [ "$elapsed" -lt 3600 ]; then
    exit 0
  fi
fi

# Run auto-discover silently
bun run "$AUTO_DISCOVER" >/dev/null 2>&1

# Update last run timestamp
mkdir -p "$(dirname "$LAST_RUN_FILE")"
date +%s > "$LAST_RUN_FILE"
