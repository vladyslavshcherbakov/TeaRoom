import assert from 'node:assert/strict'
import test from 'node:test'
import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, testHouseCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'
import { wetMlOnEveryPlace } from '../../Shared/Simulation/Ritual/Puddles.ts'

test('kettle_whenPutInTheSink_waitsWithTheTapClosed', () => {
  const ritual = openKettleInHandAtTheCounter()

  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.wait(2)

  assert.equal(ritual.state.sink.runningWater, null)
  assertNear(ritual.vessel('kettle').liquid.volumeMl, 500)
})

test('kettle_inTheSinkWhenTheTapIsTurnedOn_fillsAtItsFlow', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })

  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(2)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, 700)
})

test('tapWater_whenAddedToAnEqualVolumeOfHotWater_meetsItHalfway', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.heatKettleTo(80)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })

  ritual.fillInTheSink('kettle', 5)

  assertNear(ritual.vessel('kettle').liquid.temperatureC, 50, 0.1)
})

test('kettle_whenFullInTheSink_sendsTheRestDownTheDrain', () => {
  const ritual = openKettleInHandAtTheCounter()

  const events = ritual.fillInTheSink('kettle', 7)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, 1000)
  assert.deepEqual(eventsOfType(events, 'vesselOverflowed'), [{ type: 'vesselOverflowed', vesselId: 'kettle' }])
  assert.equal(wetMlOnEveryPlace(ritual.state), 0)
})

test('tapWater_onAClosedLid_runsDownTheDrainAndNotIntoTheKettle', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'closeVesselLid', vesselId: 'kettle' })

  ritual.fillInTheSink('kettle', 2)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, 500)
  assert.equal(wetMlOnEveryPlace(ritual.state), 0)
})

test('kettle_whenItsLidIsOpenedInTheSinkUnderTheRunningTap_startsFilling', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'closeVesselLid', vesselId: 'kettle' })
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(1)

  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })
  ritual.wait(2)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, 700)
})

test('kettle_whenTakenOutOfTheSink_comesOutWithTheLidClosed', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.wait(1)

  const events = ritual.do({ type: 'pickUp', itemId: 'kettle' })

  assert.equal(ritual.vessel('kettle').isLidOpen, false)
  assert.deepEqual(eventsOfType(events, 'vesselLidClosed'), [{ type: 'vesselLidClosed', vesselId: 'kettle' }])
})

test('kettle_whenPutOnTheHeaterStraightFromTheSink_closesItsLid', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })

  const events = ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })

  assert.equal(ritual.vessel('kettle').isLidOpen, false)
  assert.deepEqual(eventsOfType(events, 'vesselLidClosed'), [{ type: 'vesselLidClosed', vesselId: 'kettle' }])
})

test('tap_whenTheKeeperWalksAway_keepsRunningIntoTheKettle', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.do({ type: 'turnTheTapOn' })

  ritual.do({ type: 'standAt', placeId: 'table' })
  ritual.wait(3)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, 800)
})

test('tap_whenTheKettleIsTakenOut_keepsRunningIntoTheEmptySink', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(1)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  ritual.wait(1)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, 600)
  assert.notEqual(ritual.state.sink.runningWater, null)
})

test('tap_whenTurnedOffWithTheKettleInTheSink_stopsFillingIt', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(1)

  ritual.do({ type: 'turnTheTapOff' })
  ritual.wait(1)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, 600)
})

test('sink_whenSomethingIsInIt_refusesASecondItem', () => {
  const ritual = new TestRitual(testHouseCatalog(), 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })

  const events = ritual.do({ type: 'putInTheSink', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'sinkOccupied' }])
})

test('caddy_underTheRunningTapWithItsLidOpenForAMinute_hasEveryLeafWashedOut', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'pickUp', itemId: 'caddy' })
  ritual.do({ type: 'putInTheSink', itemId: 'caddy' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })

  const events = ritual.wait(60)

  assert.equal(ritual.vessel('caddy').leaves, null)
  assert.deepEqual(eventsOfType(events, 'lastLeavesWashedOut'), [{ type: 'lastLeavesWashedOut', vesselId: 'caddy', isACaddy: true }])
})

