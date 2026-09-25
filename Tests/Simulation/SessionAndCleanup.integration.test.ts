import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, testHouseCatalog, withASecondCloth } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'
import { wetMlAt, wetMlOnEveryPlace } from '../../Shared/Simulation/Ritual/Puddles.ts'

const cupOnTheCounter = { placeId: 'counter', x: 5, y: 0, z: 0 }

function ritualWithSpillOnTheTable(): TestRitual {
  const ritual = TestRitual.begun()
  ritual.pour('kettle', null, 2.5)
  return ritual
}

function ritualWithTeaSpilledOnTheTable(): TestRitual {
  const ritual = TestRitual.begun()
  ritual.heatKettleTo(80)
  ritual.addLeavesToKettle(5)
  ritual.wait(60)
  ritual.pour('kettle', null, 2.5)
  return ritual
}

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

test('atmosphere_whenOfferedByTheRoom_changesTimeAndWeather', () => {
  const ritual = new TestRitual()

  ritual.do({ type: 'chooseAtmosphere', timeOfDay: 'night', shareThroughTheTimeOfDay: 0.5, weather: 'rain' })

  assert.deepEqual(ritual.state.atmosphere, { timeOfDay: 'night', shareThroughTheTimeOfDay: 0.5, weather: 'rain' })
})

test('atmosphere_whenNotOfferedByTheRoom_isRefused', () => {
  const ritual = new TestRitual()

  const events = ritual.do({ type: 'chooseAtmosphere', timeOfDay: 'night', shareThroughTheTimeOfDay: 0.5, weather: 'snow' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'chooseAtmosphere', reason: 'notAvailableInThisRoom' }])
  assert.deepEqual(ritual.state.atmosphere, { timeOfDay: 'sunset', shareThroughTheTimeOfDay: 0, weather: 'rain' })
})

test('table_whenWipedSlowly_driesMoreThanWhenWipedFast', () => {
  const wipedSlowly = ritualWithSpillOnTheTable()
  const wipedFast = ritualWithSpillOnTheTable()
  wipedSlowly.do({ type: 'pickUp', itemId: 'cloth' })
  wipedFast.do({ type: 'pickUp', itemId: 'cloth' })

  wipedSlowly.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  wipedFast.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 300, coveredFraction: 1 })

  assert.ok(wetMlOnEveryPlace(wipedSlowly.state) < 6, `slow wipe left ${wetMlOnEveryPlace(wipedSlowly.state)} ml`)
  assert.ok(wetMlOnEveryPlace(wipedFast.state) > 15, `fast wipe left ${wetMlOnEveryPlace(wipedFast.state)} ml`)
})

test('table_whenWipedInTwoHalves_driesAsMuchAsInOneStroke', () => {
  const wipedOnce = ritualWithSpillOnTheTable()
  const wipedInHalves = ritualWithSpillOnTheTable()
  wipedOnce.do({ type: 'pickUp', itemId: 'cloth' })
  wipedInHalves.do({ type: 'pickUp', itemId: 'cloth' })

  wipedOnce.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  wipedInHalves.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 0.5 })
  wipedInHalves.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 0.5 })

  assertNear(wetMlOnEveryPlace(wipedInHalves.state), wetMlOnEveryPlace(wipedOnce.state))
})

test('cloth_whenItWipesTheTable_takesInTheWaterItWipedUp', () => {
  const ritual = ritualWithSpillOnTheTable()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  const wetMlBeforeWiping = wetMlOnEveryPlace(ritual.state)

  ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assertNear(ritual.cloth().wetMl, wetMlBeforeWiping * 0.8)
})

test('cloth_whenLeftWet_driesByItself', () => {
  const ritual = ritualWithSpillOnTheTable()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  ritual.wait(600)

  assert.equal(ritual.cloth().wetMl, 0)
})

