import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, withMoreCaddies } from '../Support/TestCatalog.ts'
import { eventsOfType, TestTeaSession } from '../Support/TestTeaSession.ts'

test('sip_ofPlainWater_tastesOfNoTea', () => {
  const session = new TestTeaSession(testCatalog({ cup: 0.02 }))
  session.heatKettleTo(80)
  session.pour('kettle', 'cup1', 9)
  session.waitUntilCupCoolsTo('cup1', 60)

  const events = session.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.verdict.strength, 'none')
})

test('sip_whenAboveNinetyThreeDegrees_waitsForItToCool', () => {
  const session = sessionWithTeaBoiledAgainInCup1()

  const events = session.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.verdict.reaction, 'waitsForItToCool')
})

test('sip_ofTeaBoiledAgainOnceItCooledToSixtyDegrees_isEnjoyed', () => {
  const session = sessionWithTeaBoiledAgainInCup1()
  session.waitUntilCupCoolsTo('cup1', 60)

  const events = session.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.verdict.reaction, 'contentSigh')
})

test('sip_atNinetyThreeDegrees_isNoLongerTooHot', () => {
  const session = sessionWithTeaBoiledAgainInCup1()
  session.waitUntilCupCoolsTo('cup1', 93)

  const events = session.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.verdict.temperature, 'pleasant')
})

test('sip_takesFortyMillilitresFromTheCup', () => {
  const session = sessionWithTeaInCups(60)

  session.do({ type: 'tasteCup', cupId: 'cup1' })

  assertNear(session.vessel('cup1').liquid.volumeMl, 50)
})

test('tasting_anEmptyCup_isRefused', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'tasteCup', cupId: 'cup3' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tasteCup', reason: 'cupIsEmpty' }])
})

test('tasting_fromTheKettle_isRefused', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'tasteCup', cupId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tasteCup', reason: 'notDrinkable' }])
})

test('figurine_whenOfferedATeaItLikesAtItsPreferredStrength_glows', () => {
  const session = sessionWithTeaInCups(60)

  const events = session.do({ type: 'offerCup', cupId: 'cup1', figurineId: 'toad' })

  assert.deepEqual(eventsOfType(events, 'figurineAcceptedTea'), [
    { type: 'figurineAcceptedTea', figurineId: 'toad', response: 'glow' },
  ])
})

test('figurine_whenOfferedATeaItIsIndifferentTo_respondsSubtly', () => {
  const session = sessionWithTeaInCups(60)

  const events = session.do({ type: 'offerCup', cupId: 'cup1', figurineId: 'dragon' })

  assert.equal(eventsOfType(events, 'figurineAcceptedTea')[0]?.response, 'subtle')
})

test('figurine_whenOfferedBitterOverbrewedTea_barelyResponds', () => {
  const session = sessionWithTeaInCups(300)

  const events = session.do({ type: 'offerCup', cupId: 'cup1', figurineId: 'toad' })

  assert.equal(eventsOfType(events, 'figurineAcceptedTea')[0]?.response, 'barely')
})

test('figurine_whenOfferedTwiceInOneRitual_refusesTheSecondCup', () => {
  const session = sessionWithTeaInCups(60)
  session.do({ type: 'offerCup', cupId: 'cup1', figurineId: 'toad' })

  const events = session.do({ type: 'offerCup', cupId: 'cup2', figurineId: 'toad' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'offerCup', reason: 'figurineAlreadyOffered' }])
  assertNear(session.vessel('cup2').liquid.volumeMl, 90)
})

test('offering_toAFigurineTheRoomDoesNotHave_isRefusedAndKeepsTheTea', () => {
  const session = sessionWithTeaInCups(60)

  const events = session.do({ type: 'offerCup', cupId: 'cup1', figurineId: 'monk' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'offerCup', reason: 'unknownFigurine' }])
  assertNear(session.vessel('cup1').liquid.volumeMl, 90)
})

test('offering_emptiesTheWholeCupIntoTheSaucer', () => {
  const session = sessionWithTeaInCups(60)

  session.do({ type: 'offerCup', cupId: 'cup1', figurineId: 'dragon' })

  assert.equal(session.vessel('cup1').liquid.volumeMl, 0)
})

test('player_whenSippingTeaOfExtremeStrengthStraightFromTheCaddy_dies', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })
  session.pour('kettle', 'caddy', 10)
  session.wait(10)

  const events = session.do({ type: 'tasteCup', cupId: 'caddy' })

  assert.deepEqual(eventsOfType(events, 'playerDied'), [{ type: 'playerDied', cupId: 'caddy' }])
})

test('player_whenSippingTeaOfExtremeStrengthStraightFromASecondCaddy_dies', () => {
  const session = new TestTeaSession(withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack' }))
  session.heatKettleTo(80)
  session.do({ type: 'openVesselLid', vesselId: 'blackCaddy' })
  session.pour('kettle', 'blackCaddy', 10)
  session.wait(10)

  const events = session.do({ type: 'tasteCup', cupId: 'blackCaddy' })

  assert.deepEqual(eventsOfType(events, 'playerDied'), [{ type: 'playerDied', cupId: 'blackCaddy' }])
})

test('player_whenSippingTheCaddysTeaFromABowl_lives', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })
  session.pour('kettle', 'caddy', 10)
  session.wait(10)
  session.pour('caddy', 'cup1', 3)

  const events = session.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.verdict.strength, 'extreme')
  assert.deepEqual(eventsOfType(events, 'playerDied'), [])
})

function sessionWithTeaInCups(steepSeconds: number, cupIds = ['cup1', 'cup2']): TestTeaSession {
  const session = new TestTeaSession(testCatalog({ cup: 0.02 }))
  session.heatKettleTo(80)
  session.addLeavesToKettle(5)
  session.wait(steepSeconds)
  for (const cupId of cupIds) session.pour('kettle', cupId, 9)
  return session
}

function sessionWithTeaBoiledAgainInCup1(): TestTeaSession {
  const session = sessionWithTeaInCups(60, [])
  session.heatKettleTo(100)
  session.pour('kettle', 'cup1', 9)
  return session
}
