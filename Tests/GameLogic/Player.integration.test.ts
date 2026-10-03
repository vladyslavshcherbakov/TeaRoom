import assert from 'node:assert/strict'
import test from 'node:test'
import { testHouseCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestTeaSession } from '../Support/TestTeaSession.ts'
import { itemIdsInTheHands, itemIdOnTheHeater } from '../../Shared/GameLogic/State/WhereItemsAre.ts'

const onTheTable = { placeId: 'table', x: 0.5, y: 0.4, z: -1 }

test('cup_whenPickedUpWhereThePlayerStands_goesIntoTheFirstFreeHand', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'shelf' })

  const events = session.do({ type: 'pickUp', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'pickedUp', itemId: 'cup1', handIndex: 0 }])
  assert.deepEqual(itemIdsInTheHands(session.state), ['cup1', null])
})

test('cup_whenThePlayerStandsElsewhere_isOutOfReach', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'counter' })

  const events = session.do({ type: 'pickUp', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUp', reason: 'outOfReach' }])
})

test('thirdItem_whenBothHandsAreFull_isRefusedAndStaysOnTheShelf', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'pickUp', itemId: 'cup1' })
  session.do({ type: 'pickUp', itemId: 'cup2' })

  const events = session.do({ type: 'pickUp', itemId: 'caddy' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUp', reason: 'handsFull' }])
  assert.equal(session.vessel('caddy').location.kind, 'onSurface')
})

test('cup_whenPutDownOnTheTable_restsExactlyWhereItWasPut', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'pickUp', itemId: 'cup1' })
  session.do({ type: 'standAt', placeId: 'table' })

  session.do({ type: 'putDown', itemId: 'cup1', spot: onTheTable })

  assert.deepEqual(session.vessel('cup1').location, { kind: 'onSurface', spot: onTheTable })
  assert.deepEqual(itemIdsInTheHands(session.state), [null, null])
})

test('cup_whenPutDownAtAPlaceThePlayerIsNotAt_isRefused', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'pickUp', itemId: 'cup1' })

  const events = session.do({ type: 'putDown', itemId: 'cup1', spot: onTheTable })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putDown', reason: 'notAtThatPlace' }])
  assert.deepEqual(itemIdsInTheHands(session.state), ['cup1', null])
})

test('cup_lyingOnAnotherPlace_cannotBePutDownAsItIsOutOfReach', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'putDown', itemId: 'cup1', spot: onTheTable })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putDown', reason: 'outOfReach' }])
})

test('kettle_whenTastedFromAnotherPlace_isOutOfReachBeforeItIsJudgedUndrinkable', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'tasteCup', cupId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tasteCup', reason: 'outOfReach' }])
})

test('heater_whenThePlayerIsNotAtTheCounter_cannotBeSwitchedOn', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'switchHeaterOn' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'switchHeaterOn', reason: 'notAtThatPlace' }])
})

test('thermostat_whenThePlayerIsNotAtTheCounter_cannotBeSet', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'setTheThermostat', targetC: 60 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'setTheThermostat', reason: 'notAtThatPlace' }])
})

test('thermostat_whenThePlayerIsNotAtTheCounter_cannotBeStarted', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'startTheThermostat' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startTheThermostat', reason: 'notAtThatPlace' }])
})

test('thermostat_whenThePlayerWalkedAwayFromTheCounter_cannotBeStopped', () => {
  const session = houseSession()
  session.doWithoutARefusal({ type: 'standAt', placeId: 'counter' })
  session.doWithoutARefusal({ type: 'startTheThermostat' })
  session.doWithoutARefusal({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'stopTheThermostat' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'stopTheThermostat', reason: 'notAtThatPlace' }])
})

test('spoon_inHandAtTheTable_cannotScoopFromTheCaddyOnTheShelf', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'table' })
  session.do({ type: 'pickUp', itemId: 'spoon' })

  const events = session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'scoopTea', reason: 'outOfReach' }])
})

test('spoon_inHandAtTheTable_cannotTipLeavesIntoACupOnTheShelf', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'table' })
  session.do({ type: 'pickUp', itemId: 'spoon' })
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })
  session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })
  session.do({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'tipSpoonInto', vesselId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tipSpoonInto', reason: 'outOfReach' }])
  assert.deepEqual(session.state.spoon.gramsByTeaId, { testGreen: 5 })
})

test('kettle_inHandAwayFromTheCounter_cannotBePutOnTheHeater', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'placeOnHeater', itemId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'placeOnHeater', reason: 'notAtThatPlace' }])
  assert.equal(itemIdOnTheHeater(session.state), null)
})

for (const command of [{ type: 'setTheThermostat', targetC: 60 }, { type: 'startTheThermostat' }, { type: 'stopTheThermostat' }, { type: 'switchHeaterOff' }, { type: 'turnTheTapOn' }, { type: 'turnTheTapOff' }] as const) {
  test(`${command.type}_awayFromTheCounter_isRefused`, () => {
    const session = houseSession()
    session.do({ type: 'standAt', placeId: 'table' })

    const events = session.do(command)

    assert.deepEqual(events, [{ type: 'actionRefused', command: command.type, reason: 'notAtThatPlace' }])
  })
}

