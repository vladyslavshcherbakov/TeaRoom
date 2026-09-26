import assert from 'node:assert/strict'
import test from 'node:test'
import { onTopOf, TestRoom } from '../../Support/TestRoom.ts'

const onTheTeaTable = onTopOf('teaTable', 0, 0.05)

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

test('keeper_whenStandingUpToWalkFromTheTeaTable_staysWithinReachOfIt', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')

  room.play.standUpToWalk()

  assert.deepEqual(room.play.view, { kind: 'closeUp', furnitureId: 'teaTable' })
  assert.equal(room.play.isSeatedAtTheRitualPlace, false)
})

test('keeper_whenPuttingABowlOnTheTeaTableWhileStandingThere_sitsDown', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('teaTable')
  room.play.standUpToWalk()
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.equal(room.play.isSeatedAtTheRitualPlace, true)
})

test('keeper_whenWalkingFreelyUpToTheTeaTable_standsWithinReachOfIt', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  room.play.standUpToWalk()
  for (let step = 0; step < 20; step += 1) room.play.walkFreely({ x: 0, z: 0.1 }, 0)

  for (let step = 0; step < 20; step += 1) room.play.walkFreely({ x: 0, z: -0.1 }, Math.PI)

  assert.deepEqual(room.play.view, { kind: 'closeUp', furnitureId: 'teaTable' })
  assert.equal(room.play.isSeatedAtTheRitualPlace, false)
})
