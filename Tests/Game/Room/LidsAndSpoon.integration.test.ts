import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRoom } from '../../Support/TestRoom.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn } from '../../../Shared/Engine/Catalog.ts'
import { itemIdsInTheHands } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'

const quietRoom = definitionIn(defaultCatalog, 'rooms', 'quietRoom')
const thermosRedHotAfterSeconds = 30
const aFullSpoonOfTheCaddysTea = { [teaIdOfTheCaddy()]: quietRoom.spoonCapacityGrams }

test('closedKettleLid_whenTappedAndOpeningIsChosen_opens', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tapAndChoose({ kind: 'lid', itemId: 'kettle' }, 'openTheLid')

  assert.equal(room.state.vessels['kettle']?.isLidOpen, true)
})

test('kettle_whenTappedWithItsLidOpen_offersNoOpeningOfTheLid', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.deepEqual(room.actionsOffered(), ['take kettle', 'putAway kettle'])
})

test('redHotThermos_whenOpeningItsLidIsChosen_staysClosedAndThePlayerSaysItIsTooHot', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('thermos')
  room.tapAndChoose({ kind: 'heater' }, 'putOnTheHeater', 'thermos')
  room.tap({ kind: 'heaterSwitch' })
  room.advance(thermosRedHotAfterSeconds)
  const captionsBefore = room.captions.length

  room.tapAndChoose({ kind: 'lid', itemId: 'thermos' }, 'openTheLid')

  assert.deepEqual({ isLidOpen: room.state.vessels['thermos']?.isLidOpen, newCaptions: room.captions.length - captionsBefore }, { isLidOpen: false, newCaptions: 1 })
})

test('openCaddyLid_whenTappedOnTheTeaTable_closesWithNoMenu', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })

  room.tap({ kind: 'lid', itemId: 'caddy' })

  assert.equal(room.state.vessels['caddy']?.isLidOpen, false)
  assert.equal(room.playerController.actionMenuView, null)
})

test('spoon_whenScoopingFromTheOpenCaddyIsChosen_fillsWithLeaves', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  room.take('spoon')

  room.tapAndChoose({ kind: 'item', itemId: 'caddy' }, 'scoopFrom', 'spoon', 'caddy')

  assert.deepEqual(room.state.spoon.gramsByTeaId, aFullSpoonOfTheCaddysTea)
  assert.equal(room.state.vessels['caddy']?.location.kind, 'onSurface')
})

test('spoon_whenFullAndTippingIntoTheOpenKettleIsChosen_tipsTheLeavesIntoIt', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })
  room.take('spoon')
  room.session.dispatch({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  room.tapAndChoose({ kind: 'item', itemId: 'kettle' }, 'tipLeavesInto', 'spoon', 'kettle')

  assert.deepEqual(room.state.vessels['kettle']?.leaves?.gramsByTeaId, aFullSpoonOfTheCaddysTea)
  assert.deepEqual(room.state.spoon.gramsByTeaId, {})
})

test('cloth_whenTakenWithTheSpoonInHand_goesIntoTheOtherHand', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  room.take('spoon')

  room.tapAndChoose({ kind: 'item', itemId: 'cloth' }, 'take')

  assert.deepEqual(itemIdsInTheHands(room.state), ['spoon', 'cloth'])
})

test('kettle_whenTappedWithAnEmptySpoonInHand_offersNoTippingOfLeaves', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.take('spoon')

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.deepEqual(room.actionsOffered(), ['take kettle', 'putAway kettle', 'openTheLid kettle'])
})

test('closedCaddy_whenTappedWithTheSpoonInHand_offersNoScooping', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.take('spoon')

  room.tap({ kind: 'item', itemId: 'caddy' })

  assert.deepEqual(room.actionsOffered(), ['take caddy', 'putAway caddy', 'openTheLid caddy'])
})

function teaIdOfTheCaddy(): string {
  const teaStock = quietRoom.vessels.find((vessel) => vessel.id === 'caddy')?.teaStock
  if (teaStock === undefined || teaStock === null) throw new Error('the quiet room has no caddy of tea')
  return teaStock.teaId
}
