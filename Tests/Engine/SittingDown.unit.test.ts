import assert from 'node:assert/strict'
import test from 'node:test'
import type { FirstPersonLook } from '../../Apps/Engine/Camera/FirstPersonLook.ts'
import { SittingDown, type SeatInFirstPerson } from '../../Apps/Engine/Camera/SittingDown.ts'
import { assertNear } from '../Support/Assertions.ts'

const lookingAway: FirstPersonLook = { headingRadians: Math.PI, pitchRadians: 0 }
const standing: SeatInFirstPerson = { isSeated: false, look: lookingAway, tableInView: { x: 0, y: 0.4, z: 1 }, walker: { x: 0, z: 0 }, playerHeightCentimetres: 165 }
const seated: SeatInFirstPerson = { ...standing, isSeated: true }

test('look_whileSittingDownAtTheTable_turnsToTheTableBeforeThePlayerIsSeated', () => {
  const sittingDown = new SittingDown(() => {})

  const look = lookWhileSeatedFor(sittingDown, 2)

  assertNear(look.headingRadians, 0)
  assert.equal(sittingDown.seatedShare, 1)
})

test('look_onceSeated_isFreeToLookAround', () => {
  const sittingDown = new SittingDown(() => {})
  lookWhileSeatedFor(sittingDown, 2)

  const look = sittingDown.lookAfterAFrame({ ...seated, look: lookingAway }, 0.1)

  assert.deepEqual(look, lookingAway)
})

test('look_whileStandingUp_staysWhereItWas', () => {
  const sittingDown = new SittingDown(() => {})
  lookWhileSeatedFor(sittingDown, 2)

  const look = sittingDown.lookAfterAFrame({ ...standing, look: lookingAway }, 0.1)

  assert.deepEqual(look, lookingAway)
  assert.ok(sittingDown.seatedShare < 1)
})

function lookWhileSeatedFor(sittingDown: SittingDown, seconds: number): FirstPersonLook {
  let look = lookingAway
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.1) look = sittingDown.lookAfterAFrame({ ...seated, look }, 0.1)
  return look
}
