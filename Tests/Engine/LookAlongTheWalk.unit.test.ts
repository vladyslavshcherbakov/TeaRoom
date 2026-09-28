import assert from 'node:assert/strict'
import test from 'node:test'
import { LookAlongTheWalk, type LookControls } from '../../Apps/Engine/Camera/LookAlongTheWalk.ts'
import type { FirstPersonLook } from '../../Apps/Engine/Camera/FirstPersonLook.ts'
import type { Walk } from '../../Apps/Engine/Walking/Walk.ts'
import { assertNear } from '../Support/Assertions.ts'

const lookingAhead: FirstPersonLook = { headingRadians: 0, pitchRadians: 0 }
const walkToTheLeft: Walk = { position: { x: 0, z: 0 }, headingRadians: Math.PI / 2, waypoints: [{ x: 2, z: 0 }] }
const untouched: LookControls = { mouseMovement: null, lookStick: null }
const lookStickPushedRight: LookControls = { mouseMovement: null, lookStick: { right: 1, up: 0 } }
const mouseMovedUp: LookControls = { mouseMovement: { x: 0, y: -40 }, lookStick: null }
const firstWalk = 1
const secondWalk = 2

test('look_duringAWalkNobodyTurnsIt_turnsTowardsTheWay', () => {
  const lookAlongTheWalk = new LookAlongTheWalk(firstWalk, () => {})

  const look = lookAlongTheWalk.lookAfterAFrame(lookingAhead, untouched, walkToTheLeft, firstWalk, 3)

  assertNear(look.headingRadians, Math.PI / 2)
})

test('look_afterThePlayerTurnsItWithTheStickDuringAWalk_staysWhereThePlayerLeftIt', () => {
  const lookAlongTheWalk = new LookAlongTheWalk(firstWalk, () => {})
  const lookTurnedByThePlayer = lookAlongTheWalk.lookAfterAFrame(lookingAhead, lookStickPushedRight, walkToTheLeft, firstWalk, 0.1)

  const look = lookAlongTheWalk.lookAfterAFrame(lookTurnedByThePlayer, untouched, walkToTheLeft, firstWalk, 3)

  assert.deepEqual(look, lookTurnedByThePlayer)
})

test('look_afterThePlayerTurnsItWithTheMouseDuringAWalk_staysWhereThePlayerLeftIt', () => {
  const lookAlongTheWalk = new LookAlongTheWalk(firstWalk, () => {})
  const lookTurnedByThePlayer = lookAlongTheWalk.lookAfterAFrame(lookingAhead, mouseMovedUp, walkToTheLeft, firstWalk, 0.1)

  const look = lookAlongTheWalk.lookAfterAFrame(lookTurnedByThePlayer, untouched, walkToTheLeft, firstWalk, 3)

  assert.deepEqual(look, lookTurnedByThePlayer)
})

test('look_whenTheNextWalkStartsAfterThePlayerTurnedIt_turnsTowardsTheNewWay', () => {
  const lookAlongTheWalk = new LookAlongTheWalk(firstWalk, () => {})
  const lookTurnedByThePlayer = lookAlongTheWalk.lookAfterAFrame(lookingAhead, lookStickPushedRight, walkToTheLeft, firstWalk, 0.1)

  const look = lookAlongTheWalk.lookAfterAFrame(lookTurnedByThePlayer, untouched, walkToTheLeft, secondWalk, 3)

  assertNear(look.headingRadians, Math.PI / 2)
})
