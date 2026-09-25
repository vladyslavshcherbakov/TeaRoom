import assert from 'node:assert/strict'
import test from 'node:test'
import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, testHouseCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'
import { wetMlOnEveryPlace } from '../../Shared/Simulation/Ritual/Puddles.ts'

test('kettle_whenPutInTheSink_turnsTheTapOnAndFillsAtItsFlow', () => {
  const ritual = openKettleInHandAtTheCounter()

  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.wait(2)

  assert.notEqual(ritual.state.sink.runningWater, null)
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

test('tap_whenTheKeeperWalksAway_keepsRunningIntoTheKettle', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })

  ritual.do({ type: 'standAt', placeId: 'table' })
  ritual.wait(3)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, 800)
})

test('tap_whenTheKettleIsTakenOut_keepsRunningIntoTheEmptySink', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.wait(1)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  ritual.wait(1)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, 600)
  assert.notEqual(ritual.state.sink.runningWater, null)
})

test('tap_whenTurnedOffWithTheKettleInTheSink_stopsFillingIt', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.wait(1)

  ritual.do({ type: 'turnTheTapOff' })
  ritual.wait(1)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, 600)
})

test('sink_whenSomethingIsInIt_refusesASecondItem', () => {
  const ritual = TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })

  const events = ritual.do({ type: 'putInTheSink', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'sinkOccupied' }])
})

test('sink_forTheCaddy_isRefused', () => {
  const ritual = TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'caddy' })

  const events = ritual.do({ type: 'putInTheSink', itemId: 'caddy' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'cannotGoInTheSink' }])
})

test('sink_awayFromTheCounter_isRefused', () => {
  const ritual = openKettleInHandAtTheCounter()
  ritual.do({ type: 'standAt', placeId: 'table' })

  const events = ritual.do({ type: 'putInTheSink', itemId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'notAtThatPlace' }])
})

test('sink_withTheKettleStandingOnTheCounter_isRefusedUntilItIsHeld', () => {
  const ritual = TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
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
  const ritual = TestRitual.begun(catalogWithoutATap())
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  const events = ritual.do({ type: 'putInTheSink', itemId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putInTheSink', reason: 'noTapInThisRoom' }])
})

function openKettleInHandAtTheCounter(): TestRitual {
  const ritual = TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
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
