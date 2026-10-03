import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { catalogWithRoomChanges, testCatalog, testHouseCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestTeaSession } from '../Support/TestTeaSession.ts'
import { wetMlOnEveryPlace } from '../../Shared/GameLogic/Simulation/Puddles.ts'

test('kettle_whenPutInTheSink_waitsWithTheTapClosed', () => {
  const session = openKettleInHandAtTheCounter()

  session.do({ type: 'putInTheSink', itemId: 'kettle' })
  session.wait(2)

  assert.equal(session.state.sink.runningWater, null)
  assertNear(session.vessel('kettle').liquid.volumeMl, 500)
})

test('kettle_inTheSinkWhenTheTapIsTurnedOn_fillsAtItsFlow', () => {
  const session = openKettleInHandAtTheCounter()
  session.do({ type: 'putInTheSink', itemId: 'kettle' })

  session.do({ type: 'turnTheTapOn' })
  session.wait(2)

  assertNear(session.vessel('kettle').liquid.volumeMl, 700)
})

test('tapWater_whenAddedToAnEqualVolumeOfHotWater_meetsItHalfway', () => {
  const session = openKettleInHandAtTheCounter()
  session.heatKettleTo(80)
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })

  session.fillInTheSink('kettle', 5)

  assertNear(session.vessel('kettle').liquid.temperatureC, 50, 0.1)
})

test('kettle_whenFullInTheSink_sendsTheRestDownTheDrain', () => {
  const session = openKettleInHandAtTheCounter()

  const events = session.fillInTheSink('kettle', 7)

  assertNear(session.vessel('kettle').liquid.volumeMl, 1000)
  assert.deepEqual(eventsOfType(events, 'vesselOverflowed'), [{ type: 'vesselOverflowed', vesselId: 'kettle' }])
  assert.equal(wetMlOnEveryPlace(session.state), 0)
})

test('tapWater_onAClosedLid_runsDownTheDrainAndNotIntoTheKettle', () => {
  const session = openKettleInHandAtTheCounter()
  session.do({ type: 'closeVesselLid', vesselId: 'kettle' })

  session.fillInTheSink('kettle', 2)

  assertNear(session.vessel('kettle').liquid.volumeMl, 500)
  assert.equal(wetMlOnEveryPlace(session.state), 0)
})

test('kettle_whenItsLidIsOpenedInTheSinkUnderTheRunningTap_startsFilling', () => {
  const session = openKettleInHandAtTheCounter()
  session.do({ type: 'closeVesselLid', vesselId: 'kettle' })
  session.do({ type: 'putInTheSink', itemId: 'kettle' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(1)

  session.do({ type: 'openVesselLid', vesselId: 'kettle' })
  session.wait(2)

  assertNear(session.vessel('kettle').liquid.volumeMl, 700)
})

test('kettle_whenTakenOutOfTheSink_comesOutWithTheLidClosed', () => {
  const session = openKettleInHandAtTheCounter()
  session.do({ type: 'putInTheSink', itemId: 'kettle' })
  session.wait(1)

  const events = session.do({ type: 'pickUp', itemId: 'kettle' })

  assert.equal(session.vessel('kettle').isLidOpen, false)
  assert.deepEqual(eventsOfType(events, 'vesselLidClosed'), [{ type: 'vesselLidClosed', vesselId: 'kettle' }])
})

test('kettle_whenPutOnTheHeaterStraightFromTheSink_closesItsLid', () => {
  const session = openKettleInHandAtTheCounter()
  session.do({ type: 'putInTheSink', itemId: 'kettle' })

  const events = session.do({ type: 'placeOnHeater', itemId: 'kettle' })

  assert.equal(session.vessel('kettle').isLidOpen, false)
  assert.deepEqual(eventsOfType(events, 'vesselLidClosed'), [{ type: 'vesselLidClosed', vesselId: 'kettle' }])
})

test('tap_whenThePlayerWalksAway_keepsRunningIntoTheKettle', () => {
  const session = openKettleInHandAtTheCounter()
  session.do({ type: 'putInTheSink', itemId: 'kettle' })
  session.do({ type: 'turnTheTapOn' })

  session.do({ type: 'standAt', placeId: 'table' })
  session.wait(3)

  assertNear(session.vessel('kettle').liquid.volumeMl, 800)
})

test('tap_whenTheKettleIsTakenOut_keepsRunningIntoTheEmptySink', () => {
  const session = openKettleInHandAtTheCounter()
  session.do({ type: 'putInTheSink', itemId: 'kettle' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(1)
  session.do({ type: 'pickUp', itemId: 'kettle' })

  session.wait(1)

  assertNear(session.vessel('kettle').liquid.volumeMl, 600)
  assert.notEqual(session.state.sink.runningWater, null)
})

test('tap_whenTurnedOffWithTheKettleInTheSink_stopsFillingIt', () => {
  const session = openKettleInHandAtTheCounter()
  session.do({ type: 'putInTheSink', itemId: 'kettle' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(1)

  session.do({ type: 'turnTheTapOff' })
  session.wait(1)

  assertNear(session.vessel('kettle').liquid.volumeMl, 600)
})

test('sink_whenSomethingIsInIt_refusesASecondItem', () => {
  const session = new TestTeaSession(testHouseCatalog(), 'testHouse')
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'pickUp', itemId: 'cup1' })
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'putInTheSink', itemId: 'kettle' })

  const events = session.do({ type: 'putInTheSink', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'sinkOccupied' }])
})

test('caddy_washedUnderTheTapWithItsLidOpenForAMinute_hasEveryLeafWashedOut', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'caddy' })
  session.do({ type: 'putInTheSink', itemId: 'caddy' })
  session.do({ type: 'turnTheTapOn', use: 'wash' })
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })

  const events = session.wait(60)

  assert.equal(session.vessel('caddy').leaves, null)
  assert.deepEqual(eventsOfType(events, 'lastLeavesWashedOut'), [{ type: 'lastLeavesWashedOut', vesselId: 'caddy', isACaddy: true }])
})

