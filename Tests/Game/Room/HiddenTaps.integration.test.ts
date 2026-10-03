import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRoom } from '../../Support/TestRoom.ts'
import { itemIdsInTheHands } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'

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

test('item_whenTappedTenTimesWithFullHands_staysWhereItIs', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1', 'bowl2')

  room.tapTimes(10, { kind: 'item', itemId: 'bowl3' })

  assert.deepEqual(itemIdsInTheHands(room.state), ['bowl1', 'bowl2'])
})
