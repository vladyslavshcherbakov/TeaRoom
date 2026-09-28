import assert from 'node:assert/strict'
import test from 'node:test'
import { degreesShownIn } from '../../../Apps/Game/Room/Temperatures.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { TestRoom } from '../../Support/TestRoom.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn } from '../../../Shared/Engine/Catalog.ts'
import { itemIdsInTheHands } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'
import { isHeating, isTheThermostatWorking } from '../../../Shared/GameLogic/Judgement/HeaterModes.ts'

const down = { kind: 'thermostatArrow', step: -1 } as const
const up = { kind: 'thermostatArrow', step: 1 } as const
const thermostat = definitionIn(defaultCatalog, 'heaters', definitionIn(defaultCatalog, 'rooms', 'quietRoom').heaterId).thermostat

test('downArrow_whenTapped_setsTheThermostatOneDegreeLower', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap(down)

  assert.equal(room.state.heater.thermostatTargetC, thermostat.startsAtC - 1)
})

test('upArrow_whenTappedAtTheHighestTarget_leavesTheThermostatThere', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tapTimes(thermostat.highestC - thermostat.startsAtC, up)

  room.tap(up)

  assert.equal(room.state.heater.thermostatTargetC, thermostat.highestC)
})

test('downArrow_whenTappedInFahrenheit_setsTheThermostatOneFahrenheitDegreeLower', () => {
  const room = new TestRoom()
  room.temperatureUnit = 'fahrenheit'
  room.walkTo('counter')

  room.tap(down)

  assert.equal(degreesShownIn('fahrenheit', room.state.heater.thermostatTargetC), 211)
})

test('downArrow_heldForOneSecond_stepsTheThermostatSixDegreesLowerAndNoMoreWhenLifted', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.playerController.pressStarted(down, null)
  room.advance(1.05)

  room.playerController.pressEnded()

  assert.equal(room.state.heater.thermostatTargetC, thermostat.startsAtC - 6)
})

test('downArrow_heldThroughFourFramesOfAQuarterSecond_stepsTheThermostatSixDegreesLower', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.playerController.pressStarted(down, null)
  for (let frame = 0; frame < 4; frame += 1) room.playerController.advance({ worldSeconds: 0.1, realSeconds: 0.25 })

  room.playerController.pressEnded()

  assert.equal(room.state.heater.thermostatTargetC, thermostat.startsAtC - 6)
})

test('thermostatButton_whenTapped_startsTheThermostat', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'thermostatButton' })

  assert.equal(isTheThermostatWorking(room.state.heater.mode), true)
})

test('thermostatButton_whenTappedWhileTheThermostatWorks_switchesTheHeaterOff', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'thermostatButton' })

  room.tap({ kind: 'thermostatButton' })

  assert.equal(isTheThermostatWorking(room.state.heater.mode), false)
  assert.equal(isHeating(room.state.heater.mode), false)
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

  assert.equal(isHeating(room.state.heater.mode), false)
  assert.equal(isTheThermostatWorking(room.state.heater.mode), false)
})

test('heaterSwitch_whenTappedWhileTheThermostatWaits_switchesEverythingOff', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'thermostatButton' })

  room.tap({ kind: 'heaterSwitch' })

  assert.equal(isHeating(room.state.heater.mode), false)
  assert.equal(isTheThermostatWorking(room.state.heater.mode), false)
})

test('heaterSwitch_inNerdMode_holdsTheKettleAtTheShownTargetAndStaysOn', () => {
  const room = kettleOfTapWaterOnTheHeater()
  room.isNerdModeOn = true
  room.tapTimes(20, down)

  room.tap({ kind: 'heaterSwitch' })
  room.advance(60)

  assertNear(kettleWaterC(room), thermostat.startsAtC - 20, 0.05)
  assert.equal(isHeating(room.state.heater.mode), true)
})

test('heaterSwitch_withoutNerdMode_boilsTheKettlePastTheTarget', () => {
  const room = kettleOfTapWaterOnTheHeater()
  room.tapTimes(20, down)

  room.tap({ kind: 'heaterSwitch' })
  room.advance(40)

  assert.equal(kettleWaterC(room), 100)
  assert.equal(isHeating(room.state.heater.mode), true)
})

test('thermostatControls_whenTappedWithBothHandsFull_workAndKeepTheItemsInHand', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'item', itemId: 'thermos' })

  room.tap(down)
  room.tap({ kind: 'thermostatButton' })

  assert.deepEqual({ targetC: room.state.heater.thermostatTargetC, isWorking: isTheThermostatWorking(room.state.heater.mode) }, { targetC: thermostat.startsAtC - 1, isWorking: true })
  assert.deepEqual(itemIdsInTheHands(room.state), ['kettle', 'thermos', null])
})

test('thermostatControls_behindTheChosenHandsTouchArea_areReachedByATap', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.playerController.doesATapReachPastTheChosenHand(down), true)
  assert.equal(room.playerController.doesATapReachPastTheChosenHand({ kind: 'thermostatButton' }), true)
})

test('downArrow_whenTappedFromTheRoom_walksToTheCounterWithoutStepping', () => {
  const room = new TestRoom()

  room.tap(down)

  assert.equal(room.state.heater.thermostatTargetC, thermostat.startsAtC)
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
