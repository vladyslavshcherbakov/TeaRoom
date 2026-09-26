import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, withASecondCloth } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

test('cloth_onAWorkingHeater_charsThroughInAMinute', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(30)

  assertNear(ritual.cloth().charring, 0.5)
})

test('cloth_wetOnAWorkingHeater_steamsDryBeforeItChars', () => {
  const ritual = new TestRitual()
  ritual.pour('kettle', null, 2.5)
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(1)

  assert.equal(ritual.cloth().charring, 0)
})

test('cloth_whenTakenOffTheHeater_saysHowCharredItIs', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(30)

  const events = ritual.do({ type: 'pickUp', itemId: 'cloth' })

  assertNear(eventsOfType(events, 'clothTakenOffTheHeater')[0]?.charring ?? 0, 0.5)
})

test('cloth_onAHeaterThatIsOff_doesNotChar', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })

  ritual.wait(30)

  assert.equal(ritual.cloth().charring, 0)
})

test('charredCloth_whenWashedUnderTheTap_isAsGoodAsNew', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(60)
  ritual.do({ type: 'switchHeaterOff' })
  ritual.do({ type: 'pickUp', itemId: 'cloth' })

  ritual.do({ type: 'putInTheSink', itemId: 'cloth' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(5)

  assert.equal(ritual.cloth().charring, 0)
})

test('washedBurntCloth_whenTakenOutOfTheSink_isNoticedAsNew', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(10)
  ritual.do({ type: 'switchHeaterOff' })
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'putInTheSink', itemId: 'cloth' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(5)

  const events = ritual.do({ type: 'pickUp', itemId: 'cloth' })

  assert.deepEqual(eventsOfType(events, 'burntClothWashedBackToNew'), [{ type: 'burntClothWashedBackToNew', clothId: 'cloth' }])
})

test('clothThatNeverBurnt_whenTakenOutOfTheSink_isNotRemarkedOn', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'putInTheSink', itemId: 'cloth' })
  ritual.wait(5)

  const events = ritual.do({ type: 'pickUp', itemId: 'cloth' })

  assert.deepEqual(eventsOfType(events, 'burntClothWashedBackToNew'), [])
})

test('spoon_onAWorkingHeater_charsThroughInTwentySeconds', () => {
  const ritual = ritualWithTheSpoonOnAWorkingHeater()

  ritual.wait(10)

  assertNear(ritual.state.spoon.charring, 0.5)
})

test('spoon_onAHeaterThatIsOff_doesNotChar', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'spoon' })

  ritual.wait(30)

  assert.equal(ritual.state.spoon.charring, 0)
})

test('spoon_whenTakenBeforeItBurns_isSaved', () => {
  const ritual = ritualWithTheSpoonOnAWorkingHeater()
  ritual.wait(10)

  ritual.do({ type: 'pickUp', itemId: 'spoon' })

  assert.deepEqual(ritual.state.spoon.location, { kind: 'inHand', handIndex: 0 })
})

test('spoon_takenBeforeItBurns_staysAsCharredAsItWas', () => {
  const ritual = ritualWithTheSpoonOnAWorkingHeater()
  ritual.wait(10)
  ritual.do({ type: 'pickUp', itemId: 'spoon' })

  ritual.wait(10)

  assertNear(ritual.state.spoon.charring, 0.5)
})

test('spoon_whenTakenWhileItBurns_crumblesWithTheLeavesOnIt', () => {
  const ritual = new TestRitual()
  ritual.tipASpoonOfLeavesInto('cup1')
  ritual.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })
  ritual.do({ type: 'placeOnHeater', itemId: 'spoon' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(17)

  const events = ritual.do({ type: 'pickUp', itemId: 'spoon' })

  assert.deepEqual(eventsOfType(events, 'spoonCrumbled'), [{ type: 'spoonCrumbled', gramsLost: 5 }])
  assert.deepEqual(ritual.state.spoon.location, { kind: 'gone' })
  assert.deepEqual(ritual.state.keeper.hands, [null, null, null])
  assert.equal(ritual.state.heater.itemIdOnTop, null)
})

test('spoon_afterItCrumbled_cannotBeTaken', () => {
  const ritual = ritualWithACrumbledSpoon()

  const events = ritual.do({ type: 'pickUp', itemId: 'spoon' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUp', reason: 'burntAway' }])
})

test('spoon_afterItCrumbled_cannotScoop', () => {
  const ritual = ritualWithACrumbledSpoon()

  const events = ritual.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'scoopTea', reason: 'burntAway' }])
})

test('spoon_afterItCrumbled_cannotTipLeaves', () => {
  const ritual = ritualWithACrumbledSpoon()

  const events = ritual.do({ type: 'tipSpoonInto', vesselId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tipSpoonInto', reason: 'burntAway' }])
})

test('spoon_afterItCrumbled_cannotBePutDown', () => {
  const ritual = ritualWithACrumbledSpoon()

  const events = ritual.do({ type: 'putDown', itemId: 'spoon', spot: { placeId: 'table', x: 7, y: 0, z: 0 } })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putDown', reason: 'burntAway' }])
})

test('secondCloth_onAWorkingHeater_charsWhileTheFirstStaysWhole', () => {
  const ritual = new TestRitual(withASecondCloth(testCatalog()))
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth2' })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(30)

  assertNear(ritual.cloth('cloth2').charring, 0.5)
  assert.equal(ritual.cloth('cloth').charring, 0)
})

test('secondCloth_takenOffTheHeaterBurning_isNamedInTheEvent', () => {
  const ritual = new TestRitual(withASecondCloth(testCatalog()))
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth2' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(30)

  const events = ritual.do({ type: 'pickUp', itemId: 'cloth2' })

  assert.deepEqual(eventsOfType(events, 'clothTakenOffTheHeater').map((event) => event.clothId), ['cloth2'])
})

function ritualWithACrumbledSpoon(): TestRitual {
  const ritual = ritualWithTheSpoonOnAWorkingHeater()
  ritual.wait(17)
  ritual.do({ type: 'pickUp', itemId: 'spoon' })
  return ritual
}

function ritualWithTheSpoonOnAWorkingHeater(): TestRitual {
  const ritual = new TestRitual()
  ritual.putOnTheWorkingHeater('spoon')
  return ritual
}
