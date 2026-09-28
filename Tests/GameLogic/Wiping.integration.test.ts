import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, testHouseCatalog, withASecondCloth } from '../Support/TestCatalog.ts'
import { fullFlowTiltDegrees, sessionWithSpillOnTheTable, TestTeaSession } from '../Support/TestTeaSession.ts'
import { wetMlAt, wetMlOnEveryPlace } from '../../Shared/GameLogic/Simulation/Puddles.ts'

test('table_whenWipedSlowly_driesMoreThanWhenWipedFast', () => {
  const wipedSlowly = sessionWithSpillOnTheTable()
  const wipedFast = sessionWithSpillOnTheTable()
  wipedSlowly.do({ type: 'pickUp', itemId: 'cloth' })
  wipedFast.do({ type: 'pickUp', itemId: 'cloth' })

  wipedSlowly.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  wipedFast.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 300, coveredFraction: 1 })

  assert.ok(wetMlOnEveryPlace(wipedSlowly.state) < 6, `slow wipe left ${wetMlOnEveryPlace(wipedSlowly.state)} ml`)
  assert.ok(wetMlOnEveryPlace(wipedFast.state) > 15, `fast wipe left ${wetMlOnEveryPlace(wipedFast.state)} ml`)
})

test('table_whenWipedInTwoHalves_driesAsMuchAsInOneStroke', () => {
  const wipedOnce = sessionWithSpillOnTheTable()
  const wipedInHalves = sessionWithSpillOnTheTable()
  wipedOnce.do({ type: 'pickUp', itemId: 'cloth' })
  wipedInHalves.do({ type: 'pickUp', itemId: 'cloth' })

  wipedOnce.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  wipedInHalves.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 0.5 })
  wipedInHalves.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 0.5 })

  assertNear(wetMlOnEveryPlace(wipedInHalves.state), wetMlOnEveryPlace(wipedOnce.state))
})

test('cloth_whenItWipesTheTable_takesInTheWaterItWipedUp', () => {
  const session = sessionWithSpillOnTheTable()
  session.do({ type: 'pickUp', itemId: 'cloth' })
  const wetMlBeforeWiping = wetMlOnEveryPlace(session.state)

  session.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assertNear(session.cloth().wetMl, wetMlBeforeWiping * 0.8)
})

test('cloth_whenItWipesMoreThanItHolds_isFullAndTheTableLosesTheWholeWipe', () => {
  const session = new TestTeaSession()
  session.pour('kettle', null, 5, fullFlowTiltDegrees)
  session.do({ type: 'pickUp', itemId: 'cloth' })
  const wetMlBeforeWiping = wetMlOnEveryPlace(session.state)

  session.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.equal(session.cloth().wetMl, 40)
  assertNear(wetMlOnEveryPlace(session.state), wetMlBeforeWiping * 0.2)
})

test('table_withTheClothLyingOnIt_isNotWiped', () => {
  const session = sessionWithSpillOnTheTable()
  const wetMlBeforeWiping = wetMlOnEveryPlace(session.state)

  const events = session.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'wipeTable', reason: 'notInHand' }])
  assert.equal(wetMlOnEveryPlace(session.state), wetMlBeforeWiping)
})

test('cloth_whenWipingWhereNothingIsSpilled_isRefused', () => {
  const session = new TestTeaSession(testHouseCatalog(), 'testHouse')
  session.do({ type: 'standAt', placeId: 'table' })
  session.do({ type: 'pickUp', itemId: 'cloth' })
  session.do({ type: 'standAt', placeId: 'counter' })

  const events = session.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'wipeTable', reason: 'tableIsDry' }])
})

test('puddleOnTheCounter_whenWipedThere_shrinks', () => {
  const session = new TestTeaSession(testHouseCatalog(), 'testHouse')
  session.do({ type: 'standAt', placeId: 'table' })
  session.do({ type: 'pickUp', itemId: 'cloth' })
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.pour('kettle', null, 2.5)
  const wetMlBeforeWiping = wetMlAt(session.state, 'counter')

  session.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.ok(wetMlAt(session.state, 'counter') < wetMlBeforeWiping * 0.5, `${wetMlAt(session.state, 'counter')} ml of ${wetMlBeforeWiping} ml left`)
})

test('secondCloth_whenItWipesTheTable_takesTheWaterWhileTheFirstStaysDry', () => {
  const session = new TestTeaSession(withASecondCloth(testCatalog()))
  session.pour('kettle', null, 2.5)
  session.do({ type: 'pickUp', itemId: 'cloth2' })

  session.do({ type: 'wipeTable', clothId: 'cloth2', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.ok(session.cloth('cloth2').wetMl > 0, 'the second cloth stayed dry')
  assert.equal(session.cloth('cloth').wetMl, 0)
})

test('puddle_ofWaterAtNinetyDegrees_driesFasterThanOneAtRoomTemperature', () => {
  const hot = new TestTeaSession()
  hot.heatKettleTo(90)
  hot.pour('kettle', null, 2.5)
  const cold = sessionWithSpillOnTheTable()
  const [hotWetMlBefore, coldWetMlBefore] = [wetMlOnEveryPlace(hot.state), wetMlOnEveryPlace(cold.state)]

  hot.wait(10)
  cold.wait(10)

  assertNear(coldWetMlBefore - wetMlOnEveryPlace(cold.state), 1)
  assert.ok(hotWetMlBefore - wetMlOnEveryPlace(hot.state) > 1.5, `the hot puddle lost ${hotWetMlBefore - wetMlOnEveryPlace(hot.state)} ml in 10 s`)
})

test('puddle_ofHotWater_coolsToTheRoomWithinThreeMinutes', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(90)
  session.pour('kettle', null, 2.5)

  session.wait(180)

  const puddleTemperatureC = Object.values(session.state.puddles).find((puddle) => puddle.centre.placeId === 'table')?.temperatureC
  assert.ok(puddleTemperatureC !== undefined && puddleTemperatureC < 21, `the puddle is at ${puddleTemperatureC} °C`)
})
