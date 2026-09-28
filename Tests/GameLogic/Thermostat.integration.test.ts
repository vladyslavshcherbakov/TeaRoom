import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestTeaSession } from '../Support/TestTeaSession.ts'
import { isHeating, isTheThermostatWorking } from '../../Shared/GameLogic/Judgement/HeaterModes.ts'

const kettleCoolingPerSecond = 0.01

test('thermostat_ofANewHeater_isSetToAHundredDegreesAndNotWorking', () => {
  const session = new TestTeaSession()

  assert.deepEqual({ targetC: session.state.heater.thermostatTargetC, isWorking: isTheThermostatWorking(session.state.heater.mode) }, { targetC: 100, isWorking: false })
})

test('thermostat_whenSetToSixtyDegrees_saysSo', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'setTheThermostat', targetC: 60 })

  assert.deepEqual(eventsOfType(events, 'thermostatSet'), [{ type: 'thermostatSet', targetC: 60 }])
  assert.equal(session.state.heater.thermostatTargetC, 60)
})

test('thermostat_whenSetBelowFortyDegrees_isRefused', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'setTheThermostat', targetC: 39 })

  assert.equal(eventsOfType(events, 'actionRefused')[0]?.reason, 'thermostatOutOfRange')
  assert.equal(session.state.heater.thermostatTargetC, 100)
})

test('thermostat_whenSetAboveAHundredDegrees_isRefused', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'setTheThermostat', targetC: 101 })

  assert.equal(eventsOfType(events, 'actionRefused')[0]?.reason, 'thermostatOutOfRange')
})

test('thermostat_startedUnderColdWater_heatsItToTheTargetAndStops', () => {
  const session = kettleOnTheHeaterWithTheThermostatAt(60)

  session.wait(20)

  assertNear(session.vessel('kettle').liquid.temperatureC, 60, 0.2)
  assert.equal(isHeating(session.state.heater.mode), false)
  assert.equal(isTheThermostatWorking(session.state.heater.mode), true)
})

test('thermostat_whileTheWaterIsLessThanTwoDegreesBelowTheTarget_keepsThePlateCold', () => {
  const session = kettleOnTheHeaterWithTheThermostatAt(60, testCatalog({ kettle: kettleCoolingPerSecond }))
  session.waitUntil(() => !isHeating(session.state.heater.mode))

  session.waitUntil(() => session.vessel('kettle').liquid.temperatureC < 58.5)

  assert.equal(isHeating(session.state.heater.mode), false)
})

test('thermostat_onceTheWaterIsTwoDegreesBelowTheTarget_heatsAgain', () => {
  const session = kettleOnTheHeaterWithTheThermostatAt(60, testCatalog({ kettle: kettleCoolingPerSecond }))
  session.waitUntil(() => !isHeating(session.state.heater.mode))

  session.waitUntil(() => session.vessel('kettle').liquid.temperatureC <= 58)
  session.wait(0.05)

  assert.equal(isHeating(session.state.heater.mode), true)
})

test('thermostat_workingForTenMinutes_keepsTheWaterWithinTwoDegreesBelowTheTarget', () => {
  const session = kettleOnTheHeaterWithTheThermostatAt(60, testCatalog({ kettle: kettleCoolingPerSecond }))
  session.wait(20)

  const temperaturesC = everySecondFor(session, 600, () => session.vessel('kettle').liquid.temperatureC)

  assert.ok(Math.min(...temperaturesC) >= 57.9, `the water fell to ${Math.min(...temperaturesC)} °C`)
  assert.ok(Math.max(...temperaturesC) <= 60.3, `the water rose to ${Math.max(...temperaturesC)} °C`)
})

test('thermostat_withNothingOnTheHeater_keepsThePlateColdAndWastesNothing', () => {
  const session = new TestTeaSession()
  session.do({ type: 'startTheThermostat' })

  session.wait(60)
  const events = session.do({ type: 'stopTheThermostat' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assert.equal(switchedOff?.wastedSeconds, 0)
  assert.equal(switchedOff?.kilowattHoursUsed, 0)
})

test('thermostat_withAnEmptyThermosOnTheHeater_keepsThePlateCold', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'thermos' })
  session.do({ type: 'startTheThermostat' })

  session.wait(10)

  assert.equal(isHeating(session.state.heater.mode), false)
})

test('thermostat_startedWhileTheHeaterBoilsByHand_stopsAtTheTarget', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  session.do({ type: 'switchHeaterOn' })
  session.do({ type: 'setTheThermostat', targetC: 60 })

  session.do({ type: 'startTheThermostat' })
  session.wait(20)

  assertNear(session.vessel('kettle').liquid.temperatureC, 60, 0.2)
  assert.equal(isHeating(session.state.heater.mode), false)
})