test('table_whenLeftAlone_driesByItself', () => {
  const ritual = ritualWithSpillOnTheTable()

  ritual.wait(600)

  assert.equal(wetMlOnEveryPlace(ritual.state), 0)
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

  assert.equal(eventsOfType(events, 'heaterSwitchedOff')[0]?.waterJudgement, null)
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

test('cloth_whileLyingInThePuddle_soaksUpHalfAMillilitreASecond', () => {
  const ritual = ritualWithSpillOnTheTable()
  const wetMlBeforeSoaking = wetMlOnEveryPlace(ritual.state)
  ritual.do({ type: 'soakUpThePuddle', clothId: 'cloth' })

  ritual.wait(10)

  assertNear(wetMlOnEveryPlace(ritual.state), wetMlBeforeSoaking - 5 - 1)
  assertNear(ritual.cloth().wetMl, 5 - 1)
})

test('cloth_whenTheWholePuddleIsSoakedUp_stopsSoaking', () => {
  const ritual = ritualWithSpillOnTheTable()
  ritual.do({ type: 'soakUpThePuddle', clothId: 'cloth' })

  ritual.wait(60)

  assert.equal(wetMlOnEveryPlace(ritual.state), 0)
  assert.equal(ritual.cloth().isSoakingThePuddle, false)
})

test('cloth_whenLiftedOutOfThePuddle_stopsSoakingIt', () => {
  const ritual = ritualWithSpillOnTheTable()
  ritual.do({ type: 'soakUpThePuddle', clothId: 'cloth' })
  ritual.wait(4)
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  const wetMlWhenLifted = wetMlOnEveryPlace(ritual.state)

  ritual.wait(10)

  assertNear(wetMlOnEveryPlace(ritual.state), wetMlWhenLifted - 1)
})

test('cloth_whenItSoaksUpSpilledTea_isStained', () => {
  const ritual = ritualWithTeaSpilledOnTheTable()
  ritual.do({ type: 'soakUpThePuddle', clothId: 'cloth' })

  ritual.wait(10)

  assert.ok(ritual.cloth().teaStain > 0, `stain ${ritual.cloth().teaStain}`)
})

test('cloth_whenItSoaksUpSpilledWater_staysUnstained', () => {
  const ritual = ritualWithSpillOnTheTable()
  ritual.do({ type: 'soakUpThePuddle', clothId: 'cloth' })

  ritual.wait(10)

  assert.equal(ritual.cloth().teaStain, 0)
})

test('cloth_whenClean_driesATenthOfAMillilitreASecond', () => {
  const ritual = ritualWithSpillOnTheTable()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  const wetMlAfterWiping = ritual.cloth().wetMl

  ritual.wait(10)

  assertNear(ritual.cloth().wetMl, wetMlAfterWiping - 1)
})

test('cloth_whenStainedWithTea_driesSlowerThanAClean', () => {
  const ritual = ritualWithTeaSpilledOnTheTable()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  const wetMlAfterWiping = ritual.cloth().wetMl

  ritual.wait(10)

  assert.ok(wetMlAfterWiping - ritual.cloth().wetMl < 0.9, `${wetMlAfterWiping} → ${ritual.cloth().wetMl} ml, stain ${ritual.cloth().teaStain}`)
})

test('cloth_whenWashedUnderTheTap_losesItsTeaStain', () => {
  const ritual = ritualWithTeaSpilledOnTheTable()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  ritual.do({ type: 'putInTheSink', itemId: 'cloth' })
  ritual.wait(10)

  assert.equal(ritual.cloth().teaStain, 0)
})

test('cloth_underTheTap_losesATenthOfAFullStainEachSecond', () => {
  const ritual = ritualWithTeaSpilledOnTheTable()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  ritual.do({ type: 'putInTheSink', itemId: 'cloth' })
  const stainBeforeWashing = ritual.cloth().teaStain

  ritual.wait(1)

  assertNear(stainBeforeWashing - ritual.cloth().teaStain, 0.1)
})

test('cloth_whenTakenOutOfTheSink_isWrungOutToEightMillilitres', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'putInTheSink', itemId: 'cloth' })
  ritual.wait(1)

  ritual.do({ type: 'pickUp', itemId: 'cloth' })

  assert.equal(ritual.cloth().wetMl, 8)
})

