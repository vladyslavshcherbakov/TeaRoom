import assert from 'node:assert/strict'
import test from 'node:test'
import { eyeHeightMetres, isAPlayerHeight, playerHeightSteppedBy, seatedShareAfter } from '../../Apps/Engine/Camera/PlayerHeight.ts'
import { assertNear } from '../Support/Assertions.ts'

test('eyeHeight_ofAPlayerOf200cmStanding_is186cm', () => {
  assertNear(eyeHeightMetres(200, 0), 1.86)
})

test('eyeHeight_ofAPlayerOf200cmSeated_is110cm', () => {
  assertNear(eyeHeightMetres(200, 1), 1.1)
})

test('eyeHeight_ofAPlayerOf200cmHalfwaySeated_isHalfwayBetween186cmAnd110cm', () => {
  assertNear(eyeHeightMetres(200, 0.5), 1.48)
})

test('seatedShare_whileSittingDownFor04Seconds_isHalfway', () => {
  assertNear(seatedShareAfter(0, true, 0.4), 0.5)
})

test('seatedShare_whileStandingUpForLong_isZero', () => {
  assert.equal(seatedShareAfter(1, false, 5), 0)
})

test('playerHeight_steppedUpAt200cm_staysAt200cm', () => {
  assert.equal(playerHeightSteppedBy(200, 1), 200)
})

test('playerHeight_steppedDownAt70cm_staysAt70cm', () => {
  assert.equal(playerHeightSteppedBy(70, -1), 70)
})

test('playerHeight_steppedUpAt140cm_becomes141cm', () => {
  assert.equal(playerHeightSteppedBy(140, 1), 141)
})

test('playerHeight_below70cmOrAbove200cm_isNotAPlayerHeight', () => {
  assert.deepEqual([69, 70, 200, 201].map(isAPlayerHeight), [false, true, true, false])
})
