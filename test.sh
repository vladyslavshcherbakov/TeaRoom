#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Type-checking Shared and Tests"
npx --no-install tsc -p tsconfig.json
npx --no-install tsc -p Apps/Bench/tsconfig.json --noEmit

echo "Running tests"
node --test "Tests/**/*.test.ts"
