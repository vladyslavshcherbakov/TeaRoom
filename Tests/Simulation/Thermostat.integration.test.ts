import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

const kettleCoolingPerSecond = 0.01

test('thermostat_ofANewHeater_isSetToAHundredDegreesAndNotWorking', () => {
  const ritual = TestRitual.begun()

  assert.deepEqual(ritual.state.heater.thermostat, { targetC: 100, isOn: false })
})

test('thermostat_whenSetToSixtyDegrees_saysSo', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'setTheThermostat', targetC: 60 })

  assert.deepEqual(eventsOfType(events, 'thermostatSet'), [{ type: 'thermostatSet', targetC: 60 }])
  assert.equal(ritual.state.heater.thermostat.targetC, 60)
})

test('thermostat_whenSetBelowFortyDegrees_isRefused', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'setTheThermostat', targetC: 39 })

  assert.equal(eventsOfType(events, 'actionRefused')[0]?.reason, 'thermostatOutOfRange')
  assert.equal(ritual.state.heater.thermostat.targetC, 100)
})

test('thermostat_whenSetAboveAHundredDegrees_isRefused', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'setTheThermostat', targetC: 101 })

  assert.equal(eventsOfType(events, 'actionRefused')[0]?.reason, 'thermostatOutOfRange')
})

test('thermostat_startedUnderColdWater_heatsItToTheTargetAndStops', () => {
  const ritual = kettleOnTheHeaterWithTheThermostatAt(60)

  ritual.wait(20)

  assertNear(ritual.vessel('kettle').liquid.temperatureC, 60, 0.2)
  assert.equal(ritual.state.heater.isOn, false)
  assert.equal(ritual.state.heater.thermostat.isOn, true)
})

test('thermostat_whileTheWaterIsLessThanTwoDegreesBelowTheTarget_keepsThePlateCold', () => {
  const ritual = kettleOnTheHeaterWithTheThermostatAt(60, testCatalog({ kettle: kettleCoolingPerSecond }))
  waitUntil(ritual, () => !ritual.state.heater.isOn)

  waitUntil(ritual, () => ritual.vessel('kettle').liquid.temperatureC < 58.5)

  assert.equal(ritual.state.heater.isOn, false)
})

test('thermostat_onceTheWaterIsTwoDegreesBelowTheTarget_heatsAgain', () => {
  const ritual = kettleOnTheHeaterWithTheThermostatAt(60, testCatalog({ kettle: kettleCoolingPerSecond }))
  waitUntil(ritual, () => !ritual.state.heater.isOn)

  waitUntil(ritual, () => ritual.vessel('kettle').liquid.temperatureC <= 58)
  ritual.wait(0.05)

  assert.equal(ritual.state.heater.isOn, true)
})

test('thermostat_workingForTenMinutes_keepsTheWaterWithinTwoDegreesBelowTheTarget', () => {
  const ritual = kettleOnTheHeaterWithTheThermostatAt(60, testCatalog({ kettle: kettleCoolingPerSecond }))
  ritual.wait(20)

  const temperaturesC = everySecondFor(ritual, 600, () => ritual.vessel('kettle').liquid.temperatureC)

  assert.ok(Math.min(...temperaturesC) >= 57.9, `the water fell to ${Math.min(...temperaturesC)} °C`)
  assert.ok(Math.max(...temperaturesC) <= 60.3, `the water rose to ${Math.max(...temperaturesC)} °C`)
})

test('thermostat_withNothingOnTheHeater_keepsThePlateColdAndWastesNothing', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'startTheThermostat' })

  ritual.wait(60)
  const events = ritual.do({ type: 'stopTheThermostat' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assert.equal(switchedOff?.wastedSeconds, 0)
  assert.equal(switchedOff?.kilowattHoursUsed, 0)
})

test('thermostat_withAnEmptyThermosOnTheHeater_keepsThePlateCold', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'startTheThermostat' })

  ritual.wait(10)

  assert.equal(ritual.state.heater.isOn, false)
})

test('thermostat_startedWhileTheHeaterBoilsByHand_stopsAtTheTarget', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.do({ type: 'setTheThermostat', targetC: 60 })

  ritual.do({ type: 'startTheThermostat' })
  ritual.wait(20)

  assertNear(ritual.vessel('kettle').liquid.temperatureC, 60, 0.2)
  assert.equal(ritual.state.heater.isOn, false)
})

test('heaterSwitch_turnedOffWhileTheThermostatWaits_switchesTheHeaterAndTheThermostatOff', () => {
  const ritual = kettleOnTheHeaterWithTheThermostatAt(60)
  ritual.wait(20)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assert.equal(eventsOfType(events, 'heaterSwitchedOff')[0]?.wasSwitchedOffByTheKeeper, true)
  assert.equal(ritual.state.heater.isOn, false)
  assert.equal(ritual.state.heater.thermostat.isOn, false)
})

