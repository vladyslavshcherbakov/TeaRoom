import assert from 'node:assert/strict'
import test from 'node:test'
import { standingAt, turningRadiansPerSecond, walkFurther } from '../../Apps/Engine/Walking/Walk.ts'
import { assertNear } from '../Support/Assertions.ts'

const tenthOfASecond = 0.1

test('walk_towardsAWaypointBehind_turnsInPlaceBeforeItSteps', () => {
  const walk = { ...standingAt({ x: 0, z: 0 }, 0), waypoints: [{ x: 0, z: -2 }] }

  const walkAfterATenth = walkFurther(walk, tenthOfASecond)

  assert.deepEqual(walkAfterATenth.position, { x: 0, z: 0 })
  assertNear(Math.abs(walkAfterATenth.headingRadians), turningRadiansPerSecond * tenthOfASecond, 1e-9)
})

test('walk_towardsAWaypointAhead_stepsAtOnce', () => {
  const walk = { ...standingAt({ x: 0, z: 0 }, 0), waypoints: [{ x: 0, z: 2 }] }

  const walkAfterATenth = walkFurther(walk, tenthOfASecond)

  assertNear(walkAfterATenth.position.z, 0.16, 1e-9)
})

test('walk_towardsAWaypointALittleToTheSide_stepsWhileItTurnsNoFasterThanItsTurningSpeed', () => {
  const walk = { ...standingAt({ x: 0, z: 0 }, 0), waypoints: [{ x: 2, z: 2 }] }

  const walkAfterATenth = walkFurther(walk, tenthOfASecond)

  assert.ok(walkAfterATenth.position.x > 0)
  assertNear(walkAfterATenth.headingRadians, turningRadiansPerSecond * tenthOfASecond, 1e-9)
})
