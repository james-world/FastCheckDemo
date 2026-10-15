#!/usr/bin/env bash
# Installs dependencies if needed, then runs the demos.
#   ./run-demo.sh          runs both demos
#   ./run-demo.sh jugs     runs the two-jug puzzle only
#   ./run-demo.sh order    runs the order workflow only
set -uo pipefail
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install --silent
fi
which=${1:-all}
if [ "$which" = all ] || [ "$which" = jugs ]; then
  echo "=== Demo 1: the two-jug puzzle ==="; echo
  npm run --silent demo
fi
if [ "$which" = all ] || [ "$which" = order ]; then
  [ "$which" = all ] && { echo; echo "=== Demo 2: the order workflow ==="; echo; }
  npm run --silent demo:order
fi
exit 0