test('spoon_whenPutInTheSink_isRefusedAndStaysInHand', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'pickUp', itemId: 'spoon' })

  const events = ritual.do({ type: 'putInTheSink', itemId: 'spoon' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'cannotGoInTheSink' }])
  assert.deepEqual(ritual.state.spoon.location, { kind: 'inHand', handIndex: 0 })
})

test('tap_whenTurnedOnWhileItRuns_isRefused', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'turnTheTapOn' })

  const events = ritual.do({ type: 'turnTheTapOn' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'turnTheTapOn', reason: 'tapAlreadyOn' }])
})

test('tap_whenTurnedOffWhileClosed_isRefused', () => {
  const ritual = new TestRitual()

  const events = ritual.do({ type: 'turnTheTapOff' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'turnTheTapOff', reason: 'tapAlreadyOff' }])
})

test('sink_awayFromTheCounter_isRefused', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'standAt', placeId: 'table' })

  const events = ritual.do({ type: 'putInTheSink', itemId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'notAtThatPlace' }])
})

test('sink_withTheKettleStandingOnTheCounter_isRefusedUntilItIsHeld', () => {
  const ritual = new TestRitual(testHouseCatalog(), 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'counter' })

  const events = ritual.do({ type: 'putInTheSink', itemId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'notInHand' }])
})

test('kettle_inTheSink_cannotBePouredFrom', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })

  const events = ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: null })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startPouring', reason: 'vesselIsInTheSink' }])
})

test('sink_inARoomWithoutATap_isRefused', () => {
  const ritual = new TestRitual(catalogWithoutATap())
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  const events = ritual.do({ type: 'putInTheSink', itemId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'noTapInThisRoom' }])
})

