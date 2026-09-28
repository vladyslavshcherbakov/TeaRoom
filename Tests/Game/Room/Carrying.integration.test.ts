import assert from 'node:assert/strict'
import test from 'node:test'
import { furnitureWithId } from '../../../Apps/Game/Room/RoomLayout.ts'
import type { FloorPoint } from '../../../Apps/Engine/Points.ts'
import { quietRoomLayout, inFrontOfTheTeaTable, onTheTeaTable, openFloorFrontRight, spotOn, TestRoom, withoutTheTurn } from '../../Support/TestRoom.ts'
import { itemIdsInTheHands } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'

test('bowl_whenTappedInTheShelfCloseUp_goesIntoTheFirstFreeHand', () => {
  const room = new TestRoom()
  room.walkTo('shelf')

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(itemIdsInTheHands(room.state), ['bowl1', null, null])
})

test('bowl_whenPickedUpByATap_isChosenAtOnce', () => {
  const room = new TestRoom()
  room.walkTo('shelf')
  room.tap({ kind: 'item', itemId: 'bowl1' })

  room.tap({ kind: 'item', itemId: 'bowl2' })

  assert.deepEqual(itemIdsInTheHands(room.state), ['bowl1', 'bowl2', null])
  assert.equal(room.playerController.chosenHandIndex, 1)
})

test('bowl_whenItsHandIsChosenAndTheTeaTableIsTapped_standsWhereTheTableWasTapped', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('teaTable')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.deepEqual(withoutTheTurn(room.state.vessels['bowl1']?.location), { kind: 'onSurface', spot: spotOn('teaTable', onTheTeaTable) })
  assert.equal(room.playerController.chosenHandIndex, null)
})

test('bowl_putDownOnTheTeaTableFromItsFrontSide_facesTheFront', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('teaTable')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.ok(Math.abs(turnOfTheBowl(room)) < 0.5, `the bowl is turned ${turnOfTheBowl(room)} rad`)
})

test('bowl_putDownOnTheTeaTableFromItsFarSide_facesTheFarSide', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkAcrossTheFloorTo(farSideOfTheTeaTable())
  room.walkTo('teaTable')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.ok(Math.abs(turnOfTheBowl(room)) > Math.PI - 0.5, `the bowl is turned ${turnOfTheBowl(room)} rad`)
})

test('surfaceTap_withNoHandChosen_leavesTheItemInHand', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('teaTable')

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.deepEqual(itemIdsInTheHands(room.state), ['bowl1', null, null])
})

test('bowl_whenPutDownWhereAnotherBowlStands_staysInHandWithItsHandChosen', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1', 'bowl2')
  room.walkTo('teaTable')
  room.putDown(0, onTheTeaTable)
  room.tap({ kind: 'hand', handIndex: 1 })

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: { ...onTheTeaTable, x: onTheTeaTable.x + 0.1 } })

  assert.deepEqual(itemIdsInTheHands(room.state), [null, 'bowl2', null])
  assert.equal(room.playerController.chosenHandIndex, 1)
})

test('bowl_whenTappedShortlyWithTheKettleInHand_isPickedUp', () => {
  const room = new TestRoom()
  room.bringABowlToTheCounterAndTakeTheKettle()

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(itemIdsInTheHands(room.state), ['kettle', 'bowl1', null])
  assert.equal(room.state.pour, null)
})

test('spoon_whenTappedAtTheTeaTable_goesIntoTheFirstFreeHand', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')

  room.tap({ kind: 'item', itemId: 'spoon' })

  assert.deepEqual(itemIdsInTheHands(room.state), ['spoon', null, null])
})

test('chosenItem_behindItsGlow_canBePutDownOnTheTableThatTheTapHit', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.takeAndChoose('cloth')

  const doesTheTapReachTheTable = room.playerController.doesATapReachPastTheChosenHand({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.equal(doesTheTapReachTheTable, true)
})

test('chosenItem_behindItsGlow_letsTheHandKeepATapOnTheFloor', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.takeAndChoose('cloth')

  const doesTheTapReachTheFloor = room.playerController.doesATapReachPastTheChosenHand({ kind: 'floor', point: inFrontOfTheTeaTable })

  assert.equal(doesTheTapReachTheFloor, false)
})

test('bowl_whenTappedWithTheClothChosen_isTakenIntoTheOtherHand', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.takeAndChoose('cloth')

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(itemIdsInTheHands(room.state), ['cloth', 'bowl1', null])
})

test('chosenHand_whenThePlayerLeavesTheCloseUp_staysChosen', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.takeAndChoose('kettle')

  room.tap({ kind: 'floor', point: openFloorFrontRight })

  assert.equal(room.playerController.chosenHandIndex, 0)
})

test('chosenHand_whenTappedInTheRoomView_staysChosen', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.takeAndChoose('kettle')
  room.tap({ kind: 'floor', point: openFloorFrontRight })

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.equal(room.playerController.chosenHandIndex, 0)
})

test('hand_whenItsKeyIsPressedAtTheCounter_isChosen', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })

  room.playerController.handKeyTapped(0)

  assert.equal(room.playerController.chosenHandIndex, 0)
})

function turnOfTheBowl(room: TestRoom): number {
  const location = room.state.vessels['bowl1']?.location
  return location?.kind === 'onSurface' ? location.spot.turnRadians ?? Number.NaN : Number.NaN
}

function farSideOfTheTeaTable(): FloorPoint {
  const [, farSide] = furnitureWithId(quietRoomLayout, 'teaTable').sides
  if (farSide === undefined) throw new Error('the quiet room has a tea table with one side')
  return farSide.standingPoint
}
