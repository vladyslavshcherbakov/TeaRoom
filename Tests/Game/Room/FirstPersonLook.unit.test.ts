import assert from 'node:assert/strict'
import test from 'node:test'
import { firstPersonPose, lookAt, lookBetween, lookTurnedBy, lookTurnedByTheMouse, lookTurnedTowards, stepFor } from '../../../Apps/Game/Room/Camera/FirstPersonLook.ts'
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
  const pose = firstPersonPose({ x: 0, z: 0 }, look, 1.3)

  assert.ok(pose.target.x > 0, `target x ${pose.target.x}`)
})

test('look_whenTiltedUpForLong_stopsAtItsSteepest', () => {
  const look = lookTurnedBy({ headingRadians: 0, pitchRadians: 0 }, { right: 0, up: 1 }, 60)

  assert.equal(look.pitchRadians, 1)
})

test('firstPersonCamera_standsAtTheWalkersEyes', () => {
  const pose = firstPersonPose({ x: 0.5, z: -1 }, { headingRadians: 0, pitchRadians: 0 }, 1.3)

  assert.deepEqual(pose.position, { x: 0.5, y: 1.3, z: -1 })
})

test('look_whenTurnedTowardsAWalk_turnsPartWayAtFirst', () => {
  const look = lookTurnedTowards({ headingRadians: 0, pitchRadians: 0 }, Math.PI / 2, 0.1)

  assert.ok(look.headingRadians > 0 && look.headingRadians < Math.PI / 2, `heading ${look.headingRadians}`)
})

test('look_whenTurnedTowardsAWalkBehindItsLeft_turnsTheShortWay', () => {
  const look = lookTurnedTowards({ headingRadians: 3, pitchRadians: 0 }, -3, 0.1)

  assert.ok(look.headingRadians > 3, `heading ${look.headingRadians}`)
})


test('look_whenTheMouseMovesRight_turnsRight', () => {
  const look = lookTurnedByTheMouse({ headingRadians: 0, pitchRadians: 0 }, { x: 400, y: 0 })

  assertNear(look.headingRadians, -1)
})

test('look_whenTheMouseMovesFarUp_stopsAtItsSteepest', () => {
  const look = lookTurnedByTheMouse({ headingRadians: 0, pitchRadians: 0 }, { x: 0, y: -4000 })

  assertNear(look.pitchRadians, 1)
})

test('look_atAPointAheadAndBelow_facesItAndLooksDown', () => {
  const look = lookAt({ x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 })

  assertNear(look.headingRadians, 0)
  assertNear(look.pitchRadians, -Math.PI / 4)
})

test('look_halfwayBetweenTwoLooksAcrossTheBack_turnsTheShortWay', () => {
  const look = lookBetween({ headingRadians: 3, pitchRadians: 0 }, { headingRadians: -3, pitchRadians: -0.4 }, 0.5)

  assertNear(Math.cos(look.headingRadians), -1)
  assertNear(look.pitchRadians, -0.2)
})
