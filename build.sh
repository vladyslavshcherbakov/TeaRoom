#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Compiling the ritual bench into dist/"
rm -rf dist
npx --no-install tsc -p Apps/Bench/tsconfig.json
cp Apps/Bench/index.html dist/index.html
touch dist/.nojekyll

echo "Built dist/ with $(find dist -name '*.js' | wc -l | tr -d ' ') scripts"
