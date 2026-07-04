#!/usr/bin/env bash
# Starts every backend + UI in the background. Re-run is safe: skips any
# service whose port is already listening.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs .pids

port_free() { ! lsof -iTCP:"$1" -sTCP:LISTEN -P >/dev/null 2>&1; }

start_py() {
  local name=$1 dir=$2 module=$3 port=$4
  if ! port_free "$port"; then echo "skip  $name (port $port already in use)"; return; fi
  ( cd "$dir" && source .venv/bin/activate && exec uvicorn "$module" --port "$port" ) \
    > "logs/$name.log" 2>&1 &
  echo $! > ".pids/$name.pid"
  echo "start $name -> :$port (pid $!)"
}

start_node() {
  local name=$1 dir=$2 port=$3
  if ! port_free "$port"; then echo "skip  $name (port $port already in use)"; return; fi
  ( cd "$dir" && exec npm run dev ) > "logs/$name.log" 2>&1 &
  echo $! > ".pids/$name.pid"
  echo "start $name -> :$port (pid $!)"
}

start_py  agent-runtime         agent-runtime         agent_runtime.api:app       8001
start_py  agent-data-platform   agent-data-platform    adp.main:app                8100
start_py  channels-api          channels               channels.main:app          8200
start_py  trust-api             trust                  trust.main:app              8500
start_py  expert-answers-api    expert-answers          expert_answers.main:app     8600
start_py  voice-api             voice                   voice.main:app              8700

start_node agent-studio    .                    3000
start_node ghostwriter     ghostwriter          8300
start_node explorer        explorer             8400
start_node trust-ui        trust/ui             8501
start_node channels-ui     channels/ui          8201
start_node expert-answers-ui expert-answers/ui  8601
start_node voice-ui        voice/ui             8701

echo
echo "Logs in ./logs/*.log, PIDs in ./.pids/*.pid. Stop with scripts/dev-down.sh"
