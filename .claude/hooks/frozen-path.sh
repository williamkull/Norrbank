#!/usr/bin/env bash
# PreToolUse guard: the legacy v1/ REST surface is frozen.
#
# ONB-3110 (2023-01) froze v1/. Two clients pin its field order and break on an unknown
# field, so nothing further goes into it. New work goes in v2/.
#
# Exit 2 blocks the tool call and returns the message on stderr to the agent.
set -euo pipefail

payload="$(cat)"

file_path="$(printf '%s' "$payload" | python3 -c '
import json, sys
try:
    event = json.load(sys.stdin)
except json.JSONDecodeError:
    sys.exit(0)
print(event.get("tool_input", {}).get("file_path", ""))
')"

if [[ -z "$file_path" ]]; then
  exit 0
fi

case "$file_path" in
  */se/norrbank/onboarding/v1/*)
    target="${file_path//\/v1\//\/v2\/}"
    cat >&2 <<MESSAGE
Blocked: the legacy v1/ package is frozen.

  $file_path

ONB-3110 froze v1/ in January 2023. The ops console and the workspace case list both
pin its field order and break on an unknown field, so nothing new goes in.

Put the change in v2/ instead:

  $target

See onboarding-core/CLAUDE.md, "Things Claude gets wrong".
MESSAGE
    exit 2
    ;;
esac

exit 0
