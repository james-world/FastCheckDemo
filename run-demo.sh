#!/usr/bin/env bash
# Installs dependencies if needed, then runs the demo.
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install --silent
fi
npm run --silent demo
