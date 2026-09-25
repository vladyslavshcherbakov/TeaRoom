import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRoom } from '../../Support/TestRoom.ts'

test('roseBush_whenTappedTenTimesInARow_asksForTheDebugMenu', () => {
  const room = new TestRoom()

  for (let tap = 0; tap < 10; tap += 1) room.tap({ kind: 'roseBush' })

  assert.equal(room.debugMenusAsked, 1)
})

test('roseBush_whenAnotherTapComesBeforeTheTenth_startsCountingAgain', () => {
  const room = new TestRoom()
  for (let tap = 0; tap < 9; tap += 1) room.tap({ kind: 'roseBush' })
  room.tap({ kind: 'nothing' })

  room.tap({ kind: 'roseBush' })

  assert.equal(room.debugMenusAsked, 0)
})

test('middleHand_whenTheSameItemIsTappedTenTimesWithFullHands_growsHoldingItAndChosen', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1', 'bowl2')
  room.tapTimes(9, { kind: 'item', itemId: 'bowl3' })

  room.tap({ kind: 'item', itemId: 'bowl3' })

  assert.deepEqual(room.state.keeper.hands, ['bowl1', 'bowl2', 'bowl3'])
  assert.equal(room.play.chosenHandIndex, 2)
})

test('middleHand_whenAnotherItemIsTappedInBetween_countsTheTapsAgain', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1', 'bowl2')
  room.tapTimes(9, { kind: 'item', itemId: 'bowl3' })
  room.tap({ kind: 'item', itemId: 'bowl4' })

  room.tapTimes(9, { kind: 'item', itemId: 'bowl3' })

  assert.equal(room.state.keeper.hasAMiddleHand, false)
})

test('middleHand_whenItHasBeenGrownBefore_doesNotGrowAgain', () => {
  const room = new TestRoom()
  room.mayGrowAMiddleHand = false
  room.carryFromTheShelf('bowl1', 'bowl2')

  room.tapTimes(10, { kind: 'item', itemId: 'bowl3' })

  assert.equal(room.state.keeper.hasAMiddleHand, false)
})
