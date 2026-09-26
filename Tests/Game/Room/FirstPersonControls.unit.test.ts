import assert from 'node:assert/strict'
import test from 'node:test'
import { sticksShownFor, walkFromTheKeys } from '../../../Apps/Game/Room/Camera/FirstPersonControls.ts'
import { assertNear } from '../../Support/Assertions.ts'

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

test('walkFromTheKeys_withWHeld_goesForward', () => {
  assert.deepEqual(walkFromTheKeys(new Set(['KeyW'])), { right: 0, up: 1 })
})

test('walkFromTheKeys_withTheUpAndRightArrowsHeld_goesDiagonallyNoFasterThanStraight', () => {
  const walk = walkFromTheKeys(new Set(['ArrowUp', 'ArrowRight']))

  assertNear(walk.right, Math.SQRT1_2)
  assertNear(walk.up, Math.SQRT1_2)
})
