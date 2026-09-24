import assert from 'node:assert/strict'
import test from 'node:test'
import { testHouseCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

function houseRitual(): TestRitual {
  return TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
}

const onTheTable = { placeId: 'table', x: 0.5, y: 0.4, z: -1 }

test('cup_whenPickedUpWhereTheKeeperStands_goesIntoTheFirstFreeHand', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'shelf' })

  const events = ritual.do({ type: 'pickUp', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'pickedUp', itemId: 'cup1', handIndex: 0 }])
  assert.deepEqual(ritual.state.keeper.hands, ['cup1', null])
})

test('cup_whenTheKeeperStandsElsewhere_isOutOfReach', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'counter' })

  const events = ritual.do({ type: 'pickUp', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUp', reason: 'outOfReach' }])
})

test('thirdItem_whenBothHandsAreFull_isRefusedAndStaysOnTheShelf', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'pickUp', itemId: 'cup2' })

  const events = ritual.do({ type: 'pickUp', itemId: 'caddy' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUp', reason: 'handsFull' }])
  assert.equal(ritual.state.caddy.location.kind, 'onSurface')
})

test('cup_whenPutDownOnTheTable_restsExactlyWhereItWasPut', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'standAt', placeId: 'table' })

  ritual.do({ type: 'putDown', itemId: 'cup1', spot: onTheTable })

  assert.deepEqual(ritual.vessel('cup1').location, { kind: 'onSurface', spot: onTheTable })
  assert.deepEqual(ritual.state.keeper.hands, [null, null])
})

test('cup_whenPutDownAtAPlaceTheKeeperIsNotAt_isRefused', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })

  const events = ritual.do({ type: 'putDown', itemId: 'cup1', spot: onTheTable })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putDown', reason: 'notAtThatPlace' }])
  assert.deepEqual(ritual.state.keeper.hands, ['cup1', null])
})

test('heater_whenTheKeeperIsNotAtTheCounter_cannotBeSwitchedOn', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'table' })

  const events = ritual.do({ type: 'switchHeaterOn' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'switchHeaterOn', reason: 'notAtThatPlace' }])
})

test('kettle_whenPutOnTheHeaterFromTheHand_leavesTheHandFree', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })

  assert.equal(ritual.state.heater.itemIdOnTop, 'kettle')
  assert.deepEqual(ritual.state.keeper.hands, [null, null])
  assert.equal(ritual.vessel('kettle').location.kind, 'onSurface')
})

test('kettle_whenPickedUpFromAWorkingHeater_isLiftedOffAndItsWaterJudged', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(14)

  const events = ritual.do({ type: 'pickUp', itemId: 'kettle' })

  assert.deepEqual(eventsOfType(events, 'takenOffHeater'), [{ type: 'takenOffHeater', itemId: 'kettle', waterJudgement: 'ideal' }])
  assert.equal(ritual.state.heater.itemIdOnTop, null)
  assert.deepEqual(ritual.state.keeper.hands, ['kettle', null])
})

test('kettleInHand_whenPouredIntoACupOnTheTable_fillsIt', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'standAt', placeId: 'table' })
  ritual.do({ type: 'putDown', itemId: 'cup1', spot: onTheTable })

  ritual.pour('kettle', 'cup1', 5)

  assert.equal(Math.round(ritual.vessel('cup1').liquid.volumeMl), 50)
})

test('kettleInHand_whenPouredIntoACupStillOnTheShelf_isRefused', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'standAt', placeId: 'table' })

  const events = ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startPouring', reason: 'outOfReach' }])
})

test('pour_whenTheKeeperWalksAway_ends', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'standAt', placeId: 'table' })
  ritual.do({ type: 'putDown', itemId: 'cup1', spot: onTheTable })
  ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  const events = ritual.do({ type: 'standAt', placeId: null })

  assert.equal(eventsOfType(events, 'pourFinished').length, 1)
  assert.equal(ritual.state.pour, null)
})

test('caddy_whenOnTheShelfAndTheKeeperAtTheTable_cannotBeOpened', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'table' })

  const events = ritual.do({ type: 'openCaddy' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'openCaddy', reason: 'outOfReach' }])
})

test('kettle_whenPickedUpWithItsLidOpen_hasItsLidClosed', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })

  const events = ritual.do({ type: 'pickUp', itemId: 'kettle' })

  assert.equal(ritual.vessel('kettle').isLidOpen, false)
  assert.deepEqual(eventsOfType(events, 'vesselLidClosed'), [{ type: 'vesselLidClosed', vesselId: 'kettle' }])
})

test('caddy_whenPickedUpOpen_isClosed', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'openCaddy' })

  ritual.do({ type: 'pickUp', itemId: 'caddy' })

  assert.equal(ritual.state.caddy.isOpen, false)
})
