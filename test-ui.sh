#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

./build.sh

echo "Running the end-to-end UI tests against the built site"
npx --no-install playwright test -c Tests/Browser/playwright.config.ts "$@"
