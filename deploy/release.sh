#!/usr/bin/env bash
#
# Norrbank onboarding estate — release to an environment.
#
#   deploy/release.sh dev
#   deploy/release.sh staging
#   RELEASE_APPROVAL=CHG0048812 deploy/release.sh production
#
# Autonomy is tiered by environment. Development deploys on its own. Staging deploys and
# then exercises the rollback, every time, so the path is proven before anything needs it.
# Production refuses to run without an approved ServiceNow change ID in RELEASE_APPROVAL.
#
# The production gate is enforced twice on purpose. The PreToolUse hook at
# .claude/hooks/production-gate.sh stops an agent before the command ever runs; the check
# below stops a human running the script by hand. Neither is the other's fallback.
#
# Environment:
#   NORRBANK_ENVS     where releases land. Default $HOME/.norrbank-envs.
#   RELEASE_APPROVAL  ServiceNow change ID, CHG followed by seven digits. Production only.
#   RELEASE_TICKET    ticket the release carries. Default: the ticket ID in HEAD's subject.
#   RELEASE_MANAGER   tagger identity. Default "Lena Berg <lena.berg@norrbank.se>".
#   JAVA_HOME         passed through to the build, as make expects.
#
# Every step of every run appends one JSON line to $NORRBANK_ENVS/deploy-log.jsonl. The log
# lives beside the environments and never inside the repository.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENVS_ROOT="${NORRBANK_ENVS:-$HOME/.norrbank-envs}"
DEPLOY_LOG="$ENVS_ROOT/deploy-log.jsonl"
RELEASE_MANAGER="${RELEASE_MANAGER:-Lena Berg <lena.berg@norrbank.se>}"
APPROVAL_PATTERN='^CHG[0-9]{7}$'
SMOKE_USER="release.smoke"
SMOKE_TIMEOUT_SECONDS=90

LANE=""

# ── deploy log ───────────────────────────────────────────────────────────────────────────
# One line per step, in the shape ui/shared/types.ts calls DeployEvent. Timestamps are the
# machine's own clock, in ISO-8601 with the offset.

json_escape() {
  local s=$1
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\t'/\\t}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/\\r}
  printf '%s' "$s"
}

event() {
  local kind=$1 text=$2 ref=${3:-}
  local line
  line="{\"timestamp\":\"$(date +%Y-%m-%dT%H:%M:%S%:z)\",\"lane\":\"$LANE\",\"kind\":\"$kind\",\"text\":\"$(json_escape "$text")\""
  if [[ -n "$ref" ]]; then
    line="$line,\"ref\":\"$(json_escape "$ref")\""
  fi
  line="$line}"
  mkdir -p "$ENVS_ROOT"
  printf '%s\n' "$line" >> "$DEPLOY_LOG"
  # The human line goes to stderr so that a step which returns a value on stdout — the jar
  # the build produced, the port the smoke check took — is not polluted by its own log.
  printf '%s\n' "$text" >&2
}

die() {
  event log "$1"
  exit 1
}

# ── build ────────────────────────────────────────────────────────────────────────────────

build_artefact() {
  event log "build: make build"
  if ! make -C "$REPO_ROOT" build >"$WORK/build.log" 2>&1; then
    local kept="$ENVS_ROOT/$LANE-build-failed.log"
    mkdir -p "$ENVS_ROOT"
    cp "$WORK/build.log" "$kept"
    event log "build: FAILED — $(grep -m1 -E '^\[ERROR\]|error:|ERROR:' "$WORK/build.log" \
      || tail -n 1 "$WORK/build.log")"
    event log "build: log kept at $kept"
    exit 1
  fi
  local jar
  jar=$(find "$REPO_ROOT/onboarding-core/target" -maxdepth 1 -name 'onboarding-core-*.jar' \
        ! -name '*-sources.jar' ! -name '*.original' | head -n 1)
  [[ -n "$jar" ]] || die "build: no onboarding-core jar under onboarding-core/target"
  event log "build: $(basename "$jar") $(stat -c%s "$jar") bytes"
  printf '%s' "$jar"
}

