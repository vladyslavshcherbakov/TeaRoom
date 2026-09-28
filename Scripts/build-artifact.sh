#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

rm -rf dist-artifact

echo "Building the room without logs or their texts into dist-artifact/"
npx --no-install vite build Apps/Game/Room --config Scripts/silent-build.vite.config.mjs --mode silent --base ./ --outDir ../../../dist-artifact/build --emptyOutDir --logLevel warn

echo "Putting the page, its styles and its script into one file for a Claude artifact"
node Scripts/assemble-artifact-page.mjs dist-artifact/build dist-artifact/TeaCeremony.html
