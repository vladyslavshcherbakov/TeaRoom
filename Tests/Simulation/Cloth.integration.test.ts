import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { ritualWithSpillOnTheTable, TestRitual } from '../Support/TestRitual.ts'
import { wetMlOnEveryPlace } from '../../Shared/Simulation/Ritual/Puddles.ts'

test('cloth_whenLeftWet_driesByItself', () => {
  const ritual = ritualWithSpillOnTheTable()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  ritual.wait(600)

  assert.equal(ritual.cloth().wetMl, 0)
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

test('cloth_whenPutOnTheHeaterFromThePuddle_stopsSoakingIt', () => {
  const ritual = ritualWithSpillOnTheTable()
  ritual.do({ type: 'soakUpThePuddle', clothId: 'cloth' })

  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })

  assert.equal(ritual.cloth().isSoakingThePuddle, false)
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
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(10)

  assert.equal(ritual.cloth().teaStain, 0)
})

test('cloth_underTheTap_losesATenthOfAFullStainEachSecond', () => {
  const ritual = ritualWithTeaSpilledOnTheTable()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  ritual.do({ type: 'putInTheSink', itemId: 'cloth' })
  ritual.do({ type: 'turnTheTapOn' })
  const stainBeforeWashing = ritual.cloth().teaStain

  ritual.wait(1)

  assertNear(stainBeforeWashing - ritual.cloth().teaStain, 0.1)
})

test('cloth_whenTakenOutOfTheSink_isWrungOutToEightMillilitres', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'putInTheSink', itemId: 'cloth' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(1)

  ritual.do({ type: 'pickUp', itemId: 'cloth' })

  assert.equal(ritual.cloth().wetMl, 8)
})

test('cloth_whenLaidInThePuddleItAlreadySoaks_isRefused', () => {
  const ritual = ritualWithSpillOnTheTable()
  ritual.do({ type: 'soakUpThePuddle', clothId: 'cloth' })

  const events = ritual.do({ type: 'soakUpThePuddle', clothId: 'cloth' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'soakUpThePuddle', reason: 'clothIsAlreadySoaking' }])
})

test('wipe_withAClothTheRoomDoesNotHave_isRefused', () => {
  const ritual = ritualWithSpillOnTheTable()

  const events = ritual.do({ type: 'wipeTable', clothId: 'towel', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'wipeTable', reason: 'unknownItem' }])
})

test('puddle_whenTheClothIsInAHand_isNotSoakedUp', () => {
  const ritual = ritualWithSpillOnTheTable()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })

  const events = ritual.do({ type: 'soakUpThePuddle', clothId: 'cloth' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'soakUpThePuddle', reason: 'alreadyInHand' }])
})

test('puddle_whenTheTableIsDry_isNotSoakedUp', () => {
  const ritual = new TestRitual()

  const events = ritual.do({ type: 'soakUpThePuddle', clothId: 'cloth' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'soakUpThePuddle', reason: 'tableIsDry' }])
})

function ritualWithTeaSpilledOnTheTable(): TestRitual {
  const ritual = new TestRitual()
  ritual.heatKettleTo(80)
  ritual.addLeavesToKettle(5)
  ritual.wait(60)
  ritual.pour('kettle', null, 2.5)
  return ritual
}
