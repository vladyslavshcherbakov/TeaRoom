import assert from 'node:assert/strict'
import test from 'node:test'
import { firstPersonPose, lookTurnedBy, stepFor } from '../../../Apps/Game/Room/Camera/FirstPersonLook.ts'
import { assertNear } from '../../Support/Assertions.ts'

test('step_whenTheStickIsPushedUp_goesForwardAlongTheHeading', () => {
  const step = stepFor({ right: 0, up: 1 }, 0, 1)

  assertNear(step.x, 0)
  assertNear(step.z, 1.6)
})

test('step_whenTheStickIsPushedRightFacingForward_goesToTheScreensRight', () => {
  const step = stepFor({ right: 1, up: 0 }, Math.PI, 1)

  assertNear(step.x, 1.6)
  assertNear(step.z, 0)
})

test('look_whenTheStickIsPushedRight_turnsRight', () => {
  const look = lookTurnedBy({ headingRadians: Math.PI, pitchRadians: 0 }, { right: 1, up: 0 }, 0.5)
  const pose = firstPersonPose({ x: 0, z: 0 }, look)

  assert.ok(pose.target.x > 0, `target x ${pose.target.x}`)
})

test('look_whenTiltedUpForLong_stopsAtItsSteepest', () => {
  const look = lookTurnedBy({ headingRadians: 0, pitchRadians: 0 }, { right: 0, up: 1 }, 60)

  assert.equal(look.pitchRadians, 1)
})

test('firstPersonPose_standsAtTheWalkersEyes', () => {
  const pose = firstPersonPose({ x: 0.5, z: -1 }, { headingRadians: 0, pitchRadians: 0 })

  assert.deepEqual(pose.position, { x: 0.5, y: 1, z: -1 })
})
