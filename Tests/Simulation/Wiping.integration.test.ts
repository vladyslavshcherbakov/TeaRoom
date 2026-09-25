import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, testHouseCatalog, withASecondCloth } from '../Support/TestCatalog.ts'
import { TestRitual } from '../Support/TestRitual.ts'
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

function ritualWithSpillOnTheTable(): TestRitual {
  const ritual = TestRitual.begun()
  ritual.pour('kettle', null, 2.5)
  return ritual
}
