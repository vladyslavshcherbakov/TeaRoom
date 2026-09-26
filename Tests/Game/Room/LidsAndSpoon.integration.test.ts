import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRoom } from '../../Support/TestRoom.ts'

test('kettleLid_whenTapped_opens', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'lid', itemId: 'kettle' })

  assert.equal(room.state.vessels['kettle']?.isLidOpen, true)
})

test('caddyLid_whenTappedOnTheTeaTable_opens', () => {
  const room = new TestRoom()
  setTheTeaTable(room)

  room.tap({ kind: 'lid', itemId: 'caddy' })

  assert.equal(room.state.vessels['caddy']?.isLidOpen, true)
})

test('spoon_whenChosenAndTheOpenCaddyIsTapped_fillsWithLeaves', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  room.takeAndChoose('spoon')

  room.tap({ kind: 'item', itemId: 'caddy' })

  assert.equal(room.state.spoon.grams, 3)
  assert.equal(room.state.vessels['caddy']?.location.kind, 'onSurface')
})

test('spoon_whenFullAndTheOpenKettleIsTapped_tipsTheLeavesIntoIt', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })
  room.takeAndChoose('spoon')
  room.session.dispatch({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.state.vessels['kettle']?.leaves?.grams, 3)
  assert.equal(room.state.spoon.grams, 0)
})

test('cloth_whenTappedWithTheSpoonChosen_isTakenIntoTheOtherHand', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  room.takeAndChoose('spoon')

  room.tap({ kind: 'item', itemId: 'cloth' })

  assert.deepEqual(room.state.keeper.hands, ['spoon', 'cloth', null])
})

test('kettle_whenTappedWithAnEmptySpoonChosen_isTakenIntoTheOtherHand', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.takeAndChoose('spoon')

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.deepEqual(room.state.keeper.hands, ['spoon', 'kettle', null])
  assert.equal(room.state.vessels['kettle']?.leaves, null)
})

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
