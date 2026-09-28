import assert from 'node:assert/strict'
import test from 'node:test'
import { testCatalog, withMoreCaddies } from '../Support/TestCatalog.ts'
import { eventsOfType, TestTeaSession } from '../Support/TestTeaSession.ts'

test('kettle_whenThePlayerIsAwayAnHour_coolsToTheRoom', () => {
  const session = new TestTeaSession(testCatalog({ kettle: 0.01 }))
  session.heatKettleTo(90)

  const { session: returned } = session.leaveAndReturnAfter(3600)

  assert.equal(returned.vessel('kettle').liquid.temperatureC.toFixed(1), '20.0')
})

test('kettle_leftOnTheWorkingHeaterForAnHour_boilsDry', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  session.do({ type: 'switchHeaterOn' })

  const { session: returned } = session.leaveAndReturnAfter(3600)

  assert.equal(returned.vessel('kettle').liquid.volumeMl, 0)
})

test('leavesInTheKettle_whenThePlayerIsAwayTenMinutes_steepTenMinutesLonger', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  session.addLeavesToKettle(5)
  const steepedSecondsBefore = session.vessel('kettle').leaves?.steepedSecondsByTeaId['testGreen'] ?? 0

  const { session: returned } = session.leaveAndReturnAfter(600)

  assert.equal(((returned.vessel('kettle').leaves?.steepedSecondsByTeaId['testGreen'] ?? 0) - steepedSecondsBefore).toFixed(0), '600')
})

test('tap_leftRunningOverTheOpenKettle_fillsItToTheBrimWhileThePlayerIsAwayAndRunsOn', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })
  session.do({ type: 'putInTheSink', itemId: 'kettle' })
  session.do({ type: 'turnTheTapOn' })

  const { session: returned } = session.leaveAndReturnAfter(60)

  assert.equal(returned.vessel('kettle').liquid.volumeMl, 1000)
  assert.notEqual(returned.state.sink.runningWater, null)
})

test('absence_longerThanTwelveHours_livesOnlyTheFirstTwelveHours', () => {
  const session = new TestTeaSession()
  const elapsedSecondsBefore = session.state.elapsedSeconds

  const { session: returned } = session.leaveAndReturnAfter(100_000)

  assert.equal(returned.state.elapsedSeconds - elapsedSecondsBefore, 43_200)
})

test('pour_whenThePlayerLeftInTheMiddleOfIt_stopsOnReturnWithoutPouringWhileAway', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })
  session.do({ type: 'adjustPour', tiltDegrees: 45, streamOnTargetFraction: 1, missedStreamLandsAt: null })
  session.wait(1)
  const cupMlBefore = session.vessel('cup1').liquid.volumeMl

  const { session: returned, events } = session.leaveAndReturnAfter(60)

  assert.equal(returned.state.pour, null)
  assert.equal(returned.vessel('cup1').liquid.volumeMl, cupMlBefore)
  assert.equal(eventsOfType(events, 'pourFinished').length, 1)
})

test('spoon_whenItCrumbledBeforeTheAbsence_waitsAtItsPlaceAgainAndIsAnnounced', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'spoon' })
  session.do({ type: 'placeOnHeater', itemId: 'spoon' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(17)
  session.do({ type: 'pickUp', itemId: 'spoon' })

  const { session: returned, events } = session.leaveAndReturnAfter(0)

  assert.deepEqual(returned.state.spoon, { gramsByTeaId: {}, capacityGrams: 5, charring: 0, location: { kind: 'onSurface', spot: { placeId: 'table', x: 7, y: 0, z: 0 } } })
  assert.deepEqual(eventsOfType(events, 'houseRestocked'), [{ type: 'houseRestocked', spoonReturned: true, wasACaddyRefilled: false, wasACaddyEmpty: false }])
})

