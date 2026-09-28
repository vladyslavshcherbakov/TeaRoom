import assert from 'node:assert/strict'
import test from 'node:test'
import { onTheTeaTable, TestRoom } from '../../Support/TestRoom.ts'

test('player_atTheTeaTable_isSeatedAtTheRitualPlace', () => {
  const room = new TestRoom()

  room.walkTo('teaTable')

  assert.equal(room.playerController.isSeatedAtTheRitualPlace, true)
})

test('player_atTheCounter_isNotSeated', () => {
  const room = new TestRoom()

  room.walkTo('counter')

  assert.equal(room.playerController.isSeatedAtTheRitualPlace, false)
})

test('player_whenStandingUpToWalkFromTheTeaTable_staysWithinReachOfIt', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')

  room.playerController.standUpToWalk()

  assert.deepEqual(room.playerController.view, { kind: 'closeUp', furnitureId: 'teaTable' })
  assert.equal(room.playerController.isSeatedAtTheRitualPlace, false)
})

test('player_whenPuttingABowlOnTheTeaTableWhileStandingThere_sitsDown', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('teaTable')
  room.playerController.standUpToWalk()
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.equal(room.playerController.isSeatedAtTheRitualPlace, true)
})

test('player_whenWalkingFreelyUpToTheTeaTable_standsWithinReachOfIt', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  room.playerController.standUpToWalk()
  for (let step = 0; step < 20; step += 1) room.playerController.walkFreely({ x: 0, z: 0.1 }, 0)

  for (let step = 0; step < 20; step += 1) room.playerController.walkFreely({ x: 0, z: -0.1 }, Math.PI)

  assert.deepEqual(room.playerController.view, { kind: 'closeUp', furnitureId: 'teaTable' })
  assert.equal(room.playerController.isSeatedAtTheRitualPlace, false)
})

test('player_whenWalkingAwayFromTheTeaTableToTheShelf_neitherSitsDownNorStandsUpOnTheWay', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  const linesBeforeLeaving = room.logLines.length

  room.tap({ kind: 'furniture', furnitureId: 'shelf' })
  room.playerController.standUpToWalk()

  const linesSinceLeaving = room.logLines.slice(linesBeforeLeaving)
  assert.ok(!linesSinceLeaving.some((line) => line.includes('sits down') || line.includes('stands up')), linesSinceLeaving.join('\n'))
})
