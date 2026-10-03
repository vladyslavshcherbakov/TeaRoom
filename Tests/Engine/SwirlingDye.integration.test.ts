import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { SwirlingDye, type DyeInflow, type DyeMotion } from '../../Apps/Engine/Rendering/Flow/SwirlingDye.ts'

const motion: DyeMotion = {
  calmsDownSeconds: 4,
  swirlKeeping: 3,
  pressureRounds: 12,
  inflowRadiusShare: 0.06,
  inflowTakesOverPerSecond: 10,
  spreadPerSecond: 60,
  pushShare: 0.5,
  pushRadiusShare: 0.15,
  pushTakesOverPerSecond: 3,
  sinkingBandShare: 0.2,
  deepFlowShare: -0.4,
  depthShowsShare: 0.35,
  evensOutSeconds: 20,
  churnCellsPerSecondSquared: 6,
  churnSizeCells: 10,
  churnChangePerSecond: 0.3,
  upwellingsPerSecond: 6,
  upwellingSeconds: 0.5,
  upwellingSpreadPerSecond: 20,
}
const cells = 48
const frameSeconds = 1 / 30
const white = new THREE.Color(1, 1, 1)
const red = new THREE.Color(1, 0, 0)
const pink = new THREE.Color(1, 0.7, 0.7)
const redInTheMiddle: DyeInflow = { u: 0.5, v: 0.5, colour: red, strength: 1, warmth: 0, pushU: 0, pushV: 0 }
const still = 0
const boiling = 3

test('dye_whereAColourFlowsIn_takesThatColourThereAndStaysAsItWasFarAway', () => {
  const dye = filledDye(white)

  advanceFor(dye, 0.5, white, [redInTheMiddle], still)

  assert.ok(rednessAt(dye, 0.5, 0.5) > 0.5, `the middle is ${dye.colourAt(0.5, 0.5).getHexString()}`)
  assert.ok(rednessAt(dye, 0.1, 0.5) < 0.05, `the edge is ${dye.colourAt(0.1, 0.5).getHexString()}`)
})

test('dye_ofAWarmerStreamFlowingInAtOnePoint_spreadsOutwardFromItAllRound', () => {
  const dye = filledDye(white)

  advanceFor(dye, 2, white, [{ ...redInTheMiddle, warmth: 1 }], still)

  const leastRedOnARing = Math.min(...ringAround(0.5, 0.5, 0.2).map(([u, v]) => rednessAt(dye, u, v)))
  assert.ok(leastRedOnARing > 0.1, `the least red cell a fifth of the width from the inflow is ${leastRedOnARing.toFixed(3)} redder than green`)
})

test('dye_flowingInNearTheWallAndAlongIt_isCarriedAroundTheMiddleTheWayTheStreamRuns', () => {
  const dye = filledDye(white)

  advanceFor(dye, 3, white, [{ ...redInTheMiddle, u: 0.8, pushV: 1 }], still)

  const anEighthOfATurnOn = rednessAt(dye, 0.71, 0.71)
  const anEighthOfATurnBack = rednessAt(dye, 0.71, 0.29)
  assert.ok(anEighthOfATurnOn > anEighthOfATurnBack + 0.2, `an eighth of a turn on the dye is ${anEighthOfATurnOn.toFixed(3)} redder than green, and an eighth of a turn back ${anEighthOfATurnBack.toFixed(3)}`)
})

test('dye_ofAStreamWarmerThanTheLiquid_showsMoreOfItsColourOnTopThanOfAColderOne', () => {
  const warmer = filledDye(white)
  const colder = filledDye(white)

  advanceFor(warmer, 1, white, [{ ...redInTheMiddle, strength: 0.3, warmth: 1 }], still)
  advanceFor(colder, 1, white, [{ ...redInTheMiddle, strength: 0.3, warmth: -1 }], still)

  assert.ok(rednessAt(warmer, 0.5, 0.5) > rednessAt(colder, 0.5, 0.5) + 0.1, `the warmer stream shows ${rednessAt(warmer, 0.5, 0.5).toFixed(3)} and the colder ${rednessAt(colder, 0.5, 0.5).toFixed(3)}`)
})

test('dye_ofAColderStreamThatSank_comesUpWhenTheLiquidBoils', () => {
  const calm = filledDye(white)
  const boiled = filledDye(white)
  for (const dye of [calm, boiled]) advanceFor(dye, 3, white, [{ ...redInTheMiddle, warmth: -1 }], still)
  const rednessBefore = averageRednessOf(calm)

  advanceFor(calm, 2, white, [], still)
  advanceFor(boiled, 2, white, [], boiling)

  assert.ok(averageRednessOf(boiled) > averageRednessOf(calm) * 1.15, `before ${rednessBefore.toFixed(4)}, after a calm wait ${averageRednessOf(calm).toFixed(4)}, after boiling ${averageRednessOf(boiled).toFixed(4)}`)
})

test('dye_afterTheInflowStops_settlesIntoTheSettledColour', () => {
  const dye = filledDye(white)
  advanceFor(dye, 1, pink, [redInTheMiddle], still)

  advanceFor(dye, 6 * motion.evensOutSeconds, pink, [], still)

  const farthestFromPink = Math.max(...ringAround(0.5, 0.5, 0.3).map(([u, v]) => {
    const colour = dye.colourAt(u, v)
    return Math.max(Math.abs(colour.r - pink.r), Math.abs(colour.g - pink.g), Math.abs(colour.b - pink.b))
  }))
  assert.ok(farthestFromPink < 0.02, `a cell is ${farthestFromPink.toFixed(3)} away from the settled colour`)
})

function filledDye(colour: THREE.Color): SwirlingDye {
  const dye = new SwirlingDye(cells, motion)
  dye.fillWith(colour)
  return dye
}

function advanceFor(dye: SwirlingDye, seconds: number, settledColour: THREE.Color, inflows: readonly DyeInflow[], agitation: number): void {
  for (let frame = 0; frame < Math.round(seconds / frameSeconds); frame += 1) dye.advance(frameSeconds, frame * frameSeconds, settledColour, inflows, agitation)
}

function rednessAt(dye: SwirlingDye, u: number, v: number): number {
  const colour = dye.colourAt(u, v)
  return colour.r - colour.g
}

function averageRednessOf(dye: SwirlingDye): number {
  const spots = Array.from({ length: 20 }, (_, row) => Array.from({ length: 20 }, (_, column) => [0.2 + (column / 19) * 0.6, 0.2 + (row / 19) * 0.6] as const)).flat()
  return spots.reduce((sum, [u, v]) => sum + rednessAt(dye, u, v), 0) / spots.length
}

function ringAround(u: number, v: number, radius: number): [number, number][] {
  return Array.from({ length: 24 }, (_, index) => [u + Math.cos((index / 24) * 2 * Math.PI) * radius, v + Math.sin((index / 24) * 2 * Math.PI) * radius])
}
