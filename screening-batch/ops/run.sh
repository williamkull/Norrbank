#!/usr/bin/env bash
# Wrapper for the nightly screening run. Installed at /opt/norrbank/screening-batch/bin.
set -euo pipefail

JAR="/opt/norrbank/screening-batch/lib/screening-batch.jar"
DB_PASSWORD="$(cat /etc/norrbank/secrets/screening-batch.pw)"

exec java \
  -Ddb.password="${DB_PASSWORD}" \
  -Dstage.file.path=/var/lib/norrbank/screening/case-stage.dat \
  -jar "${JAR}"
