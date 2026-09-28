import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, sessionWithTheKettleOnTheWorkingHeater, TestTeaSession } from '../Support/TestTeaSession.ts'
import { itemIdOnTheHeater } from '../../Shared/GameLogic/State/WhereItemsAre.ts'

test('heater_whenSwitchedOffAfterHeatingTheKettle_saysHowLongItHeatedIt', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater()
  session.wait(10)

  const events = session.do({ type: 'switchHeaterOff' })

  assertNear(eventsOfType(events, 'heaterSwitchedOff')[0]?.secondsHeatedByItemId['kettle'] ?? 0, 10)
})

test('heater_whenSwitchedOffAfterTheKettleWasTakenOffAndTheSpoonPutOn_namesBothWithTheirSeconds', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater()
  session.wait(10)
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'putDown', itemId: 'kettle', spot: { placeId: 'table', x: 2, y: 0, z: 0 } })
  session.do({ type: 'placeOnHeater', itemId: 'spoon' })
  session.wait(5)

  const events = session.do({ type: 'switchHeaterOff' })

  const secondsHeated = eventsOfType(events, 'heaterSwitchedOff')[0]?.secondsHeatedByItemId ?? {}
  assert.deepEqual(Object.keys(secondsHeated).sort(), ['kettle', 'spoon'])
  assertNear(secondsHeated['spoon'] ?? 0, 5)
})

test('heater_whenSwitchedOffEmpty_saysItHeatedNothingAndThePlayerSwitchedItOff', () => {
  const session = new TestTeaSession()
  session.do({ type: 'switchHeaterOn' })
  session.wait(10)

  const events = session.do({ type: 'switchHeaterOff' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assert.deepEqual(switchedOff?.secondsHeatedByItemId, {})
})

test('heater_whenSwitchedOffWhileOff_isRefused', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'switchHeaterOff' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'switchHeaterOff', reason: 'heaterAlreadyOff' }])
})

test('heater_withTheKettleOnIt_refusesTheThermos', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })

  const events = session.do({ type: 'placeOnHeater', itemId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'placeOnHeater', reason: 'heaterOccupied' }])
  assert.equal(itemIdOnTheHeater(session.state), 'kettle')
})

test('kettleWater_whenHeatedForTenSeconds_warmsByFortyDegrees', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater()

  session.wait(10)

  assertNear(session.vessel('kettle').liquid.temperatureC, 60)
})

test('kettleWater_withItsLidOpenForTenSecondsOnAWorkingHeater_warmsByTwentyDegrees', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater()
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })

  session.wait(10)

  assertNear(session.vessel('kettle').liquid.temperatureC, 40)
})

test('kettleWater_whenLeftOnTheHeater_stopsAtBoiling', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater()

  session.wait(60)

  assert.equal(session.vessel('kettle').liquid.temperatureC, 100)
})

test('heater_whenSwitchedOffAfterTwoMinutes_saysItWasOnThatLongAndUsedATenthOfAKilowattHour', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater()
  session.wait(120)

  const events = session.do({ type: 'switchHeaterOff' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assertNear(switchedOff?.onSeconds ?? 0, 120)
  assertNear(switchedOff?.kilowattHoursUsed ?? 0, 0.1)
})

test('heater_whenSwitchedOffAfterHeatingOnlyTheKettle_hasWastedNothing', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater()
  session.wait(120)

  const events = session.do({ type: 'switchHeaterOff' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assert.equal(switchedOff?.wastedSeconds, 0)
  assert.equal(switchedOff?.kilowattHoursWasted, 0)
})

test('heater_whenSwitchedOffAfterTwoMinutesWithNothingOnIt_hasWastedATenthOfAKilowattHour', () => {
  const session = new TestTeaSession()
  session.do({ type: 'switchHeaterOn' })
  session.wait(120)

  const events = session.do({ type: 'switchHeaterOff' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assertNear(switchedOff?.wastedSeconds ?? 0, 120)
  assertNear(switchedOff?.kilowattHoursWasted ?? 0, 0.1)
})

test('heater_whenSwitchedOffAfterTheKettleAndThenTheThermos_hasWastedOnlyTheThermosSeconds', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater()
  session.wait(10)
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'putDown', itemId: 'kettle', spot: { placeId: 'table', x: 2, y: 0, z: 0 } })
  session.do({ type: 'placeOnHeater', itemId: 'thermos' })
  session.wait(5)

  const events = session.do({ type: 'switchHeaterOff' })

  assertNear(eventsOfType(events, 'heaterSwitchedOff')[0]?.wastedSeconds ?? 0, 5)
})

test('heater_whenSwitchedOnAgain_countsItsTimeFromTheNewSwitch', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater()
  session.wait(30)
  session.do({ type: 'switchHeaterOff' })
  session.wait(30)
  session.do({ type: 'switchHeaterOn' })
  session.wait(10)

  const events = session.do({ type: 'switchHeaterOff' })

  assertNear(eventsOfType(events, 'heaterSwitchedOff')[0]?.onSeconds ?? 0, 10)
})

test('kettle_whenLiftedOffAWorkingHeater_isTakenOff', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater()
  session.wait(14)

  const events = session.do({ type: 'pickUp', itemId: 'kettle' })

  assert.deepEqual(eventsOfType(events, 'takenOffHeater'), [{ type: 'takenOffHeater', itemId: 'kettle' }])
})

test('kettle_liftedOffAWorkingHeater_stopsWarming', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater()
  session.wait(14)
  session.do({ type: 'pickUp', itemId: 'kettle' })

  session.wait(10)

  assertNear(session.vessel('kettle').liquid.temperatureC, 76)
})

test('kettleWater_whenOffTheHeater_coolsButStaysAboveTheRoom', () => {
  const session = new TestTeaSession(testCatalog({ kettle: 0.01 }))
  session.heatKettleTo(80)
  const temperatureWhenLiftedC = session.vessel('kettle').liquid.temperatureC

  session.wait(60)

  const temperatureAfterAMinuteC = session.vessel('kettle').liquid.temperatureC
  assert.ok(temperatureAfterAMinuteC < temperatureWhenLiftedC - 10, `kettle is still at ${temperatureAfterAMinuteC} °C`)
  assert.ok(temperatureAfterAMinuteC > 20, `kettle fell to ${temperatureAfterAMinuteC} °C, below the room`)
})

test('kettleWater_withItsLidOpen_losesTwiceTheHeatItLosesWithItClosed', () => {
  const closed = new TestTeaSession(testCatalog({ kettle: 0.01 }))
  const open = new TestTeaSession(testCatalog({ kettle: 0.01 }))
  closed.do({ type: 'fillWithBoilingWater', vesselId: 'kettle' })
  open.do({ type: 'fillWithBoilingWater', vesselId: 'kettle' })
  open.do({ type: 'openVesselLid', vesselId: 'kettle' })

  closed.wait(1)
  open.wait(1)

  assertNear((100 - open.vessel('kettle').liquid.temperatureC) / (100 - closed.vessel('kettle').liquid.temperatureC), 2, 0.02)
})

test('cup_whenPlacedOnTheHeater_isRefused', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'placeOnHeater', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'placeOnHeater', reason: 'cannotSitOnHeater' }])
})

test('kettleWater_whenCoolingWhileOnAWorkingHeater_stillReachesBoiling', () => {
  const session = sessionWithTheKettleOnTheWorkingHeater(new TestTeaSession(testCatalog({ kettle: 0.01 })))

  session.wait(120)

  assert.equal(session.vessel('kettle').liquid.temperatureC, 100)
})
