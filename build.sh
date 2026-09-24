#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

rm -rf dist

echo "Building the game into dist/"
npx --no-install vite build Apps/Game --base ./ --outDir ../../dist --emptyOutDir --logLevel warn

echo "Building the walkable room into dist/room/"
npx --no-install vite build Apps/Game/Room --base ./ --outDir ../../../dist/room --emptyOutDir --logLevel warn

echo "Building the ritual bench into dist/bench/"
npx --no-install vite build Apps/Bench --base ./ --outDir ../../dist/bench --emptyOutDir --logLevel warn

touch dist/.nojekyll
echo "Built dist/: $(find dist -type f | wc -l | tr -d ' ') files"
