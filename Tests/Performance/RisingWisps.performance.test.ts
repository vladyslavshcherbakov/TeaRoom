import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { RisingWisps, type WispsMotion } from '../../Apps/Engine/Rendering/Wisps/RisingWisps.ts'
import { secondsTakenBy } from '../Support/Stopwatch.ts'

const motion: WispsMotion = { riseMetresPerSecond: 0.07, lifeSeconds: 2.2, swirlMetresPerSecond: 0.05, swirlSizeMetres: 0.05, swirlChangePerSecond: 0.6, sizeMetres: 0.035, bornWithinMetres: 0.03, keptShareOfTheSourcesSpeed: 0.5, kickFadePerSecond: 2.5 }
const steamingItems = 4
const mostWispsOfOneItem = 160
const wispsPerSecondOfOneSource = 80
const framesInAMinute = 3600
const frameSeconds = 1 / 60
const millisecondsPerFrameAtMost = 1

test('wispsOfFourFullySteamingItems_whenAdvancedAMinuteFrameByFrame_takeUnderAMillisecondAFrame', () => {
  const clouds = Array.from({ length: steamingItems }, () => new RisingWisps(mostWispsOfOneItem, motion, { colour: '#ffffff', opacity: 0.1 }))
  const sources = clouds.map((_, index) => [{ position: new THREE.Vector3(index, 0, 0), wispsPerSecond: wispsPerSecondOfOneSource, lean: new THREE.Vector3(0, 1, 0), scale: 1 }])
  for (let frame = 0; frame < 180; frame += 1) clouds.forEach((cloud, index) => cloud.advance(frameSeconds, frame * frameSeconds, sources[index] ?? []))

  const seconds = secondsTakenBy(() => {
    for (let frame = 0; frame < framesInAMinute; frame += 1) clouds.forEach((cloud, index) => cloud.advance(frameSeconds, frame * frameSeconds, sources[index] ?? []))
  })

  const millisecondsPerFrame = (seconds * 1000) / framesInAMinute
  assert.ok(clouds.every((cloud) => cloud.count === mostWispsOfOneItem), clouds.map((cloud) => cloud.count).join(', '))
  assert.ok(millisecondsPerFrame <= millisecondsPerFrameAtMost, `${millisecondsPerFrame.toFixed(3)} ms a frame, more than ${millisecondsPerFrameAtMost}`)
})
