#!/usr/bin/env bash
# PreToolUse guard: during a fix task, the tests are read-only.
#
# The fix task is declared, not guessed. One command either side of the work:
#
#   bin/fix-task begin      writes .claude/fix-task.marker
#   bin/fix-task end        removes it
#
# While that marker exists, any Edit or Write under src/test/, src/itest/, or to a
# *.test.ts or *.test.tsx file is blocked. With no marker this hook does nothing, so
# ordinary feature work — which is most work — is untouched by it.
#
# PLAT-771. The rule behind it is the one the fix workflow depends on: the failing test is
# written and committed first, and then the fix cannot reach it. An agent fixing code must
# not be able to weaken the check on that code, and a test that was already green before
# the fix proves nothing about it.
#
# Exit 2 blocks the tool call and returns the message on stderr to the agent.
set -euo pipefail

project="${CLAUDE_PROJECT_DIR:-$PWD}"

if [[ ! -f "$project/.claude/fix-task.marker" ]]; then
  exit 0
fi

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
  */src/test/*|*/src/itest/*|*.test.ts|*.test.tsx) ;;
  *) exit 0 ;;
esac

cat >&2 <<MESSAGE
Blocked: fix task: tests are read-only.

  $file_path

A fix task is open ($project/.claude/fix-task.marker). The failing test was written and
committed before the fix, and it is what proves the bug is gone. Changing it now would
mean the fix is measured against a check the fix itself moved.

Fix the code the test is failing against instead.

If the test is genuinely wrong, that is a separate change: close the fix task with
bin/fix-task end, correct the test on its own commit, and say why in the message.
MESSAGE
exit 2