test('caddy_whenWashedCleanBeforeTheAbsence_isFullAndDryAgainAndIsAnnouncedAsEmpty', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'caddy' })
  session.do({ type: 'putInTheSink', itemId: 'caddy' })
  session.do({ type: 'turnTheTapOn' })
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })
  session.wait(60)
  session.do({ type: 'turnTheTapOff' })

  const { session: returned, events } = session.leaveAndReturnAfter(0)

  assert.deepEqual(returned.vessel('caddy').leaves?.gramsByTeaId, { testGreen: 50 })
  assert.equal(returned.vessel('caddy').liquid.volumeMl, 0)
  assert.deepEqual(eventsOfType(events, 'houseRestocked'), [{ type: 'houseRestocked', spoonReturned: false, wasACaddyRefilled: true, wasACaddyEmpty: true }])
})

test('caddy_holdingTeaBrewedInIt_isPouredOutAndRefilledWhereItStands', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })
  session.pour('kettle', 'caddy', 5)
  const caddyLocationBefore = session.vessel('caddy').location

  const { session: returned, events } = session.leaveAndReturnAfter(0)

  assert.deepEqual(returned.vessel('caddy').location, caddyLocationBefore)
  assert.equal(returned.vessel('caddy').liquid.volumeMl, 0)
  assert.deepEqual(returned.vessel('caddy').leaves, { gramsByTeaId: { testGreen: 50 }, isSteeping: false, isStirredByTheBoil: false, steepedSecondsByTeaId: { testGreen: 0 } })
  assert.deepEqual(eventsOfType(events, 'houseRestocked'), [{ type: 'houseRestocked', spoonReturned: false, wasACaddyRefilled: true, wasACaddyEmpty: false }])
})

test('caddies_whenBothWereScoopedFrom_areEachRefilledWithTheirOwnTea', () => {
  const session = new TestTeaSession(withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack' }))
  session.tipASpoonOfLeavesInto('cup1')
  session.do({ type: 'openVesselLid', vesselId: 'blackCaddy' })
  session.do({ type: 'scoopTea', caddyId: 'blackCaddy', depth: 1 })
  session.do({ type: 'tipSpoonInto', vesselId: 'cup2' })

  const { session: returned } = session.leaveAndReturnAfter(0)

  assert.deepEqual(returned.vessel('caddy').leaves, { gramsByTeaId: { testGreen: 50 }, isSteeping: false, isStirredByTheBoil: false, steepedSecondsByTeaId: { testGreen: 0 } })
  assert.deepEqual(returned.vessel('blackCaddy').leaves, { gramsByTeaId: { testBlack: 50 }, isSteeping: false, isStirredByTheBoil: false, steepedSecondsByTeaId: { testBlack: 0 } })
})

test('return_withTheSpoonHereAndTheCaddyFullAndDry_restocksNothing', () => {
  const session = new TestTeaSession()

  const { events } = session.leaveAndReturnAfter(60)

  assert.deepEqual(eventsOfType(events, 'houseRestocked'), [])
})

test('timeOfDay_onReturn_movesOnToTheNextTimeOfDayTheRoomOffers', () => {
  const session = new TestTeaSession()

  const { session: returned } = session.leaveAndReturnAfter(60, 0.25)

  assert.deepEqual(returned.state.atmosphere, { timeOfDay: 'night', shareThroughTheTimeOfDay: 0.25, weather: 'rain' })
})

test('timeOfDay_onReturnAtTheLastTimeOfDayTheRoomOffers_startsTheDayAgainAtDawn', () => {
  const session = new TestTeaSession()
  session.do({ type: 'chooseAtmosphere', timeOfDay: 'night', shareThroughTheTimeOfDay: 0.5, weather: 'rain' })

  const { session: returned, events } = session.leaveAndReturnAfter(60)

  assert.equal(returned.state.atmosphere.timeOfDay, 'dawn')
  assert.deepEqual(eventsOfType(events, 'atmosphereChanged'), [{ type: 'atmosphereChanged', atmosphere: { timeOfDay: 'dawn', shareThroughTheTimeOfDay: 0.5, weather: 'rain' } }])
})
