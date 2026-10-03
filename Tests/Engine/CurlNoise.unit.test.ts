import assert from 'node:assert/strict'
import test from 'node:test'
import { curlNoiseAt, curlNoiseOnAPlaneAt } from '../../Apps/Engine/Rendering/Flow/CurlNoise.ts'

const pointsTried = [[0.1, 0.2, 0.3], [1.7, -2.4, 0.9], [-3.3, 5.1, 2.2], [10.5, 0.4, -7.8]] as const
const differenceStep = 0.001
const divergenceAtMostShareOfTheFlow = 0.05

test('curlNoise_atAnyPoint_neitherGathersNorSpreadsTheAir', () => {
  const divergences = pointsTried.map(([x, y, z]) => {
    const dx = (curlNoiseAt(x + differenceStep, y, z).x - curlNoiseAt(x - differenceStep, y, z).x) / (2 * differenceStep)
    const dy = (curlNoiseAt(x, y + differenceStep, z).y - curlNoiseAt(x, y - differenceStep, z).y) / (2 * differenceStep)
    const dz = (curlNoiseAt(x, y, z + differenceStep).z - curlNoiseAt(x, y, z - differenceStep).z) / (2 * differenceStep)
    const flow = curlNoiseAt(x, y, z)
    return Math.abs(dx + dy + dz) / Math.max(1e-6, Math.hypot(flow.x, flow.y, flow.z))
  })

  assert.ok(divergences.every((divergence) => divergence <= divergenceAtMostShareOfTheFlow), divergences.map((divergence) => divergence.toFixed(4)).join(', '))
})

test('curlNoise_atTwoDistantPoints_flowsDifferently', () => {
  const here = curlNoiseAt(0.3, 0.3, 0.3)
  const there = curlNoiseAt(4.7, 1.1, -2.6)

  assert.notDeepEqual(here, there)
})

test('curlNoiseOnAPlane_atAnyPoint_neitherGathersNorSpreadsTheLiquid', () => {
  const divergences = pointsTried.map(([x, y, timeShift]) => {
    const dx = (curlNoiseOnAPlaneAt(x + differenceStep, y, timeShift).x - curlNoiseOnAPlaneAt(x - differenceStep, y, timeShift).x) / (2 * differenceStep)
    const dy = (curlNoiseOnAPlaneAt(x, y + differenceStep, timeShift).y - curlNoiseOnAPlaneAt(x, y - differenceStep, timeShift).y) / (2 * differenceStep)
    const flow = curlNoiseOnAPlaneAt(x, y, timeShift)
    return Math.abs(dx + dy) / Math.max(1e-6, Math.hypot(flow.x, flow.y))
  })

  assert.ok(divergences.every((divergence) => divergence <= divergenceAtMostShareOfTheFlow), divergences.map((divergence) => divergence.toFixed(4)).join(', '))
})