test('puddle_whenTheClothIsInAHand_isNotSoakedUp', () => {
  const ritual = ritualWithSpillOnTheTable()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })

  const events = ritual.do({ type: 'soakUpThePuddle', clothId: 'cloth' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'soakUpThePuddle', reason: 'notAtThatPlace' }])
})

test('puddle_whenTheTableIsDry_isNotSoakedUp', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'soakUpThePuddle', clothId: 'cloth' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'soakUpThePuddle', reason: 'tableIsDry' }])
})

test('table_withTheClothLyingOnIt_isNotWiped', () => {
  const ritual = ritualWithSpillOnTheTable()
  const wetMlBeforeWiping = wetMlOnEveryPlace(ritual.state)

  const events = ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'wipeTable', reason: 'notInHand' }])
  assert.equal(wetMlOnEveryPlace(ritual.state), wetMlBeforeWiping)
})

test('cloth_whenWipingWhereNothingIsSpilled_isRefused', () => {
  const ritual = TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'table' })
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'standAt', placeId: 'counter' })

  const events = ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'wipeTable', reason: 'tableIsDry' }])
})

test('spill_whilePouringAtTheCounter_wetsTheCounterAndNotTheTeaTable', () => {
  const ritual = TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  ritual.pour('kettle', null, 2.5)

  assert.ok(wetMlAt(ritual.state, 'counter') > 0, JSON.stringify(ritual.state.puddles))
  assert.equal(wetMlAt(ritual.state, 'table'), 0)
})

test('spill_besideACupOnTheCounter_liesAroundThatCup', () => {
  const ritual = TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'putDown', itemId: 'cup1', spot: cupOnTheCounter })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  ritual.pour('kettle', 'cup1', 2, undefined, 0.5)

  assert.deepEqual(ritual.state.puddles['counter']?.spilledAround, cupOnTheCounter)
})

test('spill_ofAStreamThatMissesTheCup_liesWhereTheStreamFalls', () => {
  const ritual = TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
  const whereTheStreamFalls = { placeId: 'counter', x: 3, y: 0, z: 0.5 }
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'putDown', itemId: 'cup1', spot: cupOnTheCounter })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  ritual.do({ type: 'adjustPour', tiltDegrees: 30, streamOnTargetFraction: 0, missedStreamLandsAt: whereTheStreamFalls })
  ritual.wait(1)

  assert.deepEqual(ritual.state.puddles['counter']?.spilledAround, whereTheStreamFalls)
  assert.equal(ritual.vessel('cup1').liquid.volumeMl, 0)
})

test('puddleOnTheCounter_whenWipedThere_shrinks', () => {
  const ritual = TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'table' })
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.pour('kettle', null, 2.5)
  const wetMlBeforeWiping = wetMlAt(ritual.state, 'counter')

  ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.ok(wetMlAt(ritual.state, 'counter') < wetMlBeforeWiping * 0.5, `${wetMlAt(ritual.state, 'counter')} ml of ${wetMlBeforeWiping} ml left`)
})

test('secondCloth_whenItWipesTheTable_takesTheWaterWhileTheFirstStaysDry', () => {
  const ritual = TestRitual.begun(withASecondCloth(testCatalog()))
  ritual.pour('kettle', null, 2.5)
  ritual.do({ type: 'pickUp', itemId: 'cloth2' })

  ritual.do({ type: 'wipeTable', clothId: 'cloth2', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.ok(ritual.cloth('cloth2').wetMl > 0, 'the second cloth stayed dry')
  assert.equal(ritual.cloth('cloth').wetMl, 0)
})

test('wipe_withAClothLyingOnTheTable_isRefusedAsNotInHand', () => {
  const ritual = TestRitual.begun(withASecondCloth(testCatalog()))
  ritual.pour('kettle', null, 2.5)
  ritual.do({ type: 'pickUp', itemId: 'cloth2' })

  const events = ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'wipeTable', reason: 'notInHand' }])
})
