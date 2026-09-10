#!/usr/bin/env bash
# PostToolUse: format the file the edit just touched.
#
# PLAT-771. Formatting drift used to arrive in review a hundred lines at a time, because
# nobody ran the formatter on a file they had only changed two lines of. Running it on
# every edit, scoped to the one file that changed, means it never accumulates.
#
#   *.java under a Maven module   google-java-format via spotless, AOSP style
#   *.ts / *.tsx under rm-workspace   prettier, from the workspace's own devDependencies
#
# Anything else is left alone.
#
# This hook is not a gate. It always exits 0: a formatter that cannot run is a toolchain
# problem for the engineer, not a reason to reject an edit that was already made. It does
# say so, though — a formatter that fails quietly is how a repo ends up half-formatted.
# The usual cause is a missing JDK: ./mvnw needs JAVA_HOME set or java on PATH.
set -uo pipefail

payload="$(cat)"

parsed="$(printf '%s' "$payload" | python3 -c '
import json, re, sys
try:
    event = json.load(sys.stdin)
except json.JSONDecodeError:
    sys.exit(0)
path = event.get("tool_input", {}).get("file_path", "")
print(path)
print(re.escape(path) if path else "")
')"

file_path="$(printf '%s' "$parsed" | sed -n '1p')"
file_regex="$(printf '%s' "$parsed" | sed -n '2p')"

if [[ -z "$file_path" || ! -f "$file_path" ]]; then
  exit 0
fi

project="${CLAUDE_PROJECT_DIR:-$PWD}"
relative="${file_path#"$project"/}"

# Runs the formatter, says so, and says so just as clearly when it could not run.
format_with() { # $1 = formatter name, $2 = directory to run in, rest = command
  local formatter="$1" workdir="$2"
  shift 2
  local output
  if output="$( (cd "$workdir" && "$@") 2>&1 )"; then
    echo "formatted $relative ($formatter)"
  else
    echo "$formatter could not format $relative:"
    printf '%s\n' "$output" | grep -v '^[[:space:]]*$' | head -3
  fi
}

case "$file_path" in
  *.java)
    module="${relative%%/*}"
    case "$module" in
      onboarding-core|screening-batch|registry-link) ;;
      *) exit 0 ;;
    esac
    format_with google-java-format "$project" \
      ./mvnw -B -q -pl "$module" spotless:apply -DspotlessFiles="$file_regex"
    ;;
  *.ts|*.tsx)
    case "$relative" in
      rm-workspace/*) ;;
      *) exit 0 ;;
    esac
    format_with prettier "$project/rm-workspace" \
      bunx prettier --write "$file_path"
    ;;
esac

exit 0
