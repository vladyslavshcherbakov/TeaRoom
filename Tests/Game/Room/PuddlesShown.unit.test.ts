import assert from 'node:assert/strict'
import test from 'node:test'
import { PuddlesShown } from '../../../Apps/Game/Room/PuddlesShown.ts'

const halfASecondToLand = 0.5

test('puddle_whileTheWaterThatMadeItStillFalls_isNotShown', () => {
  const shown = new PuddlesShown()
  shown.puddlesAfterAFrame([puddleOf(0.1)], 10, halfASecondToLand)

  const puddlesShown = shown.puddlesAfterAFrame([puddleOf(0.1)], 10.4, halfASecondToLand)

  assert.deepEqual(puddlesShown, [])
})

test('puddle_whenTheWaterThatMadeItHasLanded_isShown', () => {
  const shown = new PuddlesShown()
  shown.puddlesAfterAFrame([puddleOf(0.1)], 10, halfASecondToLand)

  const puddlesShown = shown.puddlesAfterAFrame([puddleOf(0.1)], 10.5, halfASecondToLand)

  assert.deepEqual(puddlesShown.map((puddle) => puddle.radiusMetres), [0.1])
})

test('puddle_whileItGrowsUnderAFallingStream_isShownAsLargeAsTheWaterThatHasLanded', () => {
  const shown = new PuddlesShown()
  shown.puddlesAfterAFrame([puddleOf(0.1)], 10, halfASecondToLand)
  shown.puddlesAfterAFrame([puddleOf(0.2)], 10.5, halfASecondToLand)

  const puddlesShown = shown.puddlesAfterAFrame([puddleOf(0.3)], 10.6, halfASecondToLand)

  assert.deepEqual(puddlesShown.map((puddle) => puddle.radiusMetres), [0.1])
})

test('puddle_whenWipedSmaller_isShownSmallerAtOnce', () => {
  const shown = new PuddlesShown()
  shown.puddlesAfterAFrame([puddleOf(0.3)], 10, 0)

  const puddlesShown = shown.puddlesAfterAFrame([puddleOf(0.1)], 10.1, halfASecondToLand)

  assert.deepEqual(puddlesShown.map((puddle) => puddle.radiusMetres), [0.1])
})

test('puddle_alreadyShownWhenAStreamStartsFalling_staysAsLargeAsItWas', () => {
  const shown = new PuddlesShown()
  shown.puddlesAfterAFrame([puddleOf(0.2)], 10, 0)

  const puddlesShown = shown.puddlesAfterAFrame([puddleOf(0.3)], 10.1, halfASecondToLand)

  assert.deepEqual(puddlesShown.map((puddle) => puddle.radiusMetres), [0.2])
})

function puddleOf(radiusMetres: number) {
  return { puddleId: 'puddle1', placeId: 'teaTable', centre: { x: 0, y: 0.4, z: 0 }, radiusMetres }
}
