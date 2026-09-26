import assert from 'node:assert/strict'
import test from 'node:test'
import { degreesShownIn } from '../../../Apps/Game/Room/Temperatures.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { TestRoom } from '../../Support/TestRoom.ts'

const down = { kind: 'thermostatArrow', step: -1 } as const
const up = { kind: 'thermostatArrow', step: 1 } as const

test('downArrow_whenTapped_setsTheThermostatOneDegreeLower', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap(down)

  assert.equal(room.state.heater.thermostat.targetC, 99)
})

test('upArrow_whenTappedAtAHundredDegrees_leavesTheThermostatThere', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap(up)

  assert.equal(room.state.heater.thermostat.targetC, 100)
  assert.ok(room.logLines.includes('the thermostat stays at 100 degrees celsius, its highest'), room.logLines.join('\n'))
})

test('downArrow_whenTappedInFahrenheit_setsTheThermostatOneFahrenheitDegreeLower', () => {
  const room = new TestRoom()
  room.temperatureUnit = 'fahrenheit'
  room.walkTo('counter')

  room.tap(down)

  assert.equal(degreesShownIn('fahrenheit', room.state.heater.thermostat.targetC), 211)
})

test('downArrow_heldForOneSecond_stepsTheThermostatSixDegreesLowerAndNoMoreWhenLifted', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.play.pressStarted(down)
  room.advance(1.05)

  room.play.pressEnded()

  assert.equal(room.state.heater.thermostat.targetC, 94)
})

test('thermostatButton_whenTapped_startsTheThermostat', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'thermostatButton' })

  assert.equal(room.state.heater.thermostat.isOn, true)
})

test('thermostatButton_whenTappedWhileTheThermostatWorks_switchesTheHeaterOff', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'thermostatButton' })

  room.tap({ kind: 'thermostatButton' })

  assert.equal(room.state.heater.thermostat.isOn, false)
  assert.equal(room.state.heater.isOn, false)
})

test('heaterSwitch_whenTappedWhileTheThermostatHeats_switchesEverythingOff', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.session.dispatch({ type: 'placeOnHeater', itemId: 'kettle' })
  room.tap({ kind: 'thermostatButton' })
  room.advance(0.1)

  room.tap({ kind: 'heaterSwitch' })

  assert.equal(room.state.heater.isOn, false)
  assert.equal(room.state.heater.thermostat.isOn, false)
})

test('heaterSwitch_whenTappedWhileTheThermostatWaits_boilsByHand', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'thermostatButton' })

  room.tap({ kind: 'heaterSwitch' })

  assert.equal(room.state.heater.isOn, true)
  assert.equal(room.state.heater.thermostat.isOn, false)
})

test('heaterSwitch_inNerdMode_holdsTheKettleAtTheShownTargetAndStaysOn', () => {
  const room = kettleOfTapWaterOnTheHeater()
  room.isNerdModeOn = true
  room.tapTimes(20, down)

  room.tap({ kind: 'heaterSwitch' })
  room.advance(60)

  assertNear(kettleWaterC(room), 80, 0.05)
  assert.equal(room.state.heater.isOn, true)
})

test('heaterSwitch_withoutNerdMode_boilsTheKettlePastTheTarget', () => {
  const room = kettleOfTapWaterOnTheHeater()
  room.tapTimes(20, down)

  room.tap({ kind: 'heaterSwitch' })
  room.advance(40)

  assert.equal(kettleWaterC(room), 100)
  assert.equal(room.state.heater.isOn, true)
})

test('thermostatControls_whenTappedWithBothHandsFull_workAndKeepTheItemsInHand', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'item', itemId: 'thermos' })

  room.tap(down)
  room.tap({ kind: 'thermostatButton' })

  assert.deepEqual(room.state.heater.thermostat, { targetC: 99, isOn: true })
  assert.deepEqual(room.state.keeper.hands, ['kettle', 'thermos', null])
})

test('thermostatControls_behindTheChosenHandsTouchArea_areReachedByATap', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.play.doesATapReachPastTheChosenHand(down), true)
  assert.equal(room.play.doesATapReachPastTheChosenHand({ kind: 'thermostatButton' }), true)
})

test('downArrow_whenTappedFromTheRoom_walksToTheCounterWithoutStepping', () => {
  const room = new TestRoom()

  room.tap(down)

  assert.equal(room.state.heater.thermostat.targetC, 100)
})

function kettleOfTapWaterOnTheHeater(): TestRoom {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.session.dispatch({ type: 'placeOnHeater', itemId: 'kettle' })
  return room
}

function kettleWaterC(room: TestRoom): number {
  return room.state.vessels['kettle']?.liquid.temperatureC ?? Number.NaN
}
