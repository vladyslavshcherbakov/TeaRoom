import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { fullFlowTiltDegrees, sessionWithSpillOnTheTable, TestTeaSession } from '../Support/TestTeaSession.ts'
import { wetMlOnEveryPlace } from '../../Shared/GameLogic/Simulation/Puddles.ts'

test('cloth_whenLeftWet_driesByItself', () => {
  const session = sessionWithSpillOnTheTable()
  session.do({ type: 'pickUp', itemId: 'cloth' })
  session.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  session.wait(600)

  assert.equal(session.cloth().wetMl, 0)
})

test('cloth_whileLyingInThePuddle_soaksUpHalfAMillilitreASecond', () => {
  const session = sessionWithSpillOnTheTable()
  const wetMlBeforeSoaking = wetMlOnEveryPlace(session.state)
  session.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 0 })

  session.wait(10)

  assertNear(wetMlOnEveryPlace(session.state), wetMlBeforeSoaking - 5 - 1)
  assertNear(session.cloth().wetMl, 5 - 1)
})

test('puddle_whenTheClothIsLaidOverAllOfIt_losesFourFifthsAtOnce', () => {
  const session = sessionWithSpillOnTheTable()
  const wetMlBeforeTheCloth = wetMlOnEveryPlace(session.state)

  session.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 1 })

  assertNear(wetMlOnEveryPlace(session.state), wetMlBeforeTheCloth * 0.2)
})

test('cloth_whileLyingFullInThePuddle_soaksUpWhatItDriesOff', () => {
  const [withTheCloth, leftAlone] = [new TestTeaSession(), new TestTeaSession()]
  for (const session of [withTheCloth, leftAlone]) session.pour('kettle', null, 10, fullFlowTiltDegrees)
  withTheCloth.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 0 })

  for (const session of [withTheCloth, leftAlone]) session.wait(200)

  assertNear(wetMlOnEveryPlace(leftAlone.state) - wetMlOnEveryPlace(withTheCloth.state), 60, 0.5)
  assert.equal(withTheCloth.cloth().soakingPuddleId, 'puddle1')
})

test('cloth_whenTheWholePuddleIsSoakedUp_stopsSoaking', () => {
  const session = sessionWithSpillOnTheTable()
  session.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 0 })

  session.wait(60)

  assert.equal(wetMlOnEveryPlace(session.state), 0)
  assert.equal(session.cloth().soakingPuddleId, null)
})

test('cloth_whenLiftedOutOfThePuddle_stopsSoakingIt', () => {
  const session = sessionWithSpillOnTheTable()
  session.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 0 })
  session.wait(4)
  session.do({ type: 'pickUp', itemId: 'cloth' })
  const wetMlWhenLifted = wetMlOnEveryPlace(session.state)

  session.wait(10)

  assertNear(wetMlOnEveryPlace(session.state), wetMlWhenLifted - 1)
})

test('cloth_whenPutOnTheHeaterFromThePuddle_stopsSoakingIt', () => {
  const session = sessionWithSpillOnTheTable()
  session.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 0 })

  session.do({ type: 'placeOnHeater', itemId: 'cloth' })

  assert.equal(session.cloth().soakingPuddleId, null)
})

test('cloth_whenItSoaksUpSpilledTea_isStained', () => {
  const session = sessionWithTeaSpilledOnTheTable()
  session.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 0 })

  session.wait(10)

  assert.ok(session.cloth().teaStain > 0, `stain ${session.cloth().teaStain}`)
})

test('cloth_whenItSoaksUpSpilledWater_staysUnstained', () => {
  const session = sessionWithSpillOnTheTable()
  session.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 0 })

  session.wait(10)

  assert.equal(session.cloth().teaStain, 0)
})

test('cloth_whenClean_driesATenthOfAMillilitreASecond', () => {
  const session = sessionWithSpillOnTheTable()
  session.do({ type: 'pickUp', itemId: 'cloth' })
  session.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  const wetMlAfterWiping = session.cloth().wetMl

  session.wait(10)

  assertNear(session.cloth().wetMl, wetMlAfterWiping - 1)
})

test('cloth_whenStainedWithTea_driesSlowerThanAClean', () => {
  const session = sessionWithTeaSpilledOnTheTable()
  session.do({ type: 'pickUp', itemId: 'cloth' })
  session.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  const wetMlAfterWiping = session.cloth().wetMl

  session.wait(10)

  assert.ok(wetMlAfterWiping - session.cloth().wetMl < 0.9, `${wetMlAfterWiping} → ${session.cloth().wetMl} ml, stain ${session.cloth().teaStain}`)
})

test('cloth_whenWashedUnderTheTap_losesItsTeaStain', () => {
  const session = sessionWithTeaSpilledOnTheTable()
  session.do({ type: 'pickUp', itemId: 'cloth' })
  session.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  session.do({ type: 'putInTheSink', itemId: 'cloth' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(10)

  assert.equal(session.cloth().teaStain, 0)
})

test('cloth_underTheTap_losesATenthOfAFullStainEachSecond', () => {
  const session = sessionWithTeaSpilledOnTheTable()
  session.do({ type: 'pickUp', itemId: 'cloth' })
  session.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  session.do({ type: 'putInTheSink', itemId: 'cloth' })
  session.do({ type: 'turnTheTapOn' })
  const stainBeforeWashing = session.cloth().teaStain

  session.wait(1)

  assertNear(stainBeforeWashing - session.cloth().teaStain, 0.1)
})

test('cloth_underTheTapForAMinute_holdsFortyMillilitres', () => {
  const session = new TestTeaSession()
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'cloth' })
  session.doWithoutARefusal({ type: 'putInTheSink', itemId: 'cloth' })
  session.doWithoutARefusal({ type: 'turnTheTapOn' })

  session.wait(60)

  assertNear(session.cloth().wetMl, 40, 0.01)
})

test('cloth_whenTakenOutOfTheSink_isWrungOutToEightMillilitres', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'cloth' })
  session.do({ type: 'putInTheSink', itemId: 'cloth' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(1)

  session.do({ type: 'pickUp', itemId: 'cloth' })

  assert.equal(session.cloth().wetMl, 8)
})

test('cloth_whenLaidInThePuddleItAlreadySoaks_isRefused', () => {
  const session = sessionWithSpillOnTheTable()
  session.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 0 })

  const events = session.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 0 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'soakUpThePuddle', reason: 'clothIsAlreadySoaking' }])
})

test('wipe_withAClothTheRoomDoesNotHave_isRefused', () => {
  const session = sessionWithSpillOnTheTable()

  const events = session.do({ type: 'wipeTable', clothId: 'towel', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'wipeTable', reason: 'unknownItem' }])
})

test('puddle_whenTheClothIsInAHand_isNotSoakedUp', () => {
  const session = sessionWithSpillOnTheTable()
  session.do({ type: 'pickUp', itemId: 'cloth' })

  const events = session.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 0 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'soakUpThePuddle', reason: 'alreadyInHand' }])
})

test('puddle_whenTheTableIsDry_isNotSoakedUp', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle1', coveredFraction: 0 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'soakUpThePuddle', reason: 'tableIsDry' }])
})

function sessionWithTeaSpilledOnTheTable(): TestTeaSession {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  session.addLeavesToKettle(5)
  session.wait(60)
  session.pour('kettle', null, 2.5)
  return session
}