test('teaInABowl_whenTheTapRunsOverItsRim_fadesToPlainWater', () => {
  const ritual = cupOfTeaInHand()
  const strengthBefore = ritual.vessel('cup1').liquid.strength

  ritual.do({ type: 'putInTheSink', itemId: 'cup1' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(5)

  assert.ok(strengthBefore > 30, `strength before ${strengthBefore}`)
  assert.ok(ritual.vessel('cup1').liquid.strength < 1, `strength ${ritual.vessel('cup1').liquid.strength}`)
})

test('leavesInABowl_whenTheTapRunsOverItsRim_areWashedOut', () => {
  const ritual = new TestRitual()
  ritual.tipASpoonOfLeavesInto('cup1')
  ritual.do({ type: 'pickUp', itemId: 'cup1' })

  ritual.do({ type: 'putInTheSink', itemId: 'cup1' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(5)

  assert.equal(ritual.vessel('cup1').leaves, null)
})

test('leavesInABowl_whileTheTapFillsItBelowTheRim_stayAndFloat', () => {
  const ritual = new TestRitual()
  ritual.tipASpoonOfLeavesInto('cup1')
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'putInTheSink', itemId: 'cup1' })
  ritual.do({ type: 'turnTheTapOn' })

  ritual.wait(0.5)

  assertNear(ritual.vessel('cup1').liquid.volumeMl, 50)
  assert.equal(ritual.vessel('cup1').leaves?.grams, 5)
})

test('bowl_whenTakenOutAfterTheTapRanOverItsRim_isPouredEmpty', () => {
  const ritual = cupOfTeaInHand()
  ritual.do({ type: 'putInTheSink', itemId: 'cup1' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(3)
  ritual.do({ type: 'turnTheTapOff' })

  ritual.do({ type: 'pickUp', itemId: 'cup1' })

  assert.equal(ritual.vessel('cup1').liquid.volumeMl, 0)
})

test('bowl_whenTakenOutBeforeTheTapRanOverItsRim_keepsItsWater', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'putInTheSink', itemId: 'cup1' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(0.5)
  ritual.do({ type: 'turnTheTapOff' })

  ritual.do({ type: 'pickUp', itemId: 'cup1' })

  assertNear(ritual.vessel('cup1').liquid.volumeMl, 50)
})

test('kettleOfTea_whenTheTapRunsOverItsRimForLong_comesOutFullOfClearWater', () => {
  const ritual = new TestRitual()
  ritual.heatKettleTo(80)
  ritual.addLeavesToKettle(5)
  ritual.wait(60)
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })

  ritual.fillInTheSink('kettle', 60)

  assert.ok(ritual.vessel('kettle').liquid.strength < 1, `strength ${ritual.vessel('kettle').liquid.strength}`)
  assertNear(ritual.vessel('kettle').liquid.volumeMl, 1000)
})

test('boilingWaterInTheThermos_whenTheTapRunsOverItsRim_coolsToTheTapWater', () => {
  const ritual = new TestRitual()
  ritual.heatKettleTo(100)
  ritual.do({ type: 'openVesselLid', vesselId: 'thermos' })
  ritual.pour('kettle', 'thermos', 10)
  ritual.do({ type: 'pickUp', itemId: 'thermos' })
  ritual.do({ type: 'openVesselLid', vesselId: 'thermos' })
  const temperatureBefore = ritual.vessel('thermos').liquid.temperatureC

  ritual.do({ type: 'putInTheSink', itemId: 'thermos' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(30)

  assert.ok(temperatureBefore > 90, `temperature before ${temperatureBefore}`)
  assertNear(ritual.vessel('thermos').liquid.temperatureC, 20, 0.5)
})

test('tap_whenTurnedOff_saysHowLongItRanAndHowMuchWentDownTheDrain', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(10)

  const events = ritual.do({ type: 'turnTheTapOff' })

  const [turnedOff] = eventsOfType(events, 'tapTurnedOff')
  assertNear(turnedOff?.openSeconds ?? 0, 10)
  assertNear(turnedOff?.drainedMl ?? 0, 500)
})

test('drainedWater_whileItemsGoInAndOutOfTheSink_countsFromWhenTheTapOpened', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'closeVesselLid', vesselId: 'kettle' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(2)
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.wait(1)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.wait(1)

  const events = ritual.do({ type: 'turnTheTapOff' })

  assertNear(eventsOfType(events, 'tapTurnedOff')[0]?.drainedMl ?? 0, 400)
})

test('tap_whenTurnedOffAfterRunningIntoTheEmptySinkAllAlong_saysItRanOntoNothing', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(3)

  const events = ritual.do({ type: 'turnTheTapOff' })

  assert.equal(eventsOfType(events, 'tapTurnedOff')[0]?.hasRunOntoAnItem, false)
})

test('tap_whenTurnedOffAfterTheKettleWasTakenOutOfTheSink_saysItRanOntoAnItem', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(1)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.wait(3)

  const events = ritual.do({ type: 'turnTheTapOff' })

  assert.equal(eventsOfType(events, 'tapTurnedOff')[0]?.hasRunOntoAnItem, true)
})

function openKettleInHandAtTheCounter(): TestRitual {
  const ritual = new TestRitual(testHouseCatalog(), 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })
  return ritual
}

function catalogWithoutATap(): Catalog {
  const catalog = testCatalog()
  const room = catalog.rooms.testRoom
  if (room === undefined) throw new Error('the test catalog lost its room')
  return { ...catalog, rooms: { testRoom: { ...room, tap: null } } }
}

function cupOfTeaInHand(): TestRitual {
  const ritual = new TestRitual(testCatalog({ cup: 0 }))
  ritual.heatKettleTo(80)
  ritual.addLeavesToKettle(5)
  ritual.wait(60)
  ritual.pour('kettle', 'cup1', 9)
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  return ritual
}
