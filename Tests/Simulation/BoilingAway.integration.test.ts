import assert from 'node:assert/strict'
import test from 'node:test'
import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'
import { assertNear } from '../Support/Assertions.ts'
import { catalogWithHeaterChanges } from '../Support/TestCatalog.ts'
import { eventsOfType, ritualWithTheKettleOnTheWorkingHeater, TestRitual } from '../Support/TestRitual.ts'

const secondsTheFastBoilTakesToBoilTheKettleDryAndMore = 30

test('water_boilingOnAWorkingHeater_boilsAwayAtTheHeatersRate', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater()
  ritual.waitUntil(() => ritual.vessel('kettle').liquid.temperatureC === 100)
  const volumeAtTheBoil = ritual.vessel('kettle').liquid.volumeMl

  ritual.wait(10)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, volumeAtTheBoil - 10)
})

test('water_liftedOffTheHeaterAtTheBoil_stopsBoilingAway', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater()
  ritual.waitUntil(() => ritual.vessel('kettle').liquid.temperatureC === 100)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  const volumeWhenLifted = ritual.vessel('kettle').liquid.volumeMl

  ritual.wait(10)

  assert.equal(ritual.vessel('kettle').liquid.volumeMl, volumeWhenLifted)
})

test('water_belowTheBoil_doesNotBoilAway', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(10)

  assert.equal(ritual.vessel('kettle').liquid.volumeMl, 500)
})

test('kettle_leftOnAWorkingHeaterUntilItsWaterIsGone_announcesOnceThatItBoiledDry', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater(new TestRitual(catalogWithAFastBoil()))

  const events = ritual.wait(secondsTheFastBoilTakesToBoilTheKettleDryAndMore)

  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: false }])
})

test('kettle_boilingAwayInStepsThatDoNotDivideItsWaterEvenly_stillBoilsDryAndSaysSo', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater(new TestRitual(catalogWithHeaterChanges({ boilingAwayMlPerSecond: 8 })))

  const events = ritual.waitFor('boiledDry')

  assert.equal(ritual.vessel('kettle').liquid.volumeMl, 0)
  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: false }])
})

test('kettle_filledToTheBrimAndLeftToBoilDry_saysAllItsWaterBoiledAway', () => {
  const ritual = new TestRitual(catalogWithAFastBoil())
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })
  ritual.fillInTheSink('kettle', 10)
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  const events = ritual.waitFor('boiledDry')

  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: true }])
})

test('kettle_filledToTheBrimThenPouredFromAndLeftToBoilDry_saysSomeWaterWasTaken', () => {
  const ritual = new TestRitual(catalogWithAFastBoil())
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })
  ritual.fillInTheSink('kettle', 10)
  ritual.pour('kettle', 'cup1', 1)
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  const events = ritual.waitFor('boiledDry')

  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: false }])
})

function catalogWithAFastBoil(): Catalog {
  return catalogWithHeaterChanges({ degreesPerSecondPerLitre: 20, boilingAwayMlPerSecond: 100 })
}