test('spoon_whenPutInTheSink_isRefusedAndStaysInHand', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'spoon' })

  const events = session.do({ type: 'putInTheSink', itemId: 'spoon' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'cannotGoInTheSink' }])
  assert.deepEqual(session.state.spoon.location, { kind: 'inHand', handIndex: 0 })
})

test('tap_whenTurnedOnWhileItRuns_isRefused', () => {
  const session = new TestTeaSession()
  session.do({ type: 'turnTheTapOn' })

  const events = session.do({ type: 'turnTheTapOn' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'turnTheTapOn', reason: 'tapAlreadyOn' }])
})

test('tap_whenTurnedOffWhileClosed_isRefused', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'turnTheTapOff' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'turnTheTapOff', reason: 'tapAlreadyOff' }])
})

test('sink_awayFromTheCounter_isRefused', () => {
  const session = openKettleInHandAtTheCounter()
  session.do({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'putInTheSink', itemId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'notAtThatPlace' }])
})

test('tap_whenThePlayerIsNotAtTheCounter_cannotBeTurnedOn', () => {
  const session = new TestTeaSession(testHouseCatalog(), 'testHouse')
  session.do({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'turnTheTapOn' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'turnTheTapOn', reason: 'notAtThatPlace' }])
})

test('tap_whenThePlayerWalkedAwayFromTheCounter_cannotBeTurnedOff', () => {
  const session = new TestTeaSession(testHouseCatalog(), 'testHouse')
  session.doWithoutARefusal({ type: 'standAt', placeId: 'counter' })
  session.doWithoutARefusal({ type: 'turnTheTapOn' })
  session.doWithoutARefusal({ type: 'standAt', placeId: 'table' })

  const events = session.do({ type: 'turnTheTapOff' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'turnTheTapOff', reason: 'notAtThatPlace' }])
})

test('tap_withBothHandsFull_turnsOn', () => {
  const session = new TestTeaSession()
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'thermos' })

  const events = session.do({ type: 'turnTheTapOn' })

  assert.deepEqual(events, [{ type: 'tapTurnedOn' }])
})

test('sink_withTheKettleStandingOnTheCounter_isRefusedUntilItIsHeld', () => {
  const session = new TestTeaSession(testHouseCatalog(), 'testHouse')
  session.do({ type: 'standAt', placeId: 'counter' })

  const events = session.do({ type: 'putInTheSink', itemId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'notInHand' }])
})

test('kettle_pouredOutWhileInTheSink_leavesNoPuddle', () => {
  const session = openKettleInHandAtTheCounter()
  session.doWithoutARefusal({ type: 'putInTheSink', itemId: 'kettle' })

  session.pour('kettle', null, 5)

  assert.ok(session.vessel('kettle').liquid.volumeMl < 500)
  assert.deepEqual(session.state.puddles, {})
})