# ── smoke check ──────────────────────────────────────────────────────────────────────────
# Genuinely runs the artefact that was just deployed. onboarding-core carries no actuator,
# so the check boots the jar on the local profile and asks it the question the RM workspace
# asks: list the cases the caller may see. A jar that does not boot, a schema that does not
# initialise, or a route that does not answer all fail here.

free_port() {
  local port
  for _ in {1..40}; do
    port=$(( 18000 + RANDOM % 2000 ))
    if ! (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
      printf '%s' "$port"
      return 0
    fi
    exec 3>&- 2>/dev/null || true
  done
  die "smoke: no free port in 18000-19999"
}

smoke() {
  local jar=$1 label=$2
  local port pid waited body status
  port=$(free_port)
  local java_bin="java"
  [[ -n "${JAVA_HOME:-}" ]] && java_bin="$JAVA_HOME/bin/java"

  "$java_bin" -jar "$jar" \
      --spring.profiles.active=local \
      --server.port="$port" \
      >"$WORK/smoke-$label.log" 2>&1 &
  pid=$!

  waited=0
  while (( waited < SMOKE_TIMEOUT_SECONDS )); do
    if ! kill -0 "$pid" 2>/dev/null; then
      local why
      why=$(grep -m1 -E 'Caused by|ERROR|Error starting' "$WORK/smoke-$label.log" \
            || grep -v '^[[:space:]]*$' "$WORK/smoke-$label.log" | tail -n 1)
      cp "$WORK/smoke-$label.log" "$ENVS_ROOT/$LANE-smoke-failed.log"
      event log "smoke($label): the service exited during startup — ${why}"
      event log "smoke($label): log kept at $ENVS_ROOT/$LANE-smoke-failed.log"
      return 1
    fi
    status=$(curl -s -o "$WORK/smoke-$label.body" -w '%{http_code}' \
             -H "X-Norrbank-User: $SMOKE_USER" \
             -H "X-Norrbank-Department: onboarding-operations" \
             -H "X-Norrbank-Roles: ONB_OPS" \
             "http://127.0.0.1:$port/v2/cases" || true)
    if [[ "$status" == "200" ]]; then
      break
    fi
    sleep 1
    waited=$(( waited + 1 ))
  done

  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true

  if [[ "${status:-}" != "200" ]]; then
    event log "smoke($label): GET /v2/cases -> ${status:-no response} after ${waited}s"
    return 1
  fi
  body=$(tr -cd '{' < "$WORK/smoke-$label.body" | wc -c)
  event log "smoke($label): GET /v2/cases -> 200, $body cases, service up in ${waited}s on port $port"
  return 0
}

# ── environment directory ────────────────────────────────────────────────────────────────
# $NORRBANK_ENVS/<env>/current holds the running release; previous/ holds the one before it.
# Rolling back is a directory swap, which is what makes the staging rehearsal cheap enough
# to run on every release.

release_marker() {
  local dir=$1 jar=$2 ticket=$3
  {
    printf 'artifact=%s\n' "$(basename "$jar")"
    printf 'ticket=%s\n' "$ticket"
    printf 'commit=%s\n' "$(git -C "$REPO_ROOT" rev-parse HEAD)"
    printf 'deployed_at=%s\n' "$(date +%Y-%m-%dT%H:%M:%S%:z)"
  } > "$dir/RELEASE"
}

install_release() {
  local env=$1 jar=$2 ticket=$3
  local root="$ENVS_ROOT/$env"
  mkdir -p "$root"
  rm -rf "$root/incoming"
  mkdir -p "$root/incoming"
  cp "$jar" "$root/incoming/"
  release_marker "$root/incoming" "$jar" "$ticket"

  if [[ -d "$root/current" ]]; then
    rm -rf "$root/previous"
    mv "$root/current" "$root/previous"
    event log "deploy($env): kept the running release as previous/"
  fi
  mv "$root/incoming" "$root/current"
}

swap() {
  local root=$1
  local hold="$root/.swap"
  rm -rf "$hold"
  mv "$root/current" "$hold"
  mv "$root/previous" "$root/current"
  mv "$hold" "$root/previous"
}

current_jar() {
  find "$1/current" -maxdepth 1 -name '*.jar' | head -n 1
}

# What identifies a release on the pipeline lane: the commit it was built from and when it
# was put there. The artefact name alone cannot tell two releases apart.
release_id() {
  local marker="$1/RELEASE"
  printf '%s deployed %s' \
    "$(grep '^commit=' "$marker" | cut -d= -f2 | cut -c1-7)" \
    "$(grep '^deployed_at=' "$marker" | cut -d= -f2-)"
}

rehearse_rollback() {
  local root="$ENVS_ROOT/staging"
  if [[ ! -d "$root/previous" ]]; then
    event log "rollback: no previous release in staging, nothing to roll back to — rehearsal skipped"
    return 0
  fi
  local before after
  before=$(release_id "$root/current")
  event rollback-rehearsal "rollback: swapping current and previous"
  swap "$root"
  after=$(release_id "$root/current")
  event rollback-rehearsal "rollback: staging now runs the previous release ($after, was $before)"
  if ! smoke "$(current_jar "$root")" rollback; then
    event rollback-rehearsal "rollback: the previous release failed its smoke check — staging left rolled back"
    exit 1
  fi
  event rollback-rehearsal "rollback: previous release answered, rolling forward again"
  swap "$root"
  after=$(release_id "$root/current")
  event rollback-rehearsal "rollback: staging back on $after, rehearsal complete"
}

# ── main ─────────────────────────────────────────────────────────────────────────────────

main() {
  local env=${1:-}
  case "$env" in
    dev|staging|production) LANE="$env" ;;
    *)
      printf 'usage: deploy/release.sh <dev|staging|production>\n' >&2
      exit 64
      ;;
  esac

  WORK=$(mktemp -d)
  trap 'rm -rf "$WORK"' EXIT

  local ticket
  ticket="${RELEASE_TICKET:-$(git -C "$REPO_ROOT" log -1 --pretty=%s | grep -oE '^[A-Z]+-[0-9]+' || true)}"
  [[ -n "$ticket" ]] || die "no ticket: set RELEASE_TICKET, or put the ticket ID in the commit subject"

  event start "release $ticket to $env from $(git -C "$REPO_ROOT" rev-parse --short HEAD)"

  if [[ "$env" == "production" ]]; then
    if [[ ! "${RELEASE_APPROVAL:-}" =~ $APPROVAL_PATTERN ]]; then
      # The wording is the gate's, and it is the same wording the PreToolUse hook uses, so
      # an engineer sees one message whether an agent or their own shell was stopped.
      event blocked "Production deploys need a release authorization."
      event blocked "Attach the approved ServiceNow change ID as RELEASE_APPROVAL and re-run."
      exit 2
    fi
    event authorised "authorised by $RELEASE_MANAGER" "$RELEASE_APPROVAL"
  fi

  local jar
  jar=$(build_artefact)

  install_release "$env" "$jar" "$ticket"
  if ! smoke "$(current_jar "$ENVS_ROOT/$env")" "$env"; then
    event log "deploy($env): smoke check failed, the release is not marked deployed"
    exit 1
  fi
  event deployed "$env now runs $(basename "$jar") for $ticket"

  if [[ "$env" == "staging" ]]; then
    rehearse_rollback
  fi

  if [[ "$env" == "production" ]]; then
    local tag
    tag="release/$(date +%Y.%m.%d)-$(printf '%s' "$ticket" | tr '[:upper:]' '[:lower:]')"
    GIT_COMMITTER_NAME="${RELEASE_MANAGER%% <*}" \
    GIT_COMMITTER_EMAIL="$(printf '%s' "$RELEASE_MANAGER" | sed -n 's/.*<\(.*\)>.*/\1/p')" \
      git -C "$REPO_ROOT" tag -a "$tag" \
        -m "$ticket released to production. Change $RELEASE_APPROVAL, authorised by $RELEASE_MANAGER."
    event tag "tagged $tag, tagger $RELEASE_MANAGER" "$tag"
  fi
}

main "$@"
