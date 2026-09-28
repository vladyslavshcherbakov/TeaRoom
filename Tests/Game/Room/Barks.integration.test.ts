import assert from 'node:assert/strict'
import test from 'node:test'
import { onTheCounterBesideTheBowl, onTheShelfBoard, TestRoom } from '../../Support/TestRoom.ts'
import { itemIdsInTheHands, itemIdOnTheHeater } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'

const onTheShelfBesideTheBowls = onTheShelfBoard('upper', 0, 0.65)

test('sill_whenItsFigurinesAreTappedFromAfar_isBarkedOnEachTimeWithItsCount', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'figurine', figurineId: 'dragon' })
  room.tap({ kind: 'figurine', figurineId: 'toad' })

  assert.deepEqual(room.barks, [
    { kind: 'sillIsTheRoomsOwn', timesMade: 1 },
    { kind: 'sillIsTheRoomsOwn', timesMade: 2 },
  ])
})

test('bowl_whenPutOnTheHeater_staysInHandAndIsBarkedOn', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'heater' })

  assert.equal(itemIdOnTheHeater(room.state), null)
  assert.deepEqual(room.barks, [{ kind: 'bowlKeptOffTheHeater', timesMade: 1 }])
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

  assert.deepEqual(room.barks, [
    { kind: 'bowlKeptOffTheHeater', timesMade: 1 },
    { kind: 'heaterTester', timesMade: 1 },
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

  assert.equal(itemIdOnTheHeater(room.state), 'kettle')
  assert.deepEqual(room.barks, [
    { kind: 'bowlKeptOffTheHeater', timesMade: 1 },
    { kind: 'heaterTester', timesMade: 1 },
    { kind: 'bowlKeptOffTheHeater', timesMade: 2 },
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

  assert.deepEqual(room.barks, [
    { kind: 'bowlKeptOffTheHeater', timesMade: 1 },
    { kind: 'caddyKeptOffTheHeater', timesMade: 1 },
  ])
})

test('shelf_whenTheLastThingIsPutOnIt_isBarkedOnOnce', () => {
  const room = new TestRoom()
  room.putEverythingButTheClothOnTheShelf()
  room.walkTo('teaTable')
  room.takeAndChoose('cloth')
  room.walkTo('shelf')

  room.tap({ kind: 'surface', furnitureId: 'shelf', point: onTheShelfBesideTheBowls })
  room.takeAndChoose('cloth')
  room.tap({ kind: 'surface', furnitureId: 'shelf', point: onTheShelfBesideTheBowls })

  assert.equal(room.state.cloths['cloth']?.location.kind, 'onSurface')
  assert.deepEqual(room.barks, [{ kind: 'everythingOnTheShelf', timesMade: 1 }])
})

test('shelf_withTheClothStillOnTheTeaTable_isNotBarkedOn', () => {
  const room = new TestRoom()
  room.putEverythingButTheClothOnTheShelf()
  room.walkTo('shelf')
  room.takeAndChoose('caddy')

  room.tap({ kind: 'surface', furnitureId: 'shelf', point: onTheShelfBesideTheBowls })

  assert.deepEqual(room.barks, [])
})

test('thirdItem_whenBothHandsAreFull_isBarkedOn', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1', 'caddy')

  room.tap({ kind: 'item', itemId: 'bowl2' })

  assert.deepEqual(itemIdsInTheHands(room.state), ['bowl1', 'caddy', null])
  assert.deepEqual(room.barks, [{ kind: 'handsFull', timesMade: 1 }])
})

test('thirdBowl_whenBothHandsHoldBowls_isBarkedOnAsASkillToPractise', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1', 'bowl2')

  room.tap({ kind: 'item', itemId: 'bowl3' })
  room.tap({ kind: 'item', itemId: 'caddy' })

  assert.deepEqual(room.barks, [
    { kind: 'handsFullOfBowls', timesMade: 1 },
    { kind: 'handsFullOfBowls', timesMade: 2 },
  ])
})

test('caddy_whenPutOnTheHeaterTwice_isBarkedOnEachTime', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('caddy')
  room.walkTo('counter')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'heater' })
  room.tap({ kind: 'heater' })

  assert.deepEqual(room.barks, [
    { kind: 'caddyKeptOffTheHeater', timesMade: 1 },
    { kind: 'caddyKeptOffTheHeater', timesMade: 2 },
  ])
})
