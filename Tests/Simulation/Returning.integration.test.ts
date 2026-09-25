import assert from 'node:assert/strict'
import test from 'node:test'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

test('kettle_whenTheKeeperIsAwayAnHour_coolsToTheRoom', () => {
  const coolingCatalog = testCatalog({ kettle: 0.01 })
  const ritual = TestRitual.begun(coolingCatalog)
  ritual.heatKettleTo(90)

  const { ritual: returned } = ritual.leaveAndReturnAfter(3600, coolingCatalog)

  assert.equal(returned.vessel('kettle').liquid.temperatureC.toFixed(1), '20.0')
})

test('kettle_leftOnTheWorkingHeaterForAnHour_boilsDry', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  const { ritual: returned } = ritual.leaveAndReturnAfter(3600)

  assert.equal(returned.vessel('kettle').liquid.volumeMl, 0)
})

test('leavesInTheKettle_whenTheKeeperIsAwayTenMinutes_steepTenMinutesLonger', () => {
  const ritual = TestRitual.begun()
  ritual.heatKettleTo(80)
  ritual.addLeavesToKettle(5)
  const steepedSecondsBefore = ritual.vessel('kettle').leaves?.steepedSeconds ?? 0

  const { ritual: returned } = ritual.leaveAndReturnAfter(600)

  assert.equal(((returned.vessel('kettle').leaves?.steepedSeconds ?? 0) - steepedSecondsBefore).toFixed(0), '600')
})

test('absence_longerThanTwelveHours_livesOnlyTheFirstTwelveHours', () => {
  const ritual = TestRitual.begun()
  const elapsedSecondsBefore = ritual.state.elapsedSeconds

  const { ritual: returned } = ritual.leaveAndReturnAfter(100_000)

  assert.equal(returned.state.elapsedSeconds - elapsedSecondsBefore, 43_200)
})

test('pour_whenTheKeeperLeftInTheMiddleOfIt_stopsOnReturnWithoutPouringWhileAway', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })
  ritual.do({ type: 'adjustPour', tiltDegrees: 45, streamOnTargetFraction: 1, missedStreamLandsAt: null })
  ritual.wait(1)
  const cupMlBefore = ritual.vessel('cup1').liquid.volumeMl

  const { ritual: returned, events } = ritual.leaveAndReturnAfter(60)

  assert.equal(returned.state.pour, null)
  assert.equal(returned.vessel('cup1').liquid.volumeMl, cupMlBefore)
  assert.equal(eventsOfType(events, 'pourFinished').length, 1)
})

test('spoon_whenItCrumbledBeforeTheAbsence_waitsAtItsPlaceAgainAndIsAnnounced', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'spoon' })
  ritual.do({ type: 'placeOnHeater', itemId: 'spoon' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(17)
  ritual.do({ type: 'pickUp', itemId: 'spoon' })

  const { ritual: returned, events } = ritual.leaveAndReturnAfter(0)

  assert.deepEqual(returned.state.spoon, { grams: 0, capacityGrams: 5, charring: 0, location: { kind: 'onSurface', spot: { placeId: 'table', x: 7, y: 0, z: 0 } } })
  assert.deepEqual(eventsOfType(events, 'houseRestocked'), [{ type: 'houseRestocked', spoonReturned: true, caddyWasRefilled: false, caddyWasEmpty: false }])
})

test('caddy_whenWashedCleanBeforeTheAbsence_isFullAndDryAgainAndIsAnnouncedAsEmpty', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'caddy' })
  ritual.do({ type: 'putInTheSink', itemId: 'caddy' })
  ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })
  ritual.wait(60)
  ritual.do({ type: 'turnTheTapOff' })

  const { ritual: returned, events } = ritual.leaveAndReturnAfter(0)

  assert.equal(returned.vessel('caddy').leaves?.grams, 50)
  assert.equal(returned.vessel('caddy').liquid.volumeMl, 0)
  assert.deepEqual(eventsOfType(events, 'houseRestocked'), [{ type: 'houseRestocked', spoonReturned: false, caddyWasRefilled: true, caddyWasEmpty: true }])
})

test('caddy_holdingTeaBrewedInIt_isPouredOutAndRefilledWhereItStands', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })
  ritual.pour('kettle', 'caddy', 5)
  const caddyLocationBefore = ritual.vessel('caddy').location

  const { ritual: returned, events } = ritual.leaveAndReturnAfter(0)

  assert.deepEqual(returned.vessel('caddy').location, caddyLocationBefore)
  assert.equal(returned.vessel('caddy').liquid.volumeMl, 0)
  assert.deepEqual(returned.vessel('caddy').leaves, { teaId: 'testGreen', grams: 50, isSteeping: false, isStirredByTheBoil: false, steepedSeconds: 0 })
  assert.deepEqual(eventsOfType(events, 'houseRestocked'), [{ type: 'houseRestocked', spoonReturned: false, caddyWasRefilled: true, caddyWasEmpty: false }])
})

test('return_withTheSpoonHereAndTheCaddyFullAndDry_restocksNothing', () => {
  const ritual = TestRitual.begun()

  const { events } = ritual.leaveAndReturnAfter(60)

  assert.deepEqual(eventsOfType(events, 'houseRestocked'), [])
})

test('timeOfDay_onReturn_movesOnToTheNextTimeOfDayTheRoomOffers', () => {
  const ritual = TestRitual.begun()

  const { ritual: returned } = ritual.leaveAndReturnAfter(60, testCatalog(), 0.25)

  assert.deepEqual(returned.state.atmosphere, { timeOfDay: 'night', shareThroughTheTimeOfDay: 0.25, weather: 'rain' })
})

test('timeOfDay_onReturnAtTheLastTimeOfDayTheRoomOffers_startsTheDayAgainAtDawn', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'chooseAtmosphere', timeOfDay: 'night', shareThroughTheTimeOfDay: 0.5, weather: 'rain' })

  const { ritual: returned, events } = ritual.leaveAndReturnAfter(60)

  assert.equal(returned.state.atmosphere.timeOfDay, 'dawn')
  assert.deepEqual(eventsOfType(events, 'atmosphereChanged'), [{ type: 'atmosphereChanged', atmosphere: { timeOfDay: 'dawn', shareThroughTheTimeOfDay: 0.5, weather: 'rain' } }])
})
