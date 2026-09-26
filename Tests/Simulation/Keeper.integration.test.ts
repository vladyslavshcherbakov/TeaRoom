import assert from 'node:assert/strict'
import test from 'node:test'
import { testHouseCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

const onTheTable = { placeId: 'table', x: 0.5, y: 0.4, z: -1 }

test('cup_whenPickedUpWhereTheKeeperStands_goesIntoTheFirstFreeHand', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'shelf' })

  const events = ritual.do({ type: 'pickUp', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'pickedUp', itemId: 'cup1', handIndex: 0 }])
  assert.deepEqual(ritual.state.keeper.hands, ['cup1', null, null])
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
  assert.equal(ritual.vessel('caddy').location.kind, 'onSurface')
})

test('cup_whenPutDownOnTheTable_restsExactlyWhereItWasPut', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'standAt', placeId: 'table' })

  ritual.do({ type: 'putDown', itemId: 'cup1', spot: onTheTable })

  assert.deepEqual(ritual.vessel('cup1').location, { kind: 'onSurface', spot: onTheTable })
  assert.deepEqual(ritual.state.keeper.hands, [null, null, null])
})

test('cup_whenPutDownAtAPlaceTheKeeperIsNotAt_isRefused', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })

  const events = ritual.do({ type: 'putDown', itemId: 'cup1', spot: onTheTable })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putDown', reason: 'notAtThatPlace' }])
  assert.deepEqual(ritual.state.keeper.hands, ['cup1', null, null])
})

test('cup_lyingOnAnotherPlace_cannotBePutDownAsItIsOutOfReach', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'table' })

  const events = ritual.do({ type: 'putDown', itemId: 'cup1', spot: onTheTable })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putDown', reason: 'outOfReach' }])
})

test('kettle_whenTastedFromAnotherPlace_isOutOfReachBeforeItIsJudgedUndrinkable', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'table' })

  const events = ritual.do({ type: 'tasteCup', cupId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tasteCup', reason: 'outOfReach' }])
})

test('cup_whenTastedFromAnotherPlace_isRefusedNamingWhereItAndTheKeeperAre', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'table' })

  ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.ok(
    ritual.log.messagesAt('info').some((message) => message.endsWith('tasteCup refused (outOfReach): {"cupId":"cup1"}, cup1 is on the shelf, the keeper is at the table')),
    ritual.log.messagesAt('info').join('\n'),
  )
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
  assert.deepEqual(ritual.state.keeper.hands, [null, null, null])
  assert.equal(ritual.vessel('kettle').location.kind, 'onSurface')
})

test('kettle_whenPickedUpFromAWorkingHeater_isLiftedOff', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(14)

  const events = ritual.do({ type: 'pickUp', itemId: 'kettle' })

  assert.deepEqual(eventsOfType(events, 'takenOffHeater'), [{ type: 'takenOffHeater', itemId: 'kettle' }])
  assert.equal(ritual.state.heater.itemIdOnTop, null)
  assert.deepEqual(ritual.state.keeper.hands, ['kettle', null, null])
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

  const events = ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'openVesselLid', reason: 'outOfReach' }])
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
  ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })

  ritual.do({ type: 'pickUp', itemId: 'caddy' })

  assert.equal(ritual.vessel('caddy').isLidOpen, false)
})

test('middleHand_withBothHandsFull_growsAndTakesTheItem', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'pickUp', itemId: 'thermos' })

  const events = ritual.do({ type: 'pickUpWithAMiddleHand', itemId: 'cup1' })

  assert.deepEqual(ritual.state.keeper.hands, ['kettle', 'thermos', 'cup1'])
  assert.equal(ritual.state.keeper.hasAMiddleHand, true)
  assert.deepEqual(eventsOfType(events, 'middleHandGrown'), [{ type: 'middleHandGrown', itemId: 'cup1' }])
})

test('middleHand_whenAHandIsStillFree_doesNotGrow', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  const events = ritual.do({ type: 'pickUpWithAMiddleHand', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUpWithAMiddleHand', reason: 'aHandIsFree' }])
  assert.equal(ritual.state.keeper.hasAMiddleHand, false)
})

test('middleHand_whenItsItemIsPutDown_vanishesAndTakesNothingMore', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'pickUp', itemId: 'thermos' })
  ritual.do({ type: 'pickUpWithAMiddleHand', itemId: 'cup1' })

  const events = ritual.do({ type: 'putDown', itemId: 'cup1', spot: { placeId: 'table', x: 3, y: 0, z: 0 } })

  assert.deepEqual(eventsOfType(events, 'middleHandVanished'), [{ type: 'middleHandVanished' }])
  assert.equal(ritual.state.keeper.hasAMiddleHand, false)
  assert.deepEqual(ritual.do({ type: 'pickUp', itemId: 'cup2' }), [{ type: 'actionRefused', command: 'pickUp', reason: 'handsFull' }])
})

test('middleHand_forAThermosTooHotToTake_doesNotGrow', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(30)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })

  const events = ritual.do({ type: 'pickUpWithAMiddleHand', itemId: 'thermos' })

  assert.deepEqual(eventsOfType(events, 'middleHandGrown'), [])
  assert.equal(ritual.state.keeper.hasAMiddleHand, false)
  assert.deepEqual(ritual.state.keeper.hands, ['kettle', 'cup1', null])
})

test('middleHand_forAnItemOutOfReach_isRefusedAsTheMiddleHandTakeAndDoesNotGrow', () => {
  const ritual = houseRitual()
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'pickUp', itemId: 'cup2' })

  const events = ritual.do({ type: 'pickUpWithAMiddleHand', itemId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUpWithAMiddleHand', reason: 'outOfReach' }])
  assert.equal(ritual.state.keeper.hasAMiddleHand, false)
})

function houseRitual(): TestRitual {
  return TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
}
