import assert from 'node:assert/strict'
import test from 'node:test'
import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { onTopOf, TestRoom } from '../../Support/TestRoom.ts'

const onTheCounterBesideTheBowl = onTopOf('counter', 1, 0.05)

test('sill_whenItsFigurinesAreTappedFromAfar_isKeptByTheRoomWithADifferentLineEachTime', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'figurine', figurineId: 'dragon' })
  room.tap({ kind: 'figurine', figurineId: 'toad' })

  assert.deepEqual(room.remarks, [
    { kind: 'sillIsTheRoomsOwn', timesTapped: 1 },
    { kind: 'sillIsTheRoomsOwn', timesTapped: 2 },
  ])
})

test('bowl_whenPutOnTheHeater_staysInHandAndIsRemarkedOn', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.itemIdOnTop, null)
  assert.deepEqual(room.remarks, [{ kind: 'bowlKeptOffTheHeater', timesTapped: 1 }])
})

test('heaterTester_onTheItemThatReachesTheVisitsCount_isTeasedInPlaceOfTheItemsOwnLine', () => {
  const room = new TestRoom({ heaterItemsBeforeTheTesterJoke: 2 })
  room.carryFromTheShelf('bowl1', 'caddy')
  room.walkTo('counter')
  room.tap({ kind: 'heaterSwitch' })
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'heater' })
  room.tap({ kind: 'hand', handIndex: 1 })

  room.tap({ kind: 'heater' })

  assert.deepEqual(room.remarks, [
    { kind: 'bowlKeptOffTheHeater', timesTapped: 1 },
    { kind: 'heaterTester', timesTapped: 1 },
  ])
})

test('heaterTester_onceTeased_leavesEveryLaterTryToTheItemsOwnLine', () => {
  const room = new TestRoom({ heaterItemsBeforeTheTesterJoke: 2 })
  room.carryFromTheShelf('bowl1', 'caddy')
  room.walkTo('counter')
  room.tap({ kind: 'heaterSwitch' })
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'heater' })
  room.tap({ kind: 'hand', handIndex: 1 })
  room.tap({ kind: 'heater' })
  room.putDown(1, onTheCounterBesideTheBowl)
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'heater' })

  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.itemIdOnTop, 'kettle')
  assert.deepEqual(room.remarks, [
    { kind: 'bowlKeptOffTheHeater', timesTapped: 1 },
    { kind: 'heaterTester', timesTapped: 1 },
    { kind: 'bowlKeptOffTheHeater', timesTapped: 2 },
  ])
})

test('heaterTester_whenTheHeaterIsOff_isNeverTeased', () => {
  const room = new TestRoom({ heaterItemsBeforeTheTesterJoke: 2 })
  room.carryFromTheShelf('bowl1', 'caddy')
  room.walkTo('counter')
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'heater' })
  room.tap({ kind: 'hand', handIndex: 1 })

  room.tap({ kind: 'heater' })

  assert.deepEqual(room.remarks, [
    { kind: 'bowlKeptOffTheHeater', timesTapped: 1 },
    { kind: 'caddyKeptOffTheHeater', timesTapped: 1 },
  ])
})

test('shelf_whenTheLastThingIsPutOnIt_isRemarkedOnOnce', () => {
  const room = new TestRoom()
  putEverythingButTheClothOnTheShelf(room)
  room.walkTo('teaTable')
  room.takeAndChoose('cloth')
  room.walkTo('shelf')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'surface', furnitureId: 'shelf', point: { x: -2.75, y: 1.22, z: 1.05 } })
  room.takeAndChoose('cloth')
  room.tap({ kind: 'surface', furnitureId: 'shelf', point: { x: -2.75, y: 1.22, z: 1.05 } })

  assert.equal(room.state.cloths['cloth']?.location.kind, 'onSurface')
  assert.deepEqual(room.remarks, [{ kind: 'everythingOnTheShelf', timesTapped: 1 }])
})

test('shelf_withTheClothStillOnTheTeaTable_isNotRemarkedOn', () => {
  const room = new TestRoom()
  putEverythingButTheClothOnTheShelf(room)
  room.walkTo('shelf')
  room.takeAndChoose('caddy')

  room.tap({ kind: 'surface', furnitureId: 'shelf', point: { x: -2.75, y: 1.22, z: 1.05 } })

  assert.deepEqual(room.remarks, [])
})

test('thirdItem_whenBothHandsAreFull_isRemarkedOn', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1', 'caddy')

  room.tap({ kind: 'item', itemId: 'bowl2' })

  assert.deepEqual(room.state.keeper.hands, ['bowl1', 'caddy', null])
  assert.deepEqual(room.remarks, [{ kind: 'handsFull', timesTapped: 1 }])
})

test('thirdBowl_whenBothHandsHoldBowls_isRemarkedOnAsASkillToPractise', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1', 'bowl2')

  room.tap({ kind: 'item', itemId: 'bowl3' })
  room.tap({ kind: 'item', itemId: 'caddy' })

  assert.deepEqual(room.remarks, [
    { kind: 'handsFullOfBowls', timesTapped: 1 },
    { kind: 'handsFullOfBowls', timesTapped: 2 },
  ])
})

test('caddy_whenPutOnTheHeaterTwice_isRemarkedOnEachTime', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('caddy')
  room.walkTo('counter')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'heater' })
  room.tap({ kind: 'heater' })

  assert.deepEqual(room.remarks, [
    { kind: 'caddyKeptOffTheHeater', timesTapped: 1 },
    { kind: 'caddyKeptOffTheHeater', timesTapped: 2 },
  ])
})

function putEverythingButTheClothOnTheShelf(room: TestRoom): void {
  const onTheTopShelf = (z: number): Spot => ({ placeId: 'shelf', x: -2.75, y: 1.22, z })
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.session.dispatch({ type: 'pickUp', itemId: 'thermos' })
  room.walkTo('shelf')
  room.session.dispatch({ type: 'putDown', itemId: 'kettle', spot: onTheTopShelf(0.3) })
  room.session.dispatch({ type: 'putDown', itemId: 'thermos', spot: onTheTopShelf(0.7) })
  room.walkTo('teaTable')
  room.session.dispatch({ type: 'pickUp', itemId: 'spoon' })
  room.walkTo('shelf')
  room.session.dispatch({ type: 'putDown', itemId: 'spoon', spot: { placeId: 'shelf', x: -2.75, y: 0.07, z: -0.45 } })
}
