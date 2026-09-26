import assert from 'node:assert/strict'
import test from 'node:test'
import { stepsDueWhileAnArrowIsHeld } from '../../../Apps/Game/Room/HeldArrow.ts'

test('heldArrow_heldLessThanHalfASecond_repeatsNoStep', () => {
  assert.equal(stepsDueWhileAnArrowIsHeld(0.49), 0)
})

test('heldArrow_heldHalfASecond_repeatsOneStep', () => {
  assert.equal(stepsDueWhileAnArrowIsHeld(0.5), 1)
})

test('heldArrow_heldOneAndAHalfSeconds_repeatsElevenSteps', () => {
  assert.equal(stepsDueWhileAnArrowIsHeld(1.5), 11)
})
