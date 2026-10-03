import assert from 'node:assert/strict'
import test from 'node:test'
import { furnitureWithId } from '../../../Apps/Game/Room/RoomLayout.ts'
import type { FloorPoint } from '../../../Apps/Engine/Points.ts'
import { quietRoomLayout, inFrontOfTheTeaTable, onTheTeaTable, onTopOf, openFloorFrontRight, spotOn, TestRoom, withoutTheTurn } from '../../Support/TestRoom.ts'
import { itemIdsInTheHands, itemIdsInTheInventory, standingSpotOf } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'
import { layoutOf } from '../../../Apps/Game/Room/CarriedShapes.ts'

const snugGapAtMostMetres = 0.01
const gapLeftForASecondBowlMetres = 0.005
const awayFromTheClothForwardMetres = -0.15

test('bowl_whenTappedInTheShelfCloseUp_offersToTakeItOrPutItAway', () => {
  const room = new TestRoom()
  room.walkTo('shelf')

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(room.actionsOffered(), ['take bowl', 'putAway bowl'])
})

test('bowl_whenTakeIsChosen_goesIntoTheFirstFreeHand', () => {
  const room = new TestRoom()
  room.walkTo('shelf')
  room.tap({ kind: 'item', itemId: 'bowl1' })

  room.choose('take')

  assert.deepEqual(itemIdsInTheHands(room.state), ['bowl1', null])
  assert.equal(room.playerController.actionMenuView, null)
})

test('bowl_whenPutAwayIsChosen_goesIntoTheInventory', () => {
  const room = new TestRoom()
  room.walkTo('shelf')
  room.tap({ kind: 'item', itemId: 'bowl1' })

  room.choose('putAway')

  assert.deepEqual(itemIdsInTheInventory(room.state), ['bowl1', null])
  assert.deepEqual(itemIdsInTheHands(room.state), [null, null])
})

test('bowl_whenTappedWithTheInventoryFull_offersOnlyToTakeIt', () => {
  const room = new TestRoom()
  room.walkTo('shelf')
  room.tapAndChoose({ kind: 'item', itemId: 'bowl1' }, 'putAway')
  room.tapAndChoose({ kind: 'item', itemId: 'bowl2' }, 'putAway')

  room.tap({ kind: 'item', itemId: 'bowl3' })

  assert.deepEqual(room.actionsOffered(), ['take bowl'])
})

test('bowlInTheInventory_whenItsPlaceIsTappedAndTakeChosen_comesIntoAHand', () => {
  const room = new TestRoom()
  room.walkTo('shelf')
  room.tapAndChoose({ kind: 'item', itemId: 'bowl1' }, 'putAway')
  room.walkTo('teaTable')

  room.tapAndChoose({ kind: 'inventorySlot', slotIndex: 0 }, 'take')

  assert.deepEqual(itemIdsInTheHands(room.state), ['bowl1', null])
})

test('menu_whenTheRoomIsTappedOutsideIt_closesAndNothingHappens', () => {
  const room = new TestRoom()
  room.walkTo('shelf')
  room.tap({ kind: 'item', itemId: 'bowl1' })

  room.tap({ kind: 'item', itemId: 'bowl2' })

  assert.equal(room.playerController.actionMenuView, null)
  assert.deepEqual(itemIdsInTheHands(room.state), [null, null])
})

test('teaTable_whenTappedWithABowlInHandAndPutDownChosen_hasTheBowlStandWhereItWasTapped', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('teaTable')

  room.tapAndChoose({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable }, 'putDownHere', 'bowl')

  assert.deepEqual(withoutTheTurn(room.state.vessels['bowl1']?.location), { kind: 'onSurface', spot: spotOn('teaTable', onTheTeaTable) })
})

test('teaTable_whenTappedWithAnItemInEachHand_offersToPutEitherDown', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1', 'caddy')
  room.walkTo('teaTable')

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.deepEqual(room.actionsOffered(), ['putDownHere bowl', 'putDownHere caddy'])
})

test('bowl_whenPutDownOnAnotherBowlNearTheTablesLeftEdge_fillsTheGapBetweenThemAndTheEdge', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1', 'bowl2')
  room.walkTo('teaTable')
  const bowlRadius = layoutOf(room.state, 'bowl1')?.footprintRadiusMetres ?? Number.NaN
  const firstBowlAcross = -furnitureWithId(quietRoomLayout, 'teaTable').footprint.width / 2 + 3 * bowlRadius + gapLeftForASecondBowlMetres
  const firstBowlPoint = onTopOf('teaTable', firstBowlAcross, awayFromTheClothForwardMetres)
  room.putDown(0, firstBowlPoint)

  room.tapAndChoose({ kind: 'surface', furnitureId: 'teaTable', point: firstBowlPoint }, 'putDownHere')

  const secondBowl = standingSpotOf(room.state.vessels['bowl2']?.location)
  if (secondBowl === null) throw new Error('the second bowl is not standing on the table')
  assert.ok(secondBowl.x < firstBowlPoint.x - bowlRadius, `the second bowl stands at ${secondBowl.x.toFixed(3)}, the first at ${firstBowlPoint.x.toFixed(3)}`)
})

