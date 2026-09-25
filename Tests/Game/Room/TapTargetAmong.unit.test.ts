import assert from 'node:assert/strict'
import test from 'node:test'
import type { RoomTapTarget } from '../../../Apps/Game/Room/RoomPlay.ts'
import { tapTargetAmong, type TapHit } from '../../../Apps/Game/Room/TapTargetAmong.ts'

const firstHandsArea: TapHit = { target: { kind: 'hand', handIndex: 0 }, isForgivingTouchArea: true }
const shelfSurface: TapHit = { target: { kind: 'surface', furnitureId: 'shelf', point: { x: 0, y: 1, z: 0 } }, isForgivingTouchArea: false }
const canActOnAnything = (): boolean => true
const canActOnNothing = (): boolean => false

test('tap_onNothing_hitsNothing', () => {
  assert.deepEqual(tapTargetAmong([], null, canActOnAnything), { kind: 'nothing' })
})

test('tap_throughTheChosenHandsAreaOnWhatItsItemCanActOn_reachesWhatIsBehind', () => {
  const target = tapTargetAmong([firstHandsArea, shelfSurface], 0, canActOnAnything)

  assert.deepEqual(target, shelfSurface.target)
})

test('tap_throughTheChosenHandsAreaOnWhatItsItemCannotActOn_staysOnTheHand', () => {
  const target = tapTargetAmong([firstHandsArea, shelfSurface], 0, canActOnNothing)

  assert.deepEqual(target, { kind: 'hand', handIndex: 0 } satisfies RoomTapTarget)
})
