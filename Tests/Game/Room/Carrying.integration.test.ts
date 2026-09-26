import assert from 'node:assert/strict'
import test from 'node:test'
import { furnitureWithId, quietRoomLayout, type FloorPoint } from '../../../Apps/Game/Room/RoomLayout.ts'
import { onTopOf, spotOn, TestRoom, withoutTheTurn } from '../../Support/TestRoom.ts'

const onTheTeaTable = onTopOf('teaTable', 0, 0.05)
const onTheCounter = onTopOf('counter', 0.4, 0.05)

test('bowl_whenTappedInTheShelfCloseUp_goesIntoTheFirstFreeHand', () => {
  const room = new TestRoom()
  room.walkTo('shelf')

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(room.state.keeper.hands, ['bowl1', null, null])
})

test('bowl_whenPickedUpByATap_isChosenAtOnce', () => {
  const room = new TestRoom()
  room.walkTo('shelf')
  room.tap({ kind: 'item', itemId: 'bowl1' })

  room.tap({ kind: 'item', itemId: 'bowl2' })

  assert.deepEqual(room.state.keeper.hands, ['bowl1', 'bowl2', null])
  assert.equal(room.play.chosenHandIndex, 1)
})

test('bowl_whenItsHandIsChosenAndTheTeaTableIsTapped_standsWhereTheTableWasTapped', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('teaTable')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.deepEqual(withoutTheTurn(room.state.vessels['bowl1']?.location), { kind: 'onSurface', spot: spotOn('teaTable', onTheTeaTable) })
  assert.equal(room.play.chosenHandIndex, null)
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

  assert.deepEqual(room.state.keeper.hands, ['bowl1', null, null])
  assert.ok(room.logLines.includes('tap on the teaTable ignored: no hand is chosen'), room.logLines.join('\n'))
})

test('bowl_whenPutDownWhereAnotherBowlStands_staysInHandWithItsHandChosen', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1', 'bowl2')
  room.walkTo('teaTable')
  room.putDown(0, onTheTeaTable)
  room.tap({ kind: 'hand', handIndex: 1 })

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: { ...onTheTeaTable, x: onTheTeaTable.x + 0.1 } })

  assert.deepEqual(room.state.keeper.hands, [null, 'bowl2', null])
  assert.equal(room.play.chosenHandIndex, 1)
  assert.ok(room.logLines.some((line) => line.startsWith('no room for bowl2') && line.endsWith('somethingIsThere')), room.logLines.join('\n'))
})

test('bowl_whenTappedShortlyWithTheKettleInHand_isPickedUp', () => {
  const room = new TestRoom()
  bringABowlToTheCounterAndTakeTheKettle(room)

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(room.state.keeper.hands, ['kettle', 'bowl1', null])
  assert.equal(room.state.pour, null)
})

test('spoon_whenTappedAtTheTeaTable_goesIntoTheFirstFreeHand', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')

  room.tap({ kind: 'item', itemId: 'spoon' })

  assert.deepEqual(room.state.keeper.hands, ['spoon', null, null])
})

test('chosenItem_behindItsGlow_canBePutDownOnTheTableThatTheTapHit', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.takeAndChoose('cloth')

  const doesTheTapReachTheTable = room.play.doesATapReachPastTheChosenHand({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.equal(doesTheTapReachTheTable, true)
})

test('chosenItem_behindItsGlow_letsTheHandKeepATapOnTheFloor', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.takeAndChoose('cloth')

  const doesTheTapReachTheFloor = room.play.doesATapReachPastTheChosenHand({ kind: 'floor', point: { x: 1, z: -0.6 } })

  assert.equal(doesTheTapReachTheFloor, false)
})

test('bowl_whenTappedWithTheClothChosen_isTakenIntoTheOtherHand', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.takeAndChoose('cloth')

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(room.state.keeper.hands, ['cloth', 'bowl1', null])
})

test('chosenHand_whenTheKeeperLeavesTheCloseUp_staysChosen', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.takeAndChoose('kettle')

  room.tap({ kind: 'floor', point: { x: 1, z: 1 } })

  assert.equal(room.play.chosenHandIndex, 0)
})

test('chosenHand_whenTappedInTheRoomView_staysChosen', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.takeAndChoose('kettle')
  room.tap({ kind: 'floor', point: { x: 1, z: 1 } })

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.equal(room.play.chosenHandIndex, 0)
})

function bringABowlToTheCounterAndTakeTheKettle(room: TestRoom): void {
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')
  room.putDown(0, onTheCounter)
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
}

function setTheTeaTable(room: TestRoom): void {
  room.carryFromTheShelf('bowl1', 'caddy')
  room.walkTo('teaTable')
  room.putDown(0, { x: 0.8, y: 0.42, z: -1.5 })
  room.putDown(1, { x: 1.2, y: 0.42, z: -1.5 })
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.walkTo('teaTable')
  room.putDown(0, { x: 1, y: 0.42, z: -1.8 })
}

function turnOfTheBowl(room: TestRoom): number {
  const location = room.state.vessels['bowl1']?.location
  return location?.kind === 'onSurface' ? location.spot.turnRadians ?? Number.NaN : Number.NaN
}

function farSideOfTheTeaTable(): FloorPoint {
  const [, farSide] = furnitureWithId(quietRoomLayout, 'teaTable').sides
  if (farSide === undefined) throw new Error('the quiet room has a tea table with one side')
  return farSide.standingPoint
}