test('cloth_lyingOnTheTable_cannotSoakUpItsPuddleFromTheCounter', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'standAt', placeId: 'table' })
  session.pour('kettle', null, 2.5)
  session.do({ type: 'standAt', placeId: 'counter' })

  const events = session.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 0 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'soakUpThePuddle', reason: 'outOfReach' }])
})

test('cloth_lyingOnTheTable_startsSoakingAPuddleThatReachesItWhileThePlayerIsAtTheCounter', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'standAt', placeId: 'table' })
  session.pour('kettle', null, 2.5)
  session.do({ type: 'standAt', placeId: 'counter' })

  session.do({ type: 'puddleReachesTheCloth', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 0 })

  assert.equal(session.cloth().soakingPuddleId, 'puddle1')
})

test('kettle_whenPutOnTheHeaterFromTheHand_leavesTheHandFree', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'pickUp', itemId: 'kettle' })

  session.do({ type: 'placeOnHeater', itemId: 'kettle' })

  assert.equal(itemIdOnTheHeater(session.state), 'kettle')
  assert.deepEqual(itemIdsInTheHands(session.state), [null, null])
  assert.equal(session.vessel('kettle').location.kind, 'onTheHeater')
})

test('kettle_whenPickedUpFromAWorkingHeater_isLiftedOff', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(14)

  const events = session.do({ type: 'pickUp', itemId: 'kettle' })

  assert.deepEqual(eventsOfType(events, 'takenOffHeater'), [{ type: 'takenOffHeater', itemId: 'kettle' }])
  assert.equal(itemIdOnTheHeater(session.state), null)
  assert.deepEqual(itemIdsInTheHands(session.state), ['kettle', null])
})

test('kettleInHand_whenPouredIntoACupOnTheTable_fillsIt', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'pickUp', itemId: 'cup1' })
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'standAt', placeId: 'table' })
  session.do({ type: 'putDown', itemId: 'cup1', spot: onTheTable })

  session.pour('kettle', 'cup1', 5)

  assert.equal(Math.round(session.vessel('cup1').liquid.volumeMl), 50)
})

test('kettleInHand_whenPouredIntoACupStillOnTheShelf_isRefused', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startPouring', reason: 'outOfReach' }])
})

test('pour_whenThePlayerWalksAway_ends', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'pickUp', itemId: 'cup1' })
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'standAt', placeId: 'table' })
  session.do({ type: 'putDown', itemId: 'cup1', spot: onTheTable })
  session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  const events = session.do({ type: 'standAt', placeId: null })

  assert.equal(eventsOfType(events, 'pourFinished').length, 1)
  assert.equal(session.state.pour, null)
})

test('caddy_whenOnTheShelfAndThePlayerAtTheTable_cannotBeOpened', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'openVesselLid', vesselId: 'caddy' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'openVesselLid', reason: 'outOfReach' }])
})

test('kettle_whenPickedUpWithItsLidOpen_hasItsLidClosed', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })

  const events = session.do({ type: 'pickUp', itemId: 'kettle' })

  assert.equal(session.vessel('kettle').isLidOpen, false)
  assert.deepEqual(eventsOfType(events, 'vesselLidClosed'), [{ type: 'vesselLidClosed', vesselId: 'kettle' }])
})

test('caddy_whenPickedUpOpen_isClosed', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })

  session.do({ type: 'pickUp', itemId: 'caddy' })

  assert.equal(session.vessel('caddy').isLidOpen, false)
})

test('item_theRoomDoesNotHave_cannotBePickedUp', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'pickUp', itemId: 'teapot' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUp', reason: 'unknownItem' }])
})

test('player_whenAskedToStandAtAPlaceTheRoomDoesNotHave_staysWhereTheyStand', () => {
  const session = houseSession()
  session.do({ type: 'standAt', placeId: 'shelf' })

  const events = session.do({ type: 'standAt', placeId: 'attic' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'standAt', reason: 'unknownPlace' }])
  assert.equal(session.state.player.placeId, 'shelf')
})

test('lid_whenOpenedWhileOpen_isRefused', () => {
  const session = new TestTeaSession()
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })

  const events = session.do({ type: 'openVesselLid', vesselId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'openVesselLid', reason: 'lidAlreadyOpen' }])
})

test('lid_whenClosedWhileClosed_isRefused', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'closeVesselLid', vesselId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'closeVesselLid', reason: 'lidAlreadyClosed' }])
})

test('lid_ofABowl_cannotBeOpenedAsItHasNone', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'openVesselLid', vesselId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'openVesselLid', reason: 'vesselHasNoLid' }])
})

function houseSession(): TestTeaSession {
  return new TestTeaSession(testHouseCatalog(), 'testHouse')
}
