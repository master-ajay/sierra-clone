#!/usr/bin/env bash
# Kills every process started by dev-up.sh.
set -uo pipefail
cd "$(dirname "$0")/.."

for pidfile in .pids/*.pid; do
  [ -e "$pidfile" ] || continue
  pid=$(cat "$pidfile")
  name=$(basename "$pidfile" .pid)
  if kill "$pid" 2>/dev/null; then
    echo "stopped $name (pid $pid)"
  else
    echo "skip    $name (pid $pid not running)"
  fi
  rm -f "$pidfile"
done
