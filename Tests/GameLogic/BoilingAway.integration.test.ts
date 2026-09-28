import assert from 'node:assert/strict'
import test from 'node:test'
import type { Catalog } from '../../Shared/GameLogic/Definitions/Catalog.ts'
import { assertNear } from '../Support/Assertions.ts'
import { catalogWithHeaterChanges } from '../Support/TestCatalog.ts'
import { eventsOfType, sessionWithTheKettleOnTheWorkingHeater, TestTeaSession } from '../Support/TestTeaSession.ts'

const secondsTheFastBoilTakesToBoilTheKettleDryAndMore = 30

test('water_boilingOnAWorkingHeater_boilsAwayAtTheHeatersRate', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater()
  session.waitUntil(() => session.vessel('kettle').liquid.temperatureC === 100)
  const volumeAtTheBoil = session.vessel('kettle').liquid.volumeMl

  session.wait(10)

  assertNear(session.vessel('kettle').liquid.volumeMl, volumeAtTheBoil - 10)
})

test('water_liftedOffTheHeaterAtTheBoil_stopsBoilingAway', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater()
  session.waitUntil(() => session.vessel('kettle').liquid.temperatureC === 100)
  session.do({ type: 'pickUp', itemId: 'kettle' })
  const volumeWhenLifted = session.vessel('kettle').liquid.volumeMl

  session.wait(10)

  assert.equal(session.vessel('kettle').liquid.volumeMl, volumeWhenLifted)
})

test('water_belowTheBoil_doesNotBoilAway', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  session.do({ type: 'switchHeaterOn' })

  session.wait(10)

  assert.equal(session.vessel('kettle').liquid.volumeMl, 500)
})

test('kettle_leftOnAWorkingHeaterUntilItsWaterIsGone_announcesOnceThatItBoiledDry', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater(new TestTeaSession(catalogWithAFastBoil()))

  const events = session.wait(secondsTheFastBoilTakesToBoilTheKettleDryAndMore)

  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: false }])
})

test('kettle_boilingAwayInStepsThatDoNotDivideItsWaterEvenly_stillBoilsDryAndSaysSo', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater(new TestTeaSession(catalogWithHeaterChanges({ boilingAwayMlPerSecond: 8 })))

  const events = session.waitFor('boiledDry')

  assert.equal(session.vessel('kettle').liquid.volumeMl, 0)
  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: false }])
})

test('kettle_filledToTheBrimAndLeftToBoilDry_saysAllItsWaterBoiledAway', () => {
  const session = new TestTeaSession(catalogWithAFastBoil())
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })
  session.fillInTheSink('kettle', 10)
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  session.do({ type: 'switchHeaterOn' })

  const events = session.waitFor('boiledDry')

  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: true }])
})

test('kettle_filledToTheBrimThenPouredFromAndLeftToBoilDry_saysSomeWaterWasTaken', () => {
  const session = new TestTeaSession(catalogWithAFastBoil())
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })
  session.fillInTheSink('kettle', 10)
  session.pour('kettle', 'cup1', 1)
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  session.do({ type: 'switchHeaterOn' })

  const events = session.waitFor('boiledDry')

  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: false }])
})

test('kettle_refilledToTheBrimAfterBoilingDry_saysAllItsWaterBoiledAwayTheNextTime', () => {
  const session = new TestTeaSession(catalogWithAFastBoil())
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  session.pour('kettle', 'cup1', 1)
  session.putOnTheWorkingHeater('kettle')
  session.waitFor('boiledDry')
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  session.doWithoutARefusal({ type: 'openVesselLid', vesselId: 'kettle' })
  session.fillInTheSink('kettle', 20)
  session.doWithoutARefusal({ type: 'placeOnHeater', itemId: 'kettle' })

  const events = session.waitFor('boiledDry')

  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: true }])
})

test('heater_underAKettleThatBoiledDry_wastesNothing', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater(new TestTeaSession(catalogWithAFastBoil()))
  session.waitFor('boiledDry')
  session.wait(10)

  const events = session.do({ type: 'switchHeaterOff' })

  assert.equal(eventsOfType(events, 'heaterSwitchedOff')[0]?.wastedSeconds, 0)
})

function catalogWithAFastBoil(): Catalog {
  return catalogWithHeaterChanges({ degreesPerSecondPerLitre: 20, boilingAwayMlPerSecond: 100 })
}
