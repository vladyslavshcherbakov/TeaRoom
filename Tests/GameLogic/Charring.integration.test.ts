import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, withASecondCloth } from '../Support/TestCatalog.ts'
import { eventsOfType, TestTeaSession } from '../Support/TestTeaSession.ts'
import { itemIdsInTheHands, itemIdOnTheHeater } from '../../Shared/GameLogic/State/WhereItemsAre.ts'

test('cloth_onAWorkingHeater_charsThroughInHalfAMinute', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'cloth' })
  session.do({ type: 'switchHeaterOn' })

  session.wait(15)

  assertNear(session.cloth().charring, 0.5)
})

test('cloth_wetOnAWorkingHeater_steamsDryBeforeItChars', () => {
  const session = new TestTeaSession()
  session.pour('kettle', null, 2.5)
  session.do({ type: 'pickUp', itemId: 'cloth' })
  session.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  session.do({ type: 'placeOnHeater', itemId: 'cloth' })
  session.do({ type: 'switchHeaterOn' })

  session.wait(1)

  assert.equal(session.cloth().charring, 0)
})

test('cloth_whenTakenOffTheHeater_saysHowCharredItIs', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'cloth' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(15)

  const events = session.do({ type: 'pickUp', itemId: 'cloth' })

  assertNear(eventsOfType(events, 'clothTakenOffTheHeater')[0]?.charring ?? 0, 0.5)
})

test('cloth_onAHeaterThatIsOff_doesNotChar', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'cloth' })

  session.wait(30)

  assert.equal(session.cloth().charring, 0)
})

test('charredCloth_whenWashedUnderTheTap_isAsGoodAsNew', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'cloth' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(60)
  session.do({ type: 'switchHeaterOff' })
  session.do({ type: 'pickUp', itemId: 'cloth' })

  session.do({ type: 'putInTheSink', itemId: 'cloth' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(5)

  assert.equal(session.cloth().charring, 0)
})

test('washedBurntCloth_whenTakenOutOfTheSink_isNoticedAsNew', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'cloth' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(10)
  session.do({ type: 'switchHeaterOff' })
  session.do({ type: 'pickUp', itemId: 'cloth' })
  session.do({ type: 'putInTheSink', itemId: 'cloth' })
  session.do({ type: 'turnTheTapOn' })
  session.wait(5)

  const events = session.do({ type: 'pickUp', itemId: 'cloth' })

  assert.deepEqual(eventsOfType(events, 'burntClothWashedBackToNew'), [{ type: 'burntClothWashedBackToNew', clothId: 'cloth' }])
})

test('clothThatNeverBurnt_whenTakenOutOfTheSink_isNotBarkedOn', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'cloth' })
  session.do({ type: 'putInTheSink', itemId: 'cloth' })
  session.wait(5)

  const events = session.do({ type: 'pickUp', itemId: 'cloth' })

  assert.deepEqual(eventsOfType(events, 'burntClothWashedBackToNew'), [])
})

test('spoon_onAWorkingHeater_charsThroughInTwentySeconds', () => {
  const session = sessionWithTheSpoonOnAWorkingHeater()

  session.wait(10)

  assertNear(session.state.spoon.charring, 0.5)
})

test('spoon_onAHeaterThatIsOff_doesNotChar', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'spoon' })

  session.wait(30)

  assert.equal(session.state.spoon.charring, 0)
})

test('spoon_whenTakenBeforeItBurns_isSaved', () => {
  const session = sessionWithTheSpoonOnAWorkingHeater()
  session.wait(10)

  session.do({ type: 'pickUp', itemId: 'spoon' })

  assert.deepEqual(session.state.spoon.location, { kind: 'inHand', handIndex: 0 })
})

test('spoon_takenBeforeItBurns_staysAsCharredAsItWas', () => {
  const session = sessionWithTheSpoonOnAWorkingHeater()
  session.wait(10)
  session.do({ type: 'pickUp', itemId: 'spoon' })

  session.wait(10)

  assertNear(session.state.spoon.charring, 0.5)
})

test('spoon_whenTakenWhileItBurns_crumblesWithTheLeavesOnIt', () => {
  const session = new TestTeaSession()
  session.tipASpoonOfLeavesInto('cup1')
  session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })
  session.do({ type: 'placeOnHeater', itemId: 'spoon' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(17)

  const events = session.do({ type: 'pickUp', itemId: 'spoon' })

  assert.deepEqual(eventsOfType(events, 'spoonCrumbled'), [{ type: 'spoonCrumbled', gramsLost: 5 }])
  assert.deepEqual(session.state.spoon.location, { kind: 'gone' })
  assert.deepEqual(itemIdsInTheHands(session.state), [null, null])
  assert.equal(itemIdOnTheHeater(session.state), null)
})

test('spoon_afterItCrumbled_cannotBeTaken', () => {
  const session = sessionWithACrumbledSpoon()

  const events = session.do({ type: 'pickUp', itemId: 'spoon' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUp', reason: 'burntAway' }])
})

test('spoon_afterItCrumbled_cannotScoop', () => {
  const session = sessionWithACrumbledSpoon()

  const events = session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'scoopTea', reason: 'burntAway' }])
})

test('spoon_afterItCrumbled_cannotTipLeaves', () => {
  const session = sessionWithACrumbledSpoon()

  const events = session.do({ type: 'tipSpoonInto', vesselId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tipSpoonInto', reason: 'burntAway' }])
})

test('spoon_afterItCrumbled_cannotBePutDown', () => {
  const session = sessionWithACrumbledSpoon()

  const events = session.do({ type: 'putDown', itemId: 'spoon', spot: { placeId: 'table', x: 7, y: 0, z: 0 } })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putDown', reason: 'burntAway' }])
})

test('secondCloth_onAWorkingHeater_charsWhileTheFirstStaysWhole', () => {
  const session = new TestTeaSession(withASecondCloth(testCatalog()))
  session.do({ type: 'placeOnHeater', itemId: 'cloth2' })
  session.do({ type: 'switchHeaterOn' })

  session.wait(15)

  assertNear(session.cloth('cloth2').charring, 0.5)
  assert.equal(session.cloth('cloth').charring, 0)
})

test('secondCloth_takenOffTheHeaterBurning_isNamedInTheEvent', () => {
  const session = new TestTeaSession(withASecondCloth(testCatalog()))
  session.do({ type: 'placeOnHeater', itemId: 'cloth2' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(30)

  const events = session.do({ type: 'pickUp', itemId: 'cloth2' })

  assert.deepEqual(eventsOfType(events, 'clothTakenOffTheHeater').map((event) => event.clothId), ['cloth2'])
})

function sessionWithACrumbledSpoon(): TestTeaSession {
  const session = sessionWithTheSpoonOnAWorkingHeater()
  session.wait(17)
  session.do({ type: 'pickUp', itemId: 'spoon' })
  return session
}

function sessionWithTheSpoonOnAWorkingHeater(): TestTeaSession {
  const session = new TestTeaSession()
  session.putOnTheWorkingHeater('spoon')
  return session
}
