import assert from 'node:assert/strict'
import test from 'node:test'
import { eyeHeightMetres, isAKeeperHeight, keeperHeightSteppedBy, seatedShareAfter } from '../../../Apps/Game/Room/Camera/KeeperHeight.ts'
import { assertNear } from '../../Support/Assertions.ts'

test('eyeHeight_ofAKeeperOf200cmStanding_is186cm', () => {
  assertNear(eyeHeightMetres(200, 0), 1.86)
})

test('eyeHeight_ofAKeeperOf200cmSeated_is110cm', () => {
  assertNear(eyeHeightMetres(200, 1), 1.1)
})

test('eyeHeight_ofAKeeperOf200cmHalfwaySeated_isHalfwayBetween186cmAnd110cm', () => {
  assertNear(eyeHeightMetres(200, 0.5), 1.48)
})

test('seatedShare_whileSittingDownFor04Seconds_isHalfway', () => {
  assertNear(seatedShareAfter(0, true, 0.4), 0.5)
})

test('seatedShare_whileStandingUpForLong_isZero', () => {
  assert.equal(seatedShareAfter(1, false, 5), 0)
})

test('keeperHeight_steppedUpAt200cm_staysAt200cm', () => {
  assert.equal(keeperHeightSteppedBy(200, 1), 200)
})

test('keeperHeight_steppedDownAt70cm_staysAt70cm', () => {
  assert.equal(keeperHeightSteppedBy(70, -1), 70)
})

test('keeperHeight_steppedUpAt140cm_becomes141cm', () => {
  assert.equal(keeperHeightSteppedBy(140, 1), 141)
})

test('keeperHeight_below70cmOrAbove200cm_isNotAKeeperHeight', () => {
  assert.deepEqual([69, 70, 200, 201].map(isAKeeperHeight), [false, true, true, false])
})