test('heaterSwitch_switchedOnWhileTheThermostatWaits_isRefusedAndLeavesTheThermostatWorking', () => {
  const ritual = kettleOnTheHeaterWithTheThermostatAt(60)
  ritual.wait(20)

  const events = ritual.do({ type: 'switchHeaterOn' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'switchHeaterOn', reason: 'heaterAlreadyOn' }])
  assert.deepEqual(ritual.state.heater.thermostat, { targetC: 60, isOn: true })
})

test('heaterSwitch_turnedOffWhileTheThermostatHeats_switchesTheHeaterAndTheThermostatOff', () => {
  const ritual = kettleOnTheHeaterWithTheThermostatAt(60)
  ritual.wait(5)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assert.equal(eventsOfType(events, 'heaterSwitchedOff')[0]?.wasSwitchedOffByTheKeeper, true)
  assert.equal(ritual.state.heater.isOn, false)
  assert.equal(ritual.state.heater.thermostat.isOn, false)
})

test('thermostat_whenStopped_switchesTheHeaterOffAndJudgesTheWater', () => {
  const ritual = kettleOnTheHeaterWithTheThermostatAt(80)
  ritual.wait(30)

  const events = ritual.do({ type: 'stopTheThermostat' })

  assert.equal(eventsOfType(events, 'heaterSwitchedOff')[0]?.waterJudgement, 'ideal')
  assert.equal(ritual.state.heater.thermostat.isOn, false)
})

test('thermostat_whenStartedTwice_isRefused', () => {
  const ritual = kettleOnTheHeaterWithTheThermostatAt(60)

  const events = ritual.do({ type: 'startTheThermostat' })

  assert.equal(eventsOfType(events, 'actionRefused')[0]?.reason, 'thermostatAlreadyOn')
})

test('heaterSwitch_askedToHoldSixtyDegrees_keepsTheWaterAtSixtyWhileItStaysOn', () => {
  const ritual = TestRitual.begun(testCatalog({ kettle: kettleCoolingPerSecond }))
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'setTheThermostat', targetC: 60 })
  ritual.do({ type: 'switchHeaterOn', holdsTheThermostatsTarget: true })

  const events = ritual.wait(120)

  assertNear(ritual.vessel('kettle').liquid.temperatureC, 60, 0.05)
  assert.equal(ritual.state.heater.isOn, true)
  assert.deepEqual(eventsOfType(events, 'heaterSwitchedOff'), [])
})

test('heaterSwitch_notAskedToHoldTheTarget_boilsPastIt', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'setTheThermostat', targetC: 60 })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(30)

  assert.equal(ritual.vessel('kettle').liquid.temperatureC, 100)
})

test('heater_switchedOffAfterTheThermostatHeatedTenSecondsInAMinute_countsTheEnergyOfTheTenSeconds', () => {
  const ritual = kettleOnTheHeaterWithTheThermostatAt(60)
  ritual.wait(60)

  const events = ritual.do({ type: 'stopTheThermostat' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assertNear(switchedOff?.onSeconds ?? 0, 60)
  assertNear(switchedOff?.kilowattHoursUsed ?? 0, 0.00833, 0.0002)
})

test('ritual_finishedWhileTheThermostatWaits_switchesTheHeaterOff', () => {
  const ritual = kettleOnTheHeaterWithTheThermostatAt(60)
  ritual.wait(20)

  const events = ritual.do({ type: 'finishRitual' })

  assert.equal(eventsOfType(events, 'heaterSwitchedOff')[0]?.wasSwitchedOffByTheKeeper, false)
  assert.equal(ritual.state.heater.thermostat.isOn, false)
})

test('thermostat_whileTheKeeperIsAwayAnHour_keepsTheWaterNearTheTarget', () => {
  const catalog = testCatalog({ kettle: kettleCoolingPerSecond })
  const ritual = kettleOnTheHeaterWithTheThermostatAt(60, catalog)
  ritual.wait(20)

  const returned = ritual.leaveAndReturnAfter(3600, catalog).ritual

  assertNear(returned.vessel('kettle').liquid.temperatureC, 59, 1.2)
  assert.equal(returned.state.heater.thermostat.isOn, true)
})

function kettleOnTheHeaterWithTheThermostatAt(targetC: number, catalog = testCatalog()): TestRitual {
  const ritual = TestRitual.begun(catalog)
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'setTheThermostat', targetC })
  ritual.do({ type: 'startTheThermostat' })
  return ritual
}

function waitUntil(ritual: TestRitual, isDone: () => boolean): void {
  for (let step = 0; step < 20_000 && !isDone(); step += 1) ritual.wait(0.05)
  assert.ok(isDone(), 'the condition was never met')
}

function everySecondFor(ritual: TestRitual, seconds: number, read: () => number): number[] {
  return Array.from({ length: seconds }, () => {
    ritual.wait(1)
    return read()
  })
}
