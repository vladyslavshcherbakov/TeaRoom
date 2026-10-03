import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { RisingWisps, type WispSource, type WispsMotion } from '../../Apps/Engine/Rendering/Wisps/RisingWisps.ts'

const motion: WispsMotion = { riseMetresPerSecond: 0.1, lifeSeconds: 2, swirlMetresPerSecond: 0.05, swirlSizeMetres: 0.05, swirlChangePerSecond: 0.5, sizeMetres: 0.03, bornWithinMetres: 0.02, keptShareOfTheSourcesSpeed: 0.5, kickFadePerSecond: 2 }
const look = { colour: '#ffffff', opacity: 0.2 }
const frameSeconds = 1 / 60
const mostWisps = 200

test('wisps_ofAStillSource_riseAboveItAndSpreadSideways', () => {
  const wisps = new RisingWisps(mostWisps, motion, look)

  advanceFor(wisps, 2, () => sourceAt(new THREE.Vector3(), 30))

  const positions = wisps.wispPositions()
  const averageHeight = positions.reduce((sum, position) => sum + position.y, 0) / positions.length
  const widestSideways = Math.max(...positions.map((position) => Math.hypot(position.x, position.z)))
  assert.ok(averageHeight > 0.05, `the wisps stand ${averageHeight.toFixed(3)} m above the source on average`)
  assert.ok(widestSideways > motion.bornWithinMetres, `the wisps spread ${widestSideways.toFixed(3)} m sideways`)
})

test('wisps_whenTheSourceStops_allFadeWithinTheirLife', () => {
  const wisps = new RisingWisps(mostWisps, motion, look)
  advanceFor(wisps, 1, () => sourceAt(new THREE.Vector3(), 30))

  advanceFor(wisps, motion.lifeSeconds + 0.1, () => sourceAt(new THREE.Vector3(), 0))

  assert.equal(wisps.count, 0)
})

test('wisps_ofASourceCarriedSideways_trailBehindIt', () => {
  const wisps = new RisingWisps(mostWisps, motion, look)
  let elapsedSeconds = 0

  advanceFor(wisps, 1, () => {
    elapsedSeconds += frameSeconds
    return sourceAt(new THREE.Vector3(0.5 * elapsedSeconds, 0, 0), 30)
  })

  const averageX = wisps.wispPositions().reduce((sum, position) => sum + position.x, 0) / wisps.count
  assert.ok(averageX < 0.5 * elapsedSeconds - 0.1, `the wisps stand at ${averageX.toFixed(3)} m and the source at ${(0.5 * elapsedSeconds).toFixed(3)} m`)
})

test('wisps_ofAFastSource_neverOutnumberTheirMost', () => {
  const wisps = new RisingWisps(mostWisps, motion, look)

  advanceFor(wisps, 2, () => sourceAt(new THREE.Vector3(), 1000))

  assert.equal(wisps.count, mostWisps)
})

function sourceAt(position: THREE.Vector3, wispsPerSecond: number): WispSource {
  return { position, wispsPerSecond, lean: new THREE.Vector3(0, 1, 0), scale: 1 }
}

function advanceFor(wisps: RisingWisps, seconds: number, sourceNow: () => WispSource): void {
  for (let frame = 0; frame < Math.round(seconds / frameSeconds); frame += 1) wisps.advance(frameSeconds, frame * frameSeconds, [sourceNow()])
}
