import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../../Support/Assertions.ts'
import { GooglyPupil } from '../../../Apps/Game/Room/GooglyPupil.ts'

test('googlyPupil_whenTheHeadStandsStill_restsAtTheBottomOfTheEye', () => {
  const pupil = new GooglyPupil(0.02)

  pupil.advance(0.1, { x: 0, y: 0 })

  assertNear(pupil.offset.x, 0)
  assertNear(pupil.offset.y, -0.02)
})

test('googlyPupil_whenTheHeadJerksToTheRight_rollsToTheLeft', () => {
  const pupil = new GooglyPupil(0.02)

  pupil.advance(0.05, { x: 40, y: 0 })

  assert.ok(pupil.offset.x < 0, `the pupil is at x ${pupil.offset.x}`)
})

test('googlyPupil_whenTheHeadDropsFasterThanItFalls_floatsUpInsideTheEye', () => {
  const pupil = new GooglyPupil(0.02)

  pupil.advance(0.05, { x: 0, y: -30 })

  assert.ok(pupil.offset.y > -0.02, `the pupil is at y ${pupil.offset.y}`)
})
