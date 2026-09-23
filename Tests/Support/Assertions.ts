import assert from 'node:assert/strict'

const defaultTolerance = 0.001

export function assertNear(actual: number, expected: number, tolerance = defaultTolerance): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`)
}
