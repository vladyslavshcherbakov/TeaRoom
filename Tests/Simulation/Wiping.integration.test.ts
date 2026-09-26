import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, testHouseCatalog, withASecondCloth } from '../Support/TestCatalog.ts'
import { fullFlowTiltDegrees, ritualWithSpillOnTheTable, TestRitual } from '../Support/TestRitual.ts'
import { wetMlAt, wetMlOnEveryPlace } from '../../Shared/Simulation/Ritual/Puddles.ts'

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

test('cloth_whenItWipesMoreThanItHolds_stopsAtItsCapacityAndLeavesTheRestOnTheTable', () => {
  const ritual = new TestRitual()
  ritual.pour('kettle', null, 5, fullFlowTiltDegrees)
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  const wetMlBeforeWiping = wetMlOnEveryPlace(ritual.state)

  ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.equal(ritual.cloth().wetMl, 40)
  assertNear(wetMlOnEveryPlace(ritual.state), wetMlBeforeWiping - 40)
})

test('table_withTheClothLyingOnIt_isNotWiped', () => {
  const ritual = ritualWithSpillOnTheTable()
  const wetMlBeforeWiping = wetMlOnEveryPlace(ritual.state)

  const events = ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'wipeTable', reason: 'notInHand' }])
  assert.equal(wetMlOnEveryPlace(ritual.state), wetMlBeforeWiping)
})

test('cloth_whenWipingWhereNothingIsSpilled_isRefused', () => {
  const ritual = new TestRitual(testHouseCatalog(), 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'table' })
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'standAt', placeId: 'counter' })

  const events = ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'wipeTable', reason: 'tableIsDry' }])
})

test('puddleOnTheCounter_whenWipedThere_shrinks', () => {
  const ritual = new TestRitual(testHouseCatalog(), 'testHouse')
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
  const ritual = new TestRitual(withASecondCloth(testCatalog()))
  ritual.pour('kettle', null, 2.5)
  ritual.do({ type: 'pickUp', itemId: 'cloth2' })

  ritual.do({ type: 'wipeTable', clothId: 'cloth2', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.ok(ritual.cloth('cloth2').wetMl > 0, 'the second cloth stayed dry')
  assert.equal(ritual.cloth('cloth').wetMl, 0)
})

test('puddle_ofWaterAtNinetyDegrees_driesFasterThanOneAtRoomTemperature', () => {
  const hot = new TestRitual()
  hot.heatKettleTo(90)
  hot.pour('kettle', null, 2.5)
  const cold = ritualWithSpillOnTheTable()
  const [hotWetMlBefore, coldWetMlBefore] = [wetMlOnEveryPlace(hot.state), wetMlOnEveryPlace(cold.state)]

  hot.wait(10)
  cold.wait(10)

  assertNear(coldWetMlBefore - wetMlOnEveryPlace(cold.state), 1)
  assert.ok(hotWetMlBefore - wetMlOnEveryPlace(hot.state) > 1.5, `the hot puddle lost ${hotWetMlBefore - wetMlOnEveryPlace(hot.state)} ml in 10 s`)
})

test('puddle_ofHotWater_coolsToTheRoomWithinThreeMinutes', () => {
  const ritual = new TestRitual()
  ritual.heatKettleTo(90)
  ritual.pour('kettle', null, 2.5)

  ritual.wait(180)

  const puddleTemperatureC = ritual.state.puddles['table']?.temperatureC
  assert.ok(puddleTemperatureC !== undefined && puddleTemperatureC < 21, `the puddle is at ${puddleTemperatureC} °C`)
})
