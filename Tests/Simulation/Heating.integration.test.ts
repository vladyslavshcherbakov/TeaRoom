import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

function ritualWithKettleOnWorkingHeater(ritual = TestRitual.begun()): TestRitual {
  ritual.do({ type: 'placeOnHeater', vesselId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })
  return ritual
}

test('kettleWater_whenHeatedForTenSeconds_warmsByFortyDegrees', () => {
  const ritual = ritualWithKettleOnWorkingHeater()

  ritual.wait(10)

  assertNear(ritual.vessel('kettle').liquid.temperatureC, 60)
})

test('kettleWater_whenLeftOnTheHeater_stopsAtBoiling', () => {
  const ritual = ritualWithKettleOnWorkingHeater()

  ritual.wait(60)

  assert.equal(ritual.vessel('kettle').liquid.temperatureC, 100)
})

test('heater_whenSwitchedOffInsideTheGoodRange_judgesTheWaterIdeal', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(14)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assert.deepEqual(events, [{ type: 'heaterSwitchedOff', waterJudgement: 'ideal' }])
})

test('heater_whenSwitchedOffPastTheAcceptableRange_judgesTheWaterTooHot', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(20)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assert.deepEqual(events, [{ type: 'heaterSwitchedOff', waterJudgement: 'tooHot' }])
})

test('heater_whenSwitchedOffEarly_judgesTheWaterTooCool', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(5)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assert.deepEqual(events, [{ type: 'heaterSwitchedOff', waterJudgement: 'tooCool' }])
})

test('heater_whenSwitchedOffBetweenTheGoodAndAcceptableRanges_judgesTheWaterSlightlyHot', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(17)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assert.deepEqual(events, [{ type: 'heaterSwitchedOff', waterJudgement: 'slightlyHot' }])
})

test('kettle_whenLiftedOffAWorkingHeater_isJudgedAndStopsWarming', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(14)

  const events = ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.wait(10)

  assert.deepEqual(eventsOfType(events, 'takenOffHeater'), [{ type: 'takenOffHeater', vesselId: 'kettle', waterJudgement: 'ideal' }])
  assertNear(ritual.vessel('kettle').liquid.temperatureC, 76)
})

test('heating_whenTheWaterEntersTheGoodRange_announcesTheTargetOnce', () => {
  const ritual = ritualWithKettleOnWorkingHeater()

  const eventsBeforeTheRange = ritual.wait(13)
  const eventsAfterwards = ritual.wait(12)

  assert.equal(eventsOfType(eventsBeforeTheRange, 'targetTemperatureReached').length, 0)
  assert.deepEqual(eventsOfType(eventsAfterwards, 'targetTemperatureReached'), [
    { type: 'targetTemperatureReached', vesselId: 'kettle' },
  ])
})

test('kettleWater_whenOffTheHeater_coolsButStaysAboveTheRoom', () => {
  const ritual = TestRitual.begun(testCatalog({ kettle: 0.01 }))
  ritual.heatKettleTo(80)
  const temperatureWhenLiftedC = ritual.vessel('kettle').liquid.temperatureC

  ritual.wait(60)

  const temperatureAfterAMinuteC = ritual.vessel('kettle').liquid.temperatureC
  assert.ok(temperatureAfterAMinuteC < temperatureWhenLiftedC - 10, `kettle is still at ${temperatureAfterAMinuteC} °C`)
  assert.ok(temperatureAfterAMinuteC > 20, `kettle fell to ${temperatureAfterAMinuteC} °C, below the room`)
})

test('cup_whenPlacedOnTheHeater_isRefused', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'placeOnHeater', vesselId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'placeOnHeater', reason: 'cannotSitOnHeater' }])
})

test('simulation_whenPlayedAt30And60FramesPerSecond_endsInTheSameState', () => {
  const catalog = testCatalog({ kettle: 0.01, cup: 0.02 })
  const at30 = ritualWithKettleOnWorkingHeater(TestRitual.begun(catalog))
  const at60 = ritualWithKettleOnWorkingHeater(TestRitual.begun(catalog))

  for (const [ritual, framesPerSecond] of [[at30, 30], [at60, 60]] as const) {
    for (let frame = 0; frame < 12 * framesPerSecond; frame += 1) ritual.wait(1 / framesPerSecond)
    ritual.do({ type: 'pickUp', itemId: 'kettle' })
    ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })
    ritual.do({ type: 'adjustPour', tiltDegrees: 30, streamOnTargetFraction: 0.9 })
    for (let frame = 0; frame < 6 * framesPerSecond; frame += 1) ritual.wait(1 / framesPerSecond)
  }

  assert.deepEqual(at30.state, at60.state)
})

test('kettleWater_whenCoolingWhileOnAWorkingHeater_stillReachesBoiling', () => {
  const ritual = ritualWithKettleOnWorkingHeater(TestRitual.begun(testCatalog({ kettle: 0.01 })))

  ritual.wait(120)

  assert.equal(ritual.vessel('kettle').liquid.temperatureC, 100)
})

test('water_boilingOnAWorkingHeater_boilsAwayAtTheHeatersRate', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', vesselId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(200)
  const volumeAtTheBoil = ritual.vessel('kettle').liquid.volumeMl

  ritual.wait(100)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, volumeAtTheBoil - 100)
})

test('water_liftedOffTheHeaterAtTheBoil_stopsBoilingAway', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(200)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  const volumeWhenLifted = ritual.vessel('kettle').liquid.volumeMl

  ritual.wait(100)

  assert.equal(ritual.vessel('kettle').liquid.volumeMl, volumeWhenLifted)
})

test('water_belowTheBoil_doesNotBoilAway', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', vesselId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(10)

  assert.equal(ritual.vessel('kettle').liquid.volumeMl, 500)
})
