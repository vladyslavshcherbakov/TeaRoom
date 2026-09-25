import assert from 'node:assert/strict'
import test from 'node:test'
import type { RoomTapTarget } from '../../../Apps/Game/Room/RoomPlay.ts'
import { tapTargetAmong, type TapHit } from '../../../Apps/Game/Room/TapTargetAmong.ts'

const firstHandsArea: TapHit = { target: { kind: 'hand', handIndex: 0 }, isForgivingTouchArea: true }
const shelfSurface: TapHit = { target: { kind: 'surface', furnitureId: 'shelf', point: { x: 0, y: 1, z: 0 } }, isForgivingTouchArea: false }
const bowlOnTheShelf: TapHit = { target: { kind: 'item', itemId: 'bowl7' }, isForgivingTouchArea: false }
const bowlsTouchPad: TapHit = { target: { kind: 'item', itemId: 'bowl7' }, isForgivingTouchArea: true }
const frontBowlsTouchPad: TapHit = { target: { kind: 'item', itemId: 'bowl3' }, isForgivingTouchArea: true }
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

test('tap_throughAHandsAreaOnAnItemSeenBehind_reachesTheItemWhetherOrNotTheHandIsChosen', () => {
  for (const chosenHandIndex of [0, 1, null] as const) {
    const target = tapTargetAmong([firstHandsArea, bowlOnTheShelf, shelfSurface], chosenHandIndex, canActOnNothing)

    assert.deepEqual(target, bowlOnTheShelf.target)
  }
})

test('tap_throughAHandsAreaOnlyOnAnItemsTouchPad_staysOnTheHand', () => {
  const target = tapTargetAmong([firstHandsArea, bowlsTouchPad, shelfSurface], null, canActOnNothing)

  assert.deepEqual(target, { kind: 'hand', handIndex: 0 } satisfies RoomTapTarget)
})

test('tap_throughAStandingItemsTouchPadOnAnotherItemSeenBehind_reachesTheItemSeen', () => {
  const target = tapTargetAmong([frontBowlsTouchPad, bowlOnTheShelf, shelfSurface], 0, canActOnAnything)

  assert.deepEqual(target, bowlOnTheShelf.target)
})

test('tap_onAStandingItemsTouchPadWithNoItemSeenBehind_reachesThatItem', () => {
  const target = tapTargetAmong([frontBowlsTouchPad, shelfSurface], null, canActOnNothing)

  assert.deepEqual(target, frontBowlsTouchPad.target)
})
