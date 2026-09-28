import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRoom } from '../../Support/TestRoom.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn } from '../../../Shared/Engine/Catalog.ts'
import { itemIdsInTheHands } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'

const quietRoom = definitionIn(defaultCatalog, 'rooms', 'quietRoom')
const aFullSpoonOfTheCaddysTea = { [teaIdOfTheCaddy()]: quietRoom.spoonCapacityGrams }

test('kettleLid_whenTapped_opens', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'lid', itemId: 'kettle' })

  assert.equal(room.state.vessels['kettle']?.isLidOpen, true)
})

test('caddyLid_whenTappedOnTheTeaTable_opens', () => {
  const room = new TestRoom()
  room.setTheTeaTable()

  room.tap({ kind: 'lid', itemId: 'caddy' })

  assert.equal(room.state.vessels['caddy']?.isLidOpen, true)
})

test('spoon_whenChosenAndTheOpenCaddyIsTapped_fillsWithLeaves', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  room.takeAndChoose('spoon')

  room.tap({ kind: 'item', itemId: 'caddy' })

  assert.deepEqual(room.state.spoon.gramsByTeaId, aFullSpoonOfTheCaddysTea)
  assert.equal(room.state.vessels['caddy']?.location.kind, 'onSurface')
})

test('spoon_whenFullAndTheOpenKettleIsTapped_tipsTheLeavesIntoIt', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })
  room.takeAndChoose('spoon')
  room.session.dispatch({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.deepEqual(room.state.vessels['kettle']?.leaves?.gramsByTeaId, aFullSpoonOfTheCaddysTea)
  assert.deepEqual(room.state.spoon.gramsByTeaId, {})
})

test('cloth_whenTappedWithTheSpoonChosen_isTakenIntoTheOtherHand', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  room.takeAndChoose('spoon')

  room.tap({ kind: 'item', itemId: 'cloth' })

  assert.deepEqual(itemIdsInTheHands(room.state), ['spoon', 'cloth', null])
})

test('kettle_whenTappedWithAnEmptySpoonChosen_isTakenIntoTheOtherHand', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.takeAndChoose('spoon')

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.deepEqual(itemIdsInTheHands(room.state), ['spoon', 'kettle', null])
  assert.equal(room.state.vessels['kettle']?.leaves, null)
})

function teaIdOfTheCaddy(): string {
  const teaStock = quietRoom.vessels.find((vessel) => vessel.id === 'caddy')?.teaStock
  if (teaStock === undefined || teaStock === null) throw new Error('the quiet room has no caddy of tea')
  return teaStock.teaId
}
