#!/usr/bin/env bash
# PreToolUse guard: production deploys need a release authorization.
#
# PLAT-771. Development and staging deploys run unattended, and staging rehearses the
# rollback every time. Production is the irreversible one, so it stops here and waits for
# a named release manager to attach the approved ServiceNow change ID:
#
#   RELEASE_APPROVAL=CHG0048219 deploy/release.sh production
#
# The change ID is checked for shape only — CHG followed by seven digits. This hook is not
# the approval; ServiceNow is. This is what makes the approval a precondition of the
# command rather than a step someone can forget.
#
# Exit 2 blocks the tool call and returns the message on stderr to the agent.
set -euo pipefail

payload="$(cat)"

command="$(printf '%s' "$payload" | python3 -c '
import json, sys
try:
    event = json.load(sys.stdin)
except json.JSONDecodeError:
    sys.exit(0)
print(event.get("tool_input", {}).get("command", ""))
')"

case "$command" in
  *deploy/release.sh*) ;;
  *) exit 0 ;;
esac

case "$command" in
  *production*) ;;
  *) exit 0 ;;
esac

approval="${RELEASE_APPROVAL:-}"

# An engineer types the authorization in front of the command as often as they export it.
if [[ -z "$approval" && "$command" =~ RELEASE_APPROVAL=([A-Za-z0-9]+) ]]; then
  approval="${BASH_REMATCH[1]}"
fi

if [[ "$approval" =~ ^CHG[0-9]{7}$ ]]; then
  exit 0
fi

cat >&2 <<'MESSAGE'
Production deploys need a release authorization.
Attach the approved ServiceNow change ID as RELEASE_APPROVAL and re-run.
MESSAGE
exit 2
