#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Type-checking the simulation, the tests and the apps"
npx --no-install tsc -p tsconfig.json
npx --no-install tsc -p Apps/tsconfig.json

echo "Running tests"
node --test "Tests/**/*.test.ts"
