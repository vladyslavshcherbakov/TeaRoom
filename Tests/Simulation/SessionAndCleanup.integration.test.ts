import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, testHouseCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

function ritualWithSpillOnTheTable(): TestRitual {
  const ritual = TestRitual.begun()
  ritual.pour('kettle', null, 2.5)
  return ritual
}

test('room_beforeTheRitualBegins_refusesTouchingTheKettle', () => {
  const ritual = new TestRitual()

  const events = ritual.do({ type: 'placeOnHeater', vesselId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'placeOnHeater', reason: 'ritualNotStarted' }])
})

test('ritual_whenBegunWithAnUnknownTea_isRefused', () => {
  const ritual = new TestRitual()

  const events = ritual.do({ type: 'beginRitual', teaId: 'earlGrey' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'beginRitual', reason: 'unknownTea' }])
  assert.equal(ritual.state.phase, 'settingUp')
})

test('atmosphere_whenOfferedByTheRoom_changesTimeAndWeather', () => {
  const ritual = new TestRitual()

  ritual.do({ type: 'chooseAtmosphere', timeOfDay: 'night', weather: 'rain' })

  assert.deepEqual(ritual.state.atmosphere, { timeOfDay: 'night', weather: 'rain' })
})

test('atmosphere_whenNotOfferedByTheRoom_isRefused', () => {
  const ritual = new TestRitual()

  const events = ritual.do({ type: 'chooseAtmosphere', timeOfDay: 'night', weather: 'snow' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'chooseAtmosphere', reason: 'notAvailableInThisRoom' }])
  assert.deepEqual(ritual.state.atmosphere, { timeOfDay: 'sunset', weather: 'rain' })
})

test('spill_whenLarge_theGodsPromiseToTellNoOne', () => {
  const ritual = TestRitual.begun()

  const events = ritual.pour('kettle', null, 2.5)

  assert.deepEqual(eventsOfType(events, 'godsMoodChanged'), [
    { type: 'godsMoodChanged', delta: -1, satisfaction: 49, remark: 'weWillTellNoOne' },
  ])
})

test('table_whenWipedSlowly_driesMoreThanWhenWipedFast', () => {
  const wipedSlowly = ritualWithSpillOnTheTable()
  const wipedFast = ritualWithSpillOnTheTable()
  wipedSlowly.do({ type: 'pickUp', itemId: 'cloth' })
  wipedFast.do({ type: 'pickUp', itemId: 'cloth' })

  wipedSlowly.do({ type: 'wipeTable', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  wipedFast.do({ type: 'wipeTable', strokeSpeedCmPerSecond: 300, coveredFraction: 1 })

  assert.ok(wipedSlowly.state.tableWetMl < 6, `slow wipe left ${wipedSlowly.state.tableWetMl} ml`)
  assert.ok(wipedFast.state.tableWetMl > 15, `fast wipe left ${wipedFast.state.tableWetMl} ml`)
})

test('table_whenWipedInTwoHalves_driesAsMuchAsInOneStroke', () => {
  const wipedOnce = ritualWithSpillOnTheTable()
  const wipedInHalves = ritualWithSpillOnTheTable()
  wipedOnce.do({ type: 'pickUp', itemId: 'cloth' })
  wipedInHalves.do({ type: 'pickUp', itemId: 'cloth' })

  wipedOnce.do({ type: 'wipeTable', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  wipedInHalves.do({ type: 'wipeTable', strokeSpeedCmPerSecond: 10, coveredFraction: 0.5 })
  wipedInHalves.do({ type: 'wipeTable', strokeSpeedCmPerSecond: 10, coveredFraction: 0.5 })

  assertNear(wipedInHalves.state.tableWetMl, wipedOnce.state.tableWetMl)
})

test('cloth_whenItWipesTheTable_takesInTheWaterItWipedUp', () => {
  const ritual = ritualWithSpillOnTheTable()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  const wetMlBeforeWiping = ritual.state.tableWetMl

  ritual.do({ type: 'wipeTable', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assertNear(ritual.state.cloth.wetMl, wetMlBeforeWiping * 0.8)
})

test('cloth_whenLeftWet_driesByItself', () => {
  const ritual = ritualWithSpillOnTheTable()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'wipeTable', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  ritual.wait(600)

  assert.equal(ritual.state.cloth.wetMl, 0)
})

test('table_whenLeftAlone_driesByItself', () => {
  const ritual = ritualWithSpillOnTheTable()

  ritual.wait(600)

  assert.equal(ritual.state.tableWetMl, 0)
})

test('ritual_whenFinishedWithADryTableAndClosedLids_pleasesTheGods', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'finishRitual' })

  assert.deepEqual(events, [
    { type: 'godsMoodChanged', delta: 2, satisfaction: 52, remark: 'appreciateTheCalm' },
    { type: 'ritualFinished' },
  ])
  assert.equal(ritual.state.phase, 'resting')
})

test('ritual_whenFinishedWithAWetTable_leavesTheGodsWhereTheyWere', () => {
  const ritual = ritualWithSpillOnTheTable()

  const events = ritual.do({ type: 'finishRitual' })

  assert.deepEqual(eventsOfType(events, 'godsMoodChanged'), [])
})

test('ritual_whenFinishedWithTheCaddyOpen_leavesTheGodsWhereTheyWere', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'openCaddy' })

  const events = ritual.do({ type: 'finishRitual' })

  assert.deepEqual(eventsOfType(events, 'godsMoodChanged'), [])
})

test('ritual_whenFinishedWithTheHeaterOn_switchesItOff', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'switchHeaterOn' })

  const events = ritual.do({ type: 'finishRitual' })

  assert.deepEqual(eventsOfType(events, 'heaterSwitchedOff'), [{ type: 'heaterSwitchedOff', waterJudgement: null }])
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
  ritual.do({ type: 'chooseAtmosphere', timeOfDay: 'night', weather: 'rain' })

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

test('table_withTheClothLyingOnIt_isNotWiped', () => {
  const ritual = ritualWithSpillOnTheTable()
  const wetMlBeforeWiping = ritual.state.tableWetMl

  const events = ritual.do({ type: 'wipeTable', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'wipeTable', reason: 'notInHand' }])
  assert.equal(ritual.state.tableWetMl, wetMlBeforeWiping)
})

test('cloth_whenUsedAwayFromTheTeaTable_isRefused', () => {
  const ritual = TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'table' })
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'standAt', placeId: 'counter' })

  const events = ritual.do({ type: 'wipeTable', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'wipeTable', reason: 'notAtThatPlace' }])
})
