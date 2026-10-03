import assert from 'node:assert/strict'
import test from 'node:test'
import type { TapTarget } from '../../../Apps/Game/Room/TapTarget.ts'
import { isReachedThroughItsAreaOnTheScreen, tapTargetAmong } from '../../../Apps/Game/Room/TapTargetAmong.ts'

const firstHand: TapTarget = { kind: 'hand', handIndex: 0 }
const firstPlaceOfTheInventory: TapTarget = { kind: 'inventorySlot', slotIndex: 0 }
const nothing: TapTarget = { kind: 'nothing' }
const shelfSurface: TapTarget = { kind: 'surface', furnitureId: 'shelf', point: { x: 0, y: 1, z: 0 } }
const bowlOnTheShelf: TapTarget = { kind: 'item', itemId: 'bowl7' }
const frontBowl: TapTarget = { kind: 'item', itemId: 'bowl3' }
const faucet: TapTarget = { kind: 'faucet' }
const sink: TapTarget = { kind: 'sink' }
const kettlesLid: TapTarget = { kind: 'lid', itemId: 'kettle' }
const settingsGear: TapTarget = { kind: 'settingsGear' }
const guideBook: TapTarget = { kind: 'guideBook' }
const heaterPanel: TapTarget = { kind: 'heaterPanel' }
const upArrow: TapTarget = { kind: 'thermostatArrow', step: 1 }
const canActOnAnything = (): boolean => true
const canActOnNothing = (): boolean => false

test('tap_onNothing_hitsNothing', () => {
  assert.deepEqual(tapTargetAmong(nothing, [], canActOnAnything), nothing)
})

test('tap_throughAHandsAreaOnWhatHasActions_reachesWhatIsBehind', () => {
  const target = tapTargetAmong(shelfSurface, [firstHand], canActOnAnything)

  assert.deepEqual(target, shelfSurface)
})

test('tap_throughAHandsAreaOnWhatHasNoActions_staysOnTheHand', () => {
  const target = tapTargetAmong(shelfSurface, [firstHand], canActOnNothing)

  assert.deepEqual(target, firstHand)
})

test('tap_onAnItemInsideAHandsArea_reachesTheItem', () => {
  const target = tapTargetAmong(bowlOnTheShelf, [firstHand], canActOnNothing)

  assert.deepEqual(target, bowlOnTheShelf)
})

test('tap_throughAHandsAreaOnlyOnAnItemsArea_staysOnTheHand', () => {
  const target = tapTargetAmong(shelfSurface, [firstHand, bowlOnTheShelf], canActOnNothing)

  assert.deepEqual(target, firstHand)
})

test('tap_throughAHandsAreaOnAnItemsArea_reachesThatItemWhenItHasActions', () => {
  const target = tapTargetAmong(shelfSurface, [firstHand, frontBowl], canActOnAnything)

  assert.deepEqual(target, frontBowl)
})

test('tap_onAnItemInsideAnotherItemsArea_reachesTheItemTouched', () => {
  const target = tapTargetAmong(bowlOnTheShelf, [frontBowl], canActOnAnything)

  assert.deepEqual(target, bowlOnTheShelf)
})

test('tap_throughAStandingItemsAreaOnAPlace_reachesThatItem', () => {
  const target = tapTargetAmong(shelfSurface, [frontBowl], canActOnNothing)

  assert.deepEqual(target, frontBowl)
})

test('tap_onAKettlesLidInsideTheFaucetsArea_reachesTheLid', () => {
  const target = tapTargetAmong(kettlesLid, [faucet], canActOnNothing)

  assert.deepEqual(target, kettlesLid)
})

test('tap_throughTheFaucetsAreaOnTheSinkUnderIt_reachesTheSink', () => {
  const target = tapTargetAmong(sink, [faucet], canActOnNothing)

  assert.deepEqual(target, sink)
})

test('tap_throughAHandsAreaOnTheSinkBehind_staysOnTheHand', () => {
  const target = tapTargetAmong(sink, [firstHand], canActOnNothing)

  assert.deepEqual(target, firstHand)
})

test('tap_onTheGuideBookInsideTheGearsArea_opensTheBook', () => {
  const target = tapTargetAmong(guideBook, [settingsGear], canActOnAnything)

  assert.deepEqual(target, guideBook)
})

test('tap_throughAControlsAreaOnThePanelAroundIt_reachesTheControl', () => {
  const target = tapTargetAmong(heaterPanel, [upArrow], canActOnNothing)

  assert.deepEqual(target, upArrow)
})

test('areaOnTheScreen_isGivenToThingsAndNotToPlacesPartsOfAnItemOrTheRoseBush', () => {
  const targets: readonly TapTarget[] = [bowlOnTheShelf, faucet, settingsGear, upArrow, { kind: 'figurine', figurineId: 'toad' }, shelfSurface, sink, heaterPanel, kettlesLid, { kind: 'opening', itemId: 'bowl3' }, { kind: 'roseBush' }]

  const kindsWithAnArea = targets.filter((target) => isReachedThroughItsAreaOnTheScreen(target, false)).map((target) => target.kind)

  assert.deepEqual(kindsWithAnArea, ['item', 'faucet', 'settingsGear', 'thermostatArrow', 'figurine'])
})

test('areaOnTheScreen_ofAHand_isGivenOnlyWhileItIsDrawnOverTheScene', () => {
  assert.deepEqual([isReachedThroughItsAreaOnTheScreen(firstHand, true), isReachedThroughItsAreaOnTheScreen(firstHand, false)], [true, false])
})

test('areaOnTheScreen_ofAPlaceOfTheInventory_isGivenOnlyWhileItIsDrawnOverTheScene', () => {
  assert.deepEqual([isReachedThroughItsAreaOnTheScreen(firstPlaceOfTheInventory, true), isReachedThroughItsAreaOnTheScreen(firstPlaceOfTheInventory, false)], [true, false])
})

test('tap_throughAPlaceOfTheInventoryOnTheShelf_staysOnTheInventoryEvenWhenTheShelfHasActions', () => {
  const target = tapTargetAmong(shelfSurface, [firstPlaceOfTheInventory], canActOnAnything)

  assert.deepEqual(target, firstPlaceOfTheInventory)
})
