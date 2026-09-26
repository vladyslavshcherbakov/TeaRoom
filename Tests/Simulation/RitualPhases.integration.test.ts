import assert from 'node:assert/strict'
import test from 'node:test'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

test('room_beforeTheRitualBegins_refusesTouchingTheKettle', () => {
  const ritual = new TestRitual()

  const events = ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'placeOnHeater', reason: 'ritualNotStarted' }])
})

test('ritual_whenBegunWithAnUnknownTea_isRefused', () => {
  const ritual = new TestRitual()

  const events = ritual.do({ type: 'beginRitual', teaId: 'earlGrey' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'beginRitual', reason: 'unknownTea' }])
  assert.equal(ritual.state.phase, 'settingUp')
})

test('ritual_whenFinished_letsTheRoomRest', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'finishRitual' })

  assert.deepEqual(events, [{ type: 'ritualFinished' }])
  assert.equal(ritual.state.phase, 'resting')
})

test('ritual_whenFinishedWithTheHeaterOn_switchesItOff', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'switchHeaterOn' })

  const events = ritual.do({ type: 'finishRitual' })

  assert.equal(eventsOfType(events, 'heaterSwitchedOff').length, 1)
  assert.equal(ritual.state.heater.isOn, false)
})

test('ritual_whenFinishedMidPour_endsThePour', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  const events = ritual.do({ type: 'finishRitual' })

  assert.equal(eventsOfType(events, 'pourFinished').length, 1)
  assert.equal(ritual.state.pour, null)
})

test('restingRoom_keepsCoolingTheTea', () => {
  const ritual = TestRitual.begun(testCatalog({ cup: 0.01 }))
  ritual.heatKettleTo(80)
  ritual.pour('kettle', 'cup1', 5)
  ritual.do({ type: 'finishRitual' })
  const temperatureWhenFinishedC = ritual.vessel('cup1').liquid.temperatureC

  ritual.wait(60)

  assert.ok(ritual.vessel('cup1').liquid.temperatureC < temperatureWhenFinishedC - 10)
})

test('restingRoom_refusesRitualActionsButLetsTheWeatherChange', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'finishRitual' })

  const tasteEvents = ritual.do({ type: 'tasteCup', cupId: 'cup1' })
  ritual.do({ type: 'chooseAtmosphere', timeOfDay: 'night', shareThroughTheTimeOfDay: 0.5, weather: 'rain' })

  assert.deepEqual(tasteEvents, [{ type: 'actionRefused', command: 'tasteCup', reason: 'ritualIsOver' }])
  assert.equal(ritual.state.atmosphere.timeOfDay, 'night')
})

test('room_whenLeftDuringTheRitual_refusesUntilTheRitualIsFinished', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'leaveRoom' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'leaveRoom', reason: 'ritualInProgress' }])
})

test('room_whenLeftAfterResting_stopsTheWorld', () => {
  const ritual = TestRitual.begun(testCatalog({ kettle: 0.01 }))
  ritual.heatKettleTo(80)
  ritual.do({ type: 'finishRitual' })
  ritual.do({ type: 'leaveRoom' })
  const stateWhenLeft = structuredClone(ritual.state)

  ritual.wait(60)

  assert.equal(ritual.state.phase, 'ended')
  assert.deepEqual(ritual.state, stateWhenLeft)
})
