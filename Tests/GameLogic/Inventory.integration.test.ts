import assert from 'node:assert/strict'
import test from 'node:test'
import { testCatalog, testHouseCatalog } from '../Support/TestCatalog.ts'
import { TestTeaSession } from '../Support/TestTeaSession.ts'
import { itemIdsInTheHands, itemIdsInTheInventory } from '../../Shared/GameLogic/State/WhereItemsAre.ts'

test('cup_whenPutAwayWhereThePlayerStands_takesTheFirstPlaceOfTheInventory', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'shelf' })

  const events = session.do({ type: 'putAway', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'putAway', itemId: 'cup1', slotIndex: 0 }])
  assert.deepEqual(itemIdsInTheInventory(session.state), ['cup1', null])
})

test('cup_whenPutAwayFromAHand_leavesTheHandFree', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'pickUp', itemId: 'cup1' })

  session.do({ type: 'putAway', itemId: 'cup1' })

  assert.deepEqual(itemIdsInTheHands(session.state), [null, null])
  assert.deepEqual(itemIdsInTheInventory(session.state), ['cup1', null])
})

test('cup_whenThePlayerStandsElsewhere_isNotPutAway', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'counter' })

  const events = session.do({ type: 'putAway', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putAway', reason: 'outOfReach' }])
})

test('thirdItem_whenBothPlacesOfTheInventoryAreTaken_isRefusedAndStaysOnTheShelf', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'putAway', itemId: 'cup1' })
  session.do({ type: 'putAway', itemId: 'cup2' })

  const events = session.do({ type: 'putAway', itemId: 'caddy' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putAway', reason: 'inventoryFull' }])
  assert.equal(session.vessel('caddy').location.kind, 'onSurface')
})

test('cup_alreadyPutAway_isRefusedAndKeepsItsPlace', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'putAway', itemId: 'cup1' })

  const events = session.do({ type: 'putAway', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putAway', reason: 'alreadyPutAway' }])
  assert.deepEqual(itemIdsInTheInventory(session.state), ['cup1', null])
})

test('cup_inTheInventory_isTakenIntoAHandAtAnotherPlace', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'putAway', itemId: 'cup1' })
  session.do({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'pickUp', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'pickedUp', itemId: 'cup1', handIndex: 0 }])
  assert.deepEqual(itemIdsInTheInventory(session.state), [null, null])
})

test('cupOfTea_inTheInventory_cannotBeSippedFrom', () => {
  const session = new TestTeaSession()
  session.pour('kettle', 'cup1', 2)
  session.do({ type: 'putAway', itemId: 'cup1' })

  const events = session.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tasteCup', reason: 'outOfReach' }])
})

test('cup_inTheInventory_cannotBePouredInto', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'putAway', itemId: 'cup1' })

  const events = session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startPouring', reason: 'outOfReach' }])
})

test('kettle_whenPutAwayWithItsLidOpen_hasItsLidClosed', () => {
  const session = new TestTeaSession()
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })

  session.do({ type: 'putAway', itemId: 'kettle' })

  assert.equal(session.vessel('kettle').isLidOpen, false)
})

test('thermos_tooHotToHold_isNotPutAway', () => {
  const session = new TestTeaSession()
  session.putOnTheWorkingHeater('thermos')
  session.wait(30)

  const events = session.do({ type: 'putAway', itemId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putAway', reason: 'tooHotToHold' }])
})

test('boilingWaterInACupInTheInventory_coolsAsInACupOnTheTable', () => {
  const session = new TestTeaSession(testCatalog({ cup: 0.01 }))
  session.do({ type: 'fillWithBoilingWater', vesselId: 'cup1' })
  session.do({ type: 'fillWithBoilingWater', vesselId: 'cup2' })
  session.do({ type: 'putAway', itemId: 'cup1' })

  session.wait(60)

  assert.ok(session.vessel('cup1').liquid.temperatureC < 100)
  assert.equal(session.vessel('cup1').liquid.temperatureC, session.vessel('cup2').liquid.temperatureC)
})

function houseSession(): TestTeaSession {
  return new TestTeaSession(testHouseCatalog(), 'testHouse')
}