test('heaterSwitch_turnedOffWhileTheThermostatWaits_switchesTheHeaterAndTheThermostatOff', () => {
  const session = kettleOnTheHeaterWithTheThermostatAt(60)
  session.wait(20)

  session.do({ type: 'switchHeaterOff' })

  assert.equal(isHeating(session.state.heater.mode), false)
  assert.equal(isTheThermostatWorking(session.state.heater.mode), false)
})

test('heaterSwitch_switchedOnWhileTheThermostatWaits_isRefusedAndLeavesTheThermostatWorking', () => {
  const session = kettleOnTheHeaterWithTheThermostatAt(60)
  session.wait(20)

  const events = session.do({ type: 'switchHeaterOn' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'switchHeaterOn', reason: 'heaterAlreadyOn' }])
  assert.deepEqual({ targetC: session.state.heater.thermostatTargetC, isWorking: isTheThermostatWorking(session.state.heater.mode) }, { targetC: 60, isWorking: true })
})

test('heaterSwitch_turnedOffWhileTheThermostatHeats_switchesTheHeaterAndTheThermostatOff', () => {
  const session = kettleOnTheHeaterWithTheThermostatAt(60)
  session.wait(5)

  session.do({ type: 'switchHeaterOff' })

  assert.equal(isHeating(session.state.heater.mode), false)
  assert.equal(isTheThermostatWorking(session.state.heater.mode), false)
})

test('thermostat_whenStopped_switchesTheHeaterOff', () => {
  const session = kettleOnTheHeaterWithTheThermostatAt(80)
  session.wait(30)

  const events = session.do({ type: 'stopTheThermostat' })

  assert.equal(eventsOfType(events, 'heaterSwitchedOff').length, 1)
  assert.equal(isTheThermostatWorking(session.state.heater.mode), false)
})

test('thermostat_whenStartedTwice_isRefused', () => {
  const session = kettleOnTheHeaterWithTheThermostatAt(60)

  const events = session.do({ type: 'startTheThermostat' })

  assert.equal(eventsOfType(events, 'actionRefused')[0]?.reason, 'thermostatAlreadyOn')
})

test('thermostat_whenStoppedWhileNotWorking_isRefused', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'stopTheThermostat' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'stopTheThermostat', reason: 'thermostatAlreadyOff' }])
})

test('heaterSwitch_askedToHoldSixtyDegrees_keepsTheWaterAtSixtyWhileItStaysOn', () => {
  const session = new TestTeaSession(testCatalog({ kettle: kettleCoolingPerSecond }))
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  session.do({ type: 'setTheThermostat', targetC: 60 })
  session.do({ type: 'switchHeaterOn', holdsTheThermostatsTarget: true })

  const events = session.wait(120)

  assertNear(session.vessel('kettle').liquid.temperatureC, 60, 0.05)
  assert.equal(isHeating(session.state.heater.mode), true)
  assert.deepEqual(eventsOfType(events, 'heaterSwitchedOff'), [])
})

test('heaterSwitch_notAskedToHoldTheTarget_boilsPastIt', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  session.do({ type: 'setTheThermostat', targetC: 60 })
  session.do({ type: 'switchHeaterOn' })

  session.wait(30)

  assert.equal(session.vessel('kettle').liquid.temperatureC, 100)
})

test('heater_switchedOffAfterTheThermostatHeatedTenSecondsInAMinute_countsTheEnergyOfTheTenSeconds', () => {
  const session = kettleOnTheHeaterWithTheThermostatAt(60)
  session.wait(60)

  const events = session.do({ type: 'stopTheThermostat' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assertNear(switchedOff?.onSeconds ?? 0, 60)
  assertNear(switchedOff?.kilowattHoursUsed ?? 0, 0.00833, 0.0002)
})

test('thermostat_whileThePlayerIsAwayAnHour_keepsTheWaterNearTheTarget', () => {
  const session = kettleOnTheHeaterWithTheThermostatAt(60, testCatalog({ kettle: kettleCoolingPerSecond }))
  session.wait(20)

  const returned = session.leaveAndReturnAfter(3600).session

  assertNear(returned.vessel('kettle').liquid.temperatureC, 59, 1.2)
  assert.equal(isTheThermostatWorking(returned.state.heater.mode), true)
})

function kettleOnTheHeaterWithTheThermostatAt(targetC: number, catalog = testCatalog()): TestTeaSession {
  const session = new TestTeaSession(catalog)
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  session.do({ type: 'setTheThermostat', targetC })
  session.do({ type: 'startTheThermostat' })
  return session
}

function everySecondFor(session: TestTeaSession, seconds: number, read: () => number): number[] {
  return Array.from({ length: seconds }, () => {
    session.wait(1)
    return read()
  })
}
