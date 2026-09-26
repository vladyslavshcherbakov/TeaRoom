#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

stepNames=(
  'Type-check of the simulation and its tests'
  'Type-check of the apps and their tests'
  'Tests'
)
stepOutputFolder=$(mktemp -d)
stepProcessIds=()
trap 'kill ${stepProcessIds[@]+"${stepProcessIds[@]}"} 2>/dev/null || true; rm -rf "$stepOutputFolder"' EXIT
trap 'exit 130' INT TERM

startStep() {
  local stepIndex=$1
  shift
  "$@" > "$stepOutputFolder/$stepIndex.log" 2>&1 &
  stepProcessIds[$stepIndex]=$!
}

echo "Type-checking the simulation, the tests and the apps, and running the tests, side by side"
startStep 0 npx --no-install tsc -p tsconfig.json
startStep 1 npx --no-install tsc -p Apps/tsconfig.json
startStep 2 node --test --test-reporter=spec "Tests/**/*.test.ts"

stepOutcomes=()
for stepIndex in 0 1 2; do
  if wait "${stepProcessIds[$stepIndex]}"; then stepOutcomes[$stepIndex]=passed; else stepOutcomes[$stepIndex]=failed; fi
  echo
  echo "== ${stepNames[$stepIndex]}: ${stepOutcomes[$stepIndex]}"
  cat "$stepOutputFolder/$stepIndex.log"
done

echo
failedStepCount=0
for stepIndex in 0 1 2; do
  echo "${stepNames[$stepIndex]}: ${stepOutcomes[$stepIndex]}"
  if [ "${stepOutcomes[$stepIndex]}" = failed ]; then failedStepCount=$((failedStepCount + 1)); fi
done
if [ "$failedStepCount" -gt 0 ]; then
  echo "$failedStepCount of ${#stepNames[@]} steps failed"
  exit 1
fi
