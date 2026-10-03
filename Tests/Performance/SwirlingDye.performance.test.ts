import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { SwirlingDye, type DyeMotion } from '../../Apps/Engine/Rendering/Flow/SwirlingDye.ts'
import { secondsTakenBy } from '../Support/Stopwatch.ts'

const motion: DyeMotion = { calmsDownSeconds: 4, swirlKeeping: 3, pressureRounds: 12, inflowRadiusShare: 0.06, inflowTakesOverPerSecond: 10, spreadPerSecond: 60, pushShare: 0.5, pushRadiusShare: 0.15, pushTakesOverPerSecond: 3, sinkingBandShare: 0.2, deepFlowShare: -0.4, depthShowsShare: 0.35, evensOutSeconds: 20, churnCellsPerSecondSquared: 6, churnSizeCells: 10, churnChangePerSecond: 0.3, upwellingsPerSecond: 6, upwellingSeconds: 0.5, upwellingSpreadPerSecond: 20 }
const cells = 48
const framesInAMinute = 3600
const frameSeconds = 1 / 60
const white = new THREE.Color(1, 1, 1)
const inflowInTheMiddle = { u: 0.5, v: 0.5, colour: new THREE.Color(0.3, 0.1, 0), strength: 1, warmth: 1, pushU: 0.5, pushV: 0.5 }
const millisecondsPerFrameForTwoStirredSurfacesAtMost = 1.5
const millisecondsPerFrameForTenStillSurfacesAtMost = 0.05

test('dyeOfTwoSurfacesWithAStreamFallingIn_whenAdvancedAMinuteFrameByFrame_takesUnderOneAndAHalfMillisecondsAFrame', () => {
  const surfaces = Array.from({ length: 2 }, () => filledWithWhite())

  const millisecondsPerFrame = millisecondsPerFrameOf(surfaces, [inflowInTheMiddle])

  assert.ok(millisecondsPerFrame <= millisecondsPerFrameForTwoStirredSurfacesAtMost, `${millisecondsPerFrame.toFixed(3)} ms a frame`)
})

test('dyeOfTenStillSurfaces_whenAdvancedAMinuteFrameByFrame_takesUnderATwentiethOfAMillisecondAFrame', () => {
  const surfaces = Array.from({ length: 10 }, () => filledWithWhite())

  const millisecondsPerFrame = millisecondsPerFrameOf(surfaces, [])

  assert.ok(millisecondsPerFrame <= millisecondsPerFrameForTenStillSurfacesAtMost, `${millisecondsPerFrame.toFixed(4)} ms a frame`)
})

function filledWithWhite(): SwirlingDye {
  const dye = new SwirlingDye(cells, motion)
  dye.fillWith(white)
  return dye
}

function millisecondsPerFrameOf(surfaces: readonly SwirlingDye[], inflows: Parameters<SwirlingDye['advance']>[3]): number {
  const seconds = secondsTakenBy(() => {
    for (let frame = 0; frame < framesInAMinute; frame += 1) for (const dye of surfaces) dye.advance(frameSeconds, frame * frameSeconds, white, inflows, inflows.length === 0 ? 0 : 1)
  })
  return (seconds * 1000) / framesInAMinute
}
