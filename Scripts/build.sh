#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

rm -rf dist

echo "Building the room into dist/"
npx --no-install vite build Apps/Game/Room --base ./ --outDir ../../../dist --emptyOutDir --logLevel warn

touch dist/.nojekyll
echo "Built dist/: $(find dist -type f | wc -l | tr -d ' ') files"
