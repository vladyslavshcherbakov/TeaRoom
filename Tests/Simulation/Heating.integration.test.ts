import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, ritualWithTheKettleOnTheWorkingHeater, TestRitual } from '../Support/TestRitual.ts'

test('heater_whenSwitchedOffAfterHeatingTheKettle_saysHowLongItHeatedIt', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater()
  ritual.wait(10)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assertNear(eventsOfType(events, 'heaterSwitchedOff')[0]?.secondsHeatedByItemId['kettle'] ?? 0, 10)
})

test('heater_whenSwitchedOffAfterTheKettleWasTakenOffAndTheSpoonPutOn_namesBothWithTheirSeconds', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater()
  ritual.wait(10)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'putDown', itemId: 'kettle', spot: { placeId: 'table', x: 2, y: 0, z: 0 } })
  ritual.do({ type: 'placeOnHeater', itemId: 'spoon' })
  ritual.wait(5)

  const events = ritual.do({ type: 'switchHeaterOff' })

  const secondsHeated = eventsOfType(events, 'heaterSwitchedOff')[0]?.secondsHeatedByItemId ?? {}
  assert.deepEqual(Object.keys(secondsHeated).sort(), ['kettle', 'spoon'])
  assertNear(secondsHeated['spoon'] ?? 0, 5)
})

test('heater_whenSwitchedOffEmpty_saysItHeatedNothingAndTheKeeperSwitchedItOff', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(10)

  const events = ritual.do({ type: 'switchHeaterOff' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assert.deepEqual(switchedOff?.secondsHeatedByItemId, {})
})

test('heater_whenSwitchedOffWhileOff_isRefused', () => {
  const ritual = new TestRitual()

  const events = ritual.do({ type: 'switchHeaterOff' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'switchHeaterOff', reason: 'heaterAlreadyOff' }])
})

test('heater_withTheKettleOnIt_refusesTheThermos', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })

  const events = ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'placeOnHeater', reason: 'heaterOccupied' }])
  assert.equal(ritual.state.heater.itemIdOnTop, 'kettle')
})

test('kettleWater_whenHeatedForTenSeconds_warmsByFortyDegrees', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater()

  ritual.wait(10)

  assertNear(ritual.vessel('kettle').liquid.temperatureC, 60)
})

test('kettleWater_withItsLidOpenForTenSecondsOnAWorkingHeater_warmsByTwentyDegrees', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater()
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })

  ritual.wait(10)

  assertNear(ritual.vessel('kettle').liquid.temperatureC, 40)
})

test('kettleWater_whenLeftOnTheHeater_stopsAtBoiling', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater()

  ritual.wait(60)

  assert.equal(ritual.vessel('kettle').liquid.temperatureC, 100)
})

test('heater_whenSwitchedOffAfterTwoMinutes_saysItWasOnThatLongAndUsedATenthOfAKilowattHour', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater()
  ritual.wait(120)

  const events = ritual.do({ type: 'switchHeaterOff' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assertNear(switchedOff?.onSeconds ?? 0, 120)
  assertNear(switchedOff?.kilowattHoursUsed ?? 0, 0.1)
})

test('heater_whenSwitchedOffAfterHeatingOnlyTheKettle_hasWastedNothing', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater()
  ritual.wait(120)

  const events = ritual.do({ type: 'switchHeaterOff' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assert.equal(switchedOff?.wastedSeconds, 0)
  assert.equal(switchedOff?.kilowattHoursWasted, 0)
})

test('heater_whenSwitchedOffAfterTwoMinutesWithNothingOnIt_hasWastedATenthOfAKilowattHour', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(120)

  const events = ritual.do({ type: 'switchHeaterOff' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assertNear(switchedOff?.wastedSeconds ?? 0, 120)
  assertNear(switchedOff?.kilowattHoursWasted ?? 0, 0.1)
})

test('heater_whenSwitchedOffAfterTheKettleAndThenTheThermos_hasWastedOnlyTheThermosSeconds', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater()
  ritual.wait(10)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'putDown', itemId: 'kettle', spot: { placeId: 'table', x: 2, y: 0, z: 0 } })
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.wait(5)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assertNear(eventsOfType(events, 'heaterSwitchedOff')[0]?.wastedSeconds ?? 0, 5)
})

test('heater_whenSwitchedOnAgain_countsItsTimeFromTheNewSwitch', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater()
  ritual.wait(30)
  ritual.do({ type: 'switchHeaterOff' })
  ritual.wait(30)
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(10)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assertNear(eventsOfType(events, 'heaterSwitchedOff')[0]?.onSeconds ?? 0, 10)
})

test('kettle_whenLiftedOffAWorkingHeater_isTakenOff', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater()
  ritual.wait(14)

  const events = ritual.do({ type: 'pickUp', itemId: 'kettle' })

  assert.deepEqual(eventsOfType(events, 'takenOffHeater'), [{ type: 'takenOffHeater', itemId: 'kettle' }])
})

test('kettle_liftedOffAWorkingHeater_stopsWarming', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater()
  ritual.wait(14)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  ritual.wait(10)

  assertNear(ritual.vessel('kettle').liquid.temperatureC, 76)
})

test('kettleWater_whenOffTheHeater_coolsButStaysAboveTheRoom', () => {
  const ritual = new TestRitual(testCatalog({ kettle: 0.01 }))
  ritual.heatKettleTo(80)
  const temperatureWhenLiftedC = ritual.vessel('kettle').liquid.temperatureC

  ritual.wait(60)

  const temperatureAfterAMinuteC = ritual.vessel('kettle').liquid.temperatureC
  assert.ok(temperatureAfterAMinuteC < temperatureWhenLiftedC - 10, `kettle is still at ${temperatureAfterAMinuteC} °C`)
  assert.ok(temperatureAfterAMinuteC > 20, `kettle fell to ${temperatureAfterAMinuteC} °C, below the room`)
})

test('kettleWater_withItsLidOpen_losesTwiceTheHeatItLosesWithItClosed', () => {
  const closed = new TestRitual(testCatalog({ kettle: 0.01 }))
  const open = new TestRitual(testCatalog({ kettle: 0.01 }))
  closed.do({ type: 'fillWithBoilingWater', vesselId: 'kettle' })
  open.do({ type: 'fillWithBoilingWater', vesselId: 'kettle' })
  open.do({ type: 'openVesselLid', vesselId: 'kettle' })

  closed.wait(1)
  open.wait(1)

  assertNear((100 - open.vessel('kettle').liquid.temperatureC) / (100 - closed.vessel('kettle').liquid.temperatureC), 2, 0.02)
})

test('cup_whenPlacedOnTheHeater_isRefused', () => {
  const ritual = new TestRitual()

  const events = ritual.do({ type: 'placeOnHeater', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'placeOnHeater', reason: 'cannotSitOnHeater' }])
})

test('kettleWater_whenCoolingWhileOnAWorkingHeater_stillReachesBoiling', () => {
  const ritual = ritualWithTheKettleOnTheWorkingHeater(new TestRitual(testCatalog({ kettle: 0.01 })))

  ritual.wait(120)

  assert.equal(ritual.vessel('kettle').liquid.temperatureC, 100)
})
