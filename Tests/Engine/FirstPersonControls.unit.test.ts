import assert from 'node:assert/strict'
import test from 'node:test'
import { sticksShownFor, walkAsked, walkFromTheKeys } from '../../Apps/Engine/Camera/FirstPersonControls.ts'
import { assertNear } from '../Support/Assertions.ts'

test('sticks_withTwoSticksAndWalkOnTheLeft_walkLeftAndLookRight', () => {
  assert.deepEqual(sticksShownFor('twoSticks', 'walkOnTheLeft'), { left: 'walk', right: 'look' })
})

test('sticks_withMouseAndKeyboard_areNotShown', () => {
  assert.deepEqual(sticksShownFor('mouseAndKeyboard', 'walkOnTheLeft'), { left: null, right: null })
})

test('sticks_withTheMouseAndTheWalkStickOnTheRight_showOnlyTheWalkStickOnTheRight', () => {
  assert.deepEqual(sticksShownFor('mouseAndWalkStick', 'lookOnTheLeft'), { left: null, right: 'walk' })
})

test('sticks_withTheKeyboardAndTheLookStickOnTheLeft_showOnlyTheLookStickOnTheLeft', () => {
  assert.deepEqual(sticksShownFor('keyboardAndLookStick', 'lookOnTheLeft'), { left: 'look', right: null })
})

test('keyboardWalk_withWHeld_goesForward', () => {
  assert.deepEqual(walkFromTheKeys(new Set(['KeyW'])), { right: 0, up: 1 })
})

test('keyboardWalk_withTheUpAndRightArrowsHeld_goesDiagonallyNoFasterThanStraight', () => {
  const walk = walkFromTheKeys(new Set(['ArrowUp', 'ArrowRight']))

  assertNear(walk.right, Math.SQRT1_2)
  assertNear(walk.up, Math.SQRT1_2)
})

const sticksAtRest = { left: { right: 0, up: 0 }, right: { right: 0, up: 0 } }
const leftStickPushedForward = { left: { right: 0, up: 1 }, right: { right: 0, up: 0 } }

test('walk_withTheKeysHeldAndTheWalkStickPushed_followsTheKeys', () => {
  assert.deepEqual(walkAsked('mouseAndKeyboard', 'walkOnTheLeft', new Set(['KeyD']), leftStickPushedForward), { right: 1, up: 0 })
})

test('walk_withTwoSticksAndTheWalkStickOnTheLeft_followsTheLeftStick', () => {
  assert.deepEqual(walkAsked('twoSticks', 'walkOnTheLeft', new Set(['KeyD']), leftStickPushedForward), { right: 0, up: 1 })
})

test('walk_withTheKeyboardAndALookStickAndNoKeyHeld_standsStill', () => {
  assert.deepEqual(walkAsked('keyboardAndLookStick', 'lookOnTheLeft', new Set(), leftStickPushedForward), { right: 0, up: 0 })
})

test('walk_withTwoSticksAtRest_standsStill', () => {
  assert.deepEqual(walkAsked('twoSticks', 'walkOnTheLeft', new Set(), sticksAtRest), { right: 0, up: 0 })
})