test('bowlInTheSink_whenTheKettleIsPouredIntoIt_fills', () => {
  const session = kettleInHandAndCup1InTheSink()

  session.pour('kettle', 'cup1', 3)

  assert.ok(session.vessel('cup1').liquid.volumeMl > 0)
})

test('bowlInTheSink_whenPouredPastItsBrim_leavesNoPuddle', () => {
  const session = kettleInHandAndCup1InTheSink()

  const events = session.pour('kettle', 'cup1', 20)

  assert.deepEqual(eventsOfType(events, 'vesselOverflowed'), [{ type: 'vesselOverflowed', vesselId: 'cup1' }])
  assert.deepEqual(session.state.puddles, {})
})

test('sink_inARoomWithoutATap_isRefused', () => {
  const session = new TestTeaSession(catalogWithRoomChanges({ tap: null }))
  session.do({ type: 'pickUp', itemId: 'kettle' })

  const events = session.do({ type: 'putInTheSink', itemId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'noTapInThisRoom' }])
})

test('teaInABowl_whenTheTapRunsOverItsRim_fadesToPlainWater', () => {
  const session = cupOfTeaInHand()
  const strengthBefore = session.vessel('cup1').liquid.strength

  session.do({ type: 'putInTheSink', itemId: 'cup1' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(5)

  assert.ok(strengthBefore > 30, `strength before ${strengthBefore}`)
  assert.ok(session.vessel('cup1').liquid.strength < 1, `strength ${session.vessel('cup1').liquid.strength}`)
})

test('leavesInABowl_whenWashedUntilTheTapRunsOverItsRim_areWashedOut', () => {
  const session = new TestTeaSession()
  session.tipASpoonOfLeavesInto('cup1')
  session.do({ type: 'pickUp', itemId: 'cup1' })

  session.do({ type: 'putInTheSink', itemId: 'cup1' })
  session.do({ type: 'turnTheTapOn', use: 'wash' })
  session.wait(5)

  assert.equal(session.vessel('cup1').leaves, null)
})

test('leavesInABowl_whenTheTapFillsItPastItsRim_stay', () => {
  const session = new TestTeaSession()
  session.tipASpoonOfLeavesInto('cup1')
  session.do({ type: 'pickUp', itemId: 'cup1' })

  session.do({ type: 'putInTheSink', itemId: 'cup1' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(5)

  assert.deepEqual(session.vessel('cup1').leaves?.gramsByTeaId, { testGreen: 5 })
})

test('leavesInABowl_whenPutUnderTheRunningTapToWash_areWashedOut', () => {
  const session = new TestTeaSession()
  session.tipASpoonOfLeavesInto('cup1')
  session.do({ type: 'pickUp', itemId: 'cup1' })
  session.do({ type: 'turnTheTapOn' })

  session.do({ type: 'putInTheSink', itemId: 'cup1', use: 'wash' })
  session.wait(5)

  assert.equal(session.vessel('cup1').leaves, null)
})

test('leavesInABowl_whileTheTapFillsItBelowTheRim_stayAndFloat', () => {
  const session = new TestTeaSession()
  session.tipASpoonOfLeavesInto('cup1')
  session.do({ type: 'pickUp', itemId: 'cup1' })
  session.do({ type: 'putInTheSink', itemId: 'cup1' })
  session.do({ type: 'turnTheTapOn' })

  session.wait(0.5)

  assertNear(session.vessel('cup1').liquid.volumeMl, 50)
  assert.deepEqual(session.vessel('cup1').leaves?.gramsByTeaId, { testGreen: 5 })
})

test('bowl_whenTakenOutAfterItWasWashedPastItsRim_isPouredEmpty', () => {
  const session = cupOfTeaInHand()
  session.do({ type: 'putInTheSink', itemId: 'cup1' })
  session.do({ type: 'turnTheTapOn', use: 'wash' })
  session.wait(3)
  session.do({ type: 'turnTheTapOff' })

  session.do({ type: 'pickUp', itemId: 'cup1' })

  assert.equal(session.vessel('cup1').liquid.volumeMl, 0)
})

test('bowl_whenTakenOutAfterTheTapFilledItPastItsRim_keepsItsWater', () => {
  const session = cupOfTeaInHand()
  session.do({ type: 'putInTheSink', itemId: 'cup1' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(3)
  session.do({ type: 'turnTheTapOff' })

  session.do({ type: 'pickUp', itemId: 'cup1' })

  assert.equal(session.vessel('cup1').liquid.volumeMl, 100)
})

test('bowl_whenTakenOutBeforeTheTapRanOverItsRim_keepsItsWater', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'cup1' })
  session.do({ type: 'putInTheSink', itemId: 'cup1' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(0.5)
  session.do({ type: 'turnTheTapOff' })

  session.do({ type: 'pickUp', itemId: 'cup1' })

  assertNear(session.vessel('cup1').liquid.volumeMl, 50)
})

test('kettleOfTea_whenTheTapRunsOverItsRimForLong_comesOutFullOfClearWater', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  session.addLeavesToKettle(5)
  session.wait(60)
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })

  session.fillInTheSink('kettle', 60)

  assert.ok(session.vessel('kettle').liquid.strength < 1, `strength ${session.vessel('kettle').liquid.strength}`)
  assertNear(session.vessel('kettle').liquid.volumeMl, 1000)
})

test('boilingWaterInTheThermos_whenTheTapRunsOverItsRim_coolsToTheTapWater', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(100)
  session.do({ type: 'openVesselLid', vesselId: 'thermos' })
  session.pour('kettle', 'thermos', 10)
  session.do({ type: 'pickUp', itemId: 'thermos' })
  session.do({ type: 'openVesselLid', vesselId: 'thermos' })
  const temperatureBefore = session.vessel('thermos').liquid.temperatureC

  session.do({ type: 'putInTheSink', itemId: 'thermos' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(30)

  assert.ok(temperatureBefore > 90, `temperature before ${temperatureBefore}`)
  assertNear(session.vessel('thermos').liquid.temperatureC, 20, 0.5)
})

test('tap_whenTurnedOff_saysHowLongItRanAndHowMuchWentDownTheDrain', () => {
  const session = openKettleInHandAtTheCounter()
  session.do({ type: 'putInTheSink', itemId: 'kettle' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(10)

  const events = session.do({ type: 'turnTheTapOff' })

  const [turnedOff] = eventsOfType(events, 'tapTurnedOff')
  assertNear(turnedOff?.openSeconds ?? 0, 10)
  assertNear(turnedOff?.drainedMl ?? 0, 500)
})

test('drainedWater_whileItemsGoInAndOutOfTheSink_countsFromWhenTheTapOpened', () => {
  const session = openKettleInHandAtTheCounter()
  session.do({ type: 'closeVesselLid', vesselId: 'kettle' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(2)
  session.do({ type: 'putInTheSink', itemId: 'kettle' })
  session.wait(1)
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.wait(1)

  const events = session.do({ type: 'turnTheTapOff' })

  assertNear(eventsOfType(events, 'tapTurnedOff')[0]?.drainedMl ?? 0, 400)
})

test('tap_whenTurnedOffAfterRunningIntoTheEmptySinkAllAlong_saysItRanOntoNothing', () => {
  const session = openKettleInHandAtTheCounter()
  session.do({ type: 'turnTheTapOn' })
  session.wait(3)

  const events = session.do({ type: 'turnTheTapOff' })

  assert.equal(eventsOfType(events, 'tapTurnedOff')[0]?.hasRunOntoAnItem, false)
})

test('tap_whenTurnedOffAfterTheKettleWasTakenOutOfTheSink_saysItRanOntoAnItem', () => {
  const session = openKettleInHandAtTheCounter()
  session.do({ type: 'putInTheSink', itemId: 'kettle' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(1)
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.wait(3)

  const events = session.do({ type: 'turnTheTapOff' })

  assert.equal(eventsOfType(events, 'tapTurnedOff')[0]?.hasRunOntoAnItem, true)
})

function openKettleInHandAtTheCounter(): TestTeaSession {
  const session = new TestTeaSession(testHouseCatalog(), 'testHouse')
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })
  return session
}

function cupOfTeaInHand(): TestTeaSession {
  const session = new TestTeaSession(testCatalog({ cup: 0 }))
  session.heatKettleTo(80)
  session.addLeavesToKettle(5)
  session.wait(60)
  session.pour('kettle', 'cup1', 9)
  session.do({ type: 'pickUp', itemId: 'cup1' })
  return session
}

function kettleInHandAndCup1InTheSink(): TestTeaSession {
  const session = new TestTeaSession()
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'cup1' })
  session.doWithoutARefusal({ type: 'putInTheSink', itemId: 'cup1' })
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  return session
}
