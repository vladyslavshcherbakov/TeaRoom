import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRoom } from '../../Support/TestRoom.ts'

test('keeper_atTheTeaTable_isSeatedAtTheRitualPlace', () => {
  const room = new TestRoom()

  room.walkTo('teaTable')

  assert.equal(room.play.isSeatedAtTheRitualPlace, true)
})

test('keeper_atTheCounter_isNotSeated', () => {
  const room = new TestRoom()

  room.walkTo('counter')

  assert.equal(room.play.isSeatedAtTheRitualPlace, false)
})

test('keeper_whenStandingUpToWalkFromTheTeaTable_leavesItsCloseUp', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')

  room.play.standUpToWalk()

  assert.equal(room.play.view.kind, 'overview')
  assert.equal(room.play.isSeatedAtTheRitualPlace, false)
})
