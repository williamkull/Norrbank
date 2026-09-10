# platform

`managed-settings.json` is the platform team's copy of the Claude Code managed settings we
deploy to every engineer's machine. It is installed by MDM at `/etc/claude-code/managed-settings.json`
on Linux and `/Library/Application Support/ClaudeCode/managed-settings.json` on macOS, and it
is the file the settings precedence puts above everything else: a project `.claude/settings.json`,
a user's own settings and a command-line flag can all narrow what is allowed here, and none of
them can widen it. `allowManagedHooksOnly` is why the production gate at
`.claude/hooks/production-gate.sh` runs for everyone — with it set, only hooks declared in this
file execute at all, so removing the hook from the project settings does not remove the gate.
The copy here is version controlled so a change to it is reviewed like any other change; the
copy that runs is the one MDM put on the machine.

`bands.yaml` is the response tiering for `detect.ts`. Both are read-only inputs to the
detection run, and neither is a place to put anything a service team needs to change often.

`ops/` holds `simulate-day.ts` and the traffic it generates. That directory is a rehearsal
fixture: it exists so the detection path can be exercised against a day whose shape we control,
and nothing in it is production telemetry.