test('bowl_putDownOnTheTeaTableFromItsFrontSide_facesTheFront', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('teaTable')

  room.tapAndChoose({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable }, 'putDownHere')

  assert.ok(Math.abs(turnOfTheBowl(room)) < 0.5, `the bowl is turned ${turnOfTheBowl(room)} rad`)
})

test('bowl_putDownOnTheTeaTableFromItsFarSide_facesTheFarSide', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkAcrossTheFloorTo(farSideOfTheTeaTable())
  room.walkTo('teaTable')

  room.tapAndChoose({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable }, 'putDownHere')

  assert.ok(Math.abs(turnOfTheBowl(room)) > Math.PI - 0.5, `the bowl is turned ${turnOfTheBowl(room)} rad`)
})

test('surfaceTap_withNothingInHand_opensNoMenu', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.equal(room.playerController.actionMenuView, null)
})

test('bowl_whenPutDownWhereAnotherBowlStands_standsAgainstItOnTheSameTable', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1', 'bowl2')
  room.walkTo('teaTable')
  room.putDown(0, onTheTeaTable)

  room.tapAndChoose({ kind: 'surface', furnitureId: 'teaTable', point: { ...onTheTeaTable, x: onTheTeaTable.x + 0.1 } }, 'putDownHere')

  const firstBowl = standingSpotOf(room.state.vessels['bowl1']?.location)
  const secondBowl = standingSpotOf(room.state.vessels['bowl2']?.location)
  const bowlRadius = layoutOf(room.state, 'bowl2')?.footprintRadiusMetres ?? Number.NaN
  if (firstBowl === null || secondBowl === null) throw new Error('a bowl is not standing on the table')
  assert.equal(secondBowl.placeId, 'teaTable')
  const gapBetweenTheBowls = Math.hypot(secondBowl.x - firstBowl.x, secondBowl.z - firstBowl.z) - 2 * bowlRadius
  assert.ok(gapBetweenTheBowls >= 0 && gapBetweenTheBowls <= snugGapAtMostMetres, `the bowls stand ${gapBetweenTheBowls.toFixed(3)} m apart`)
})

test('bowl_whenTappedWithTheKettleInHand_offersToPourTheKettleIntoIt', () => {
  const room = new TestRoom()
  room.bringABowlToTheCounterAndTakeTheKettle()

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(room.actionsOffered(), ['take bowl', 'putAway bowl', 'pourInto kettle bowl'])
})

test('bowl_whenTakenWithTheKettleInHand_goesIntoTheOtherHand', () => {
  const room = new TestRoom()
  room.bringABowlToTheCounterAndTakeTheKettle()

  room.tapAndChoose({ kind: 'item', itemId: 'bowl1' }, 'take')

  assert.deepEqual(itemIdsInTheHands(room.state), ['kettle', 'bowl1'])
  assert.equal(room.state.pour, null)
})

test('spoon_whenTakenAtTheTeaTable_goesIntoTheFirstFreeHand', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')

  room.take('spoon')

  assert.deepEqual(itemIdsInTheHands(room.state), ['spoon', null])
})

test('hand_whenTapped_offersToPutItsItemAway', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.deepEqual(room.actionsOffered(), ['putAway kettle', 'openTheLid kettle'])
})

test('hand_whenItsKeyIsPressedAtTheCounter_opensItsMenu', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })

  room.playerController.handKeyTapped(0)

  assert.deepEqual(room.actionsOffered(), ['putAway kettle', 'openTheLid kettle'])
})

test('hand_whenTappedInTheRoomView_opensItsMenu', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')
  room.tap({ kind: 'floor', point: openFloorFrontRight })

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.deepEqual(room.actionsOffered(), ['putAway kettle', 'openTheLid kettle'])
})

test('handArea_overTheTableWithAnItemHeld_letsTheTapReachTheTable', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.take('cloth')

  const doesTheTapReachTheTable = room.playerController.doesATapReachPastTheHands({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.equal(doesTheTapReachTheTable, true)
})

test('handArea_overTheFloor_keepsTheTap', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.take('cloth')

  const doesTheTapReachTheFloor = room.playerController.doesATapReachPastTheHands({ kind: 'floor', point: inFrontOfTheTeaTable })

  assert.equal(doesTheTapReachTheFloor, false)
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
