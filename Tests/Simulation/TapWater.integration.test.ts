import assert from 'node:assert/strict'
import test from 'node:test'
import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, testHouseCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

test('kettle_whileHeldUnderTheOpenTap_fillsAtTheTapsFlow', () => {
  const ritual = kettleInHandAtTheCounter()

  ritual.fillFromTap('kettle', 2)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, 700)
})

test('tapWater_whenAddedToAnEqualVolumeOfHotWater_meetsItHalfway', () => {
  const ritual = kettleInHandAtTheCounter()
  ritual.heatKettleTo(80)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  ritual.fillFromTap('kettle', 5)

  assertNear(ritual.vessel('kettle').liquid.temperatureC, 50, 0.1)
})

test('kettle_whenFullUnderTheTap_sendsTheRestIntoTheSink', () => {
  const ritual = kettleInHandAtTheCounter()

  const events = ritual.fillFromTap('kettle', 7)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, 1000)
  assert.deepEqual(eventsOfType(events, 'vesselOverflowed'), [{ type: 'vesselOverflowed', vesselId: 'kettle' }])
  assert.equal(ritual.state.tableWetMl, 0)
})

test('filling_withTheLidClosed_isRefused', () => {
  const ritual = kettleInHandAtTheCounter()
  ritual.do({ type: 'closeVesselLid', vesselId: 'kettle' })

  const events = ritual.do({ type: 'startFillingFromTap', vesselId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startFillingFromTap', reason: 'lidClosed' }])
})

test('filling_awayFromTheTap_isRefused', () => {
  const ritual = kettleInHandAtTheCounter()
  ritual.do({ type: 'standAt', placeId: 'table' })

  const events = ritual.do({ type: 'startFillingFromTap', vesselId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startFillingFromTap', reason: 'notAtThatPlace' }])
})

test('filling_withTheKettleStandingOnTheCounter_isRefusedUntilItIsHeld', () => {
  const ritual = TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })

  const events = ritual.do({ type: 'startFillingFromTap', vesselId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startFillingFromTap', reason: 'notInHand' }])
})

test('filling_whenTheKeeperWalksAway_stops', () => {
  const ritual = kettleInHandAtTheCounter()
  ritual.do({ type: 'startFillingFromTap', vesselId: 'kettle' })
  ritual.wait(1)

  const events = ritual.do({ type: 'standAt', placeId: 'table' })

  assert.equal(ritual.state.filling, null)
  assert.deepEqual(eventsOfType(events, 'fillingFinished'), [{ type: 'fillingFinished', vesselId: 'kettle', filledMl: 100, overflowedMl: 0 }])
})

test('filling_whenTheKettleIsPutDown_stopsAtTheNextStep', () => {
  const ritual = kettleInHandAtTheCounter()
  ritual.do({ type: 'startFillingFromTap', vesselId: 'kettle' })
  ritual.wait(1)
  ritual.do({ type: 'putDown', itemId: 'kettle', spot: { placeId: 'counter', x: 1, y: 0, z: 0 } })

  ritual.wait(1)

  assert.equal(ritual.state.filling, null)
  assertNear(ritual.vessel('kettle').liquid.volumeMl, 600)
})

test('filling_inARoomWithoutATap_isRefused', () => {
  const ritual = TestRitual.begun(catalogWithoutATap())
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  const events = ritual.do({ type: 'startFillingFromTap', vesselId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startFillingFromTap', reason: 'noTapInThisRoom' }])
})

function kettleInHandAtTheCounter(): TestRitual {
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
