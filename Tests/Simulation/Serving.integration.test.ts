import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

test('sip_ofPlainWater_tastesOfNoTea', () => {
  const ritual = TestRitual.begun(testCatalog({ cup: 0.02 }))
  ritual.heatKettleTo(80)
  ritual.pour('kettle', 'cup1', 9)
  ritual.waitUntilCupCoolsTo('cup1', 60)

  const events = ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.verdict.strength, 'none')
})

test('sip_whenAboveNinetyThreeDegrees_waitsForItToCoolAndIsEnjoyedLater', () => {
  const ritual = ritualWithTeaBoiledAgainInCup1()

  const tooHotEvents = ritual.do({ type: 'tasteCup', cupId: 'cup1' })
  ritual.waitUntilCupCoolsTo('cup1', 60)
  const laterEvents = ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.equal(eventsOfType(tooHotEvents, 'teaTasted')[0]?.verdict.reaction, 'waitsForItToCool')
  assert.equal(eventsOfType(laterEvents, 'teaTasted')[0]?.verdict.reaction, 'contentSigh')
})

test('sip_atNinetyThreeDegrees_isNoLongerTooHot', () => {
  const ritual = ritualWithTeaBoiledAgainInCup1()
  ritual.waitUntilCupCoolsTo('cup1', 93)

  const events = ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.verdict.temperature, 'pleasant')
})

test('sip_takesFortyMillilitresFromTheCup', () => {
  const ritual = ritualWithTeaInCups(60)

  ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  assertNear(ritual.vessel('cup1').liquid.volumeMl, 50)
})

test('tasting_anEmptyCup_isRefused', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'tasteCup', cupId: 'cup3' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tasteCup', reason: 'cupIsEmpty' }])
})

test('tasting_fromTheKettle_isRefused', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'tasteCup', cupId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tasteCup', reason: 'notDrinkable' }])
})

test('figurine_whenOfferedATeaItLikesAtItsPreferredStrength_glows', () => {
  const ritual = ritualWithTeaInCups(60)

  const events = ritual.do({ type: 'offerCup', cupId: 'cup1', figurineId: 'toad' })

  assert.deepEqual(eventsOfType(events, 'figurineAcceptedTea'), [
    { type: 'figurineAcceptedTea', figurineId: 'toad', response: 'glow' },
  ])
})

test('figurine_whenOfferedATeaItIsIndifferentTo_respondsSubtly', () => {
  const ritual = ritualWithTeaInCups(60)

  const events = ritual.do({ type: 'offerCup', cupId: 'cup1', figurineId: 'dragon' })

  assert.equal(eventsOfType(events, 'figurineAcceptedTea')[0]?.response, 'subtle')
})

test('figurine_whenOfferedBitterOverbrewedTea_barelyResponds', () => {
  const ritual = ritualWithTeaInCups(300)

  const events = ritual.do({ type: 'offerCup', cupId: 'cup1', figurineId: 'toad' })

  assert.equal(eventsOfType(events, 'figurineAcceptedTea')[0]?.response, 'barely')
})

test('figurine_whenOfferedTwiceInOneRitual_refusesTheSecondCup', () => {
  const ritual = ritualWithTeaInCups(60)
  ritual.do({ type: 'offerCup', cupId: 'cup1', figurineId: 'toad' })

  const events = ritual.do({ type: 'offerCup', cupId: 'cup2', figurineId: 'toad' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'offerCup', reason: 'figurineAlreadyOffered' }])
  assertNear(ritual.vessel('cup2').liquid.volumeMl, 90)
})

test('offering_emptiesTheWholeCupIntoTheSaucer', () => {
  const ritual = ritualWithTeaInCups(60)

  ritual.do({ type: 'offerCup', cupId: 'cup1', figurineId: 'dragon' })

  assert.equal(ritual.vessel('cup1').liquid.volumeMl, 0)
})

test('keeper_whenSippingTeaOfExtremeStrengthStraightFromTheCaddy_dies', () => {
  const ritual = TestRitual.begun()
  ritual.heatKettleTo(80)
  ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })
  ritual.pour('kettle', 'caddy', 10)
  ritual.wait(10)

  const events = ritual.do({ type: 'tasteCup', cupId: 'caddy' })

  assert.deepEqual(eventsOfType(events, 'keeperDied'), [{ type: 'keeperDied', cupId: 'caddy' }])
})

test('keeper_whenSippingTheCaddysTeaFromABowl_lives', () => {
  const ritual = TestRitual.begun()
  ritual.heatKettleTo(80)
  ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })
  ritual.pour('kettle', 'caddy', 10)
  ritual.wait(10)
  ritual.pour('caddy', 'cup1', 3)

  const events = ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.verdict.strength, 'extreme')
  assert.deepEqual(eventsOfType(events, 'keeperDied'), [])
})

function ritualWithTeaInCups(steepSeconds: number, cupIds = ['cup1', 'cup2']): TestRitual {
  const ritual = TestRitual.begun(testCatalog({ cup: 0.02 }))
  ritual.heatKettleTo(80)
  ritual.addLeavesToKettle(5)
  ritual.wait(steepSeconds)
  for (const cupId of cupIds) ritual.pour('kettle', cupId, 9)
  return ritual
}

function ritualWithTeaBoiledAgainInCup1(): TestRitual {
  const ritual = ritualWithTeaInCups(60, [])
  ritual.heatKettleTo(100)
  ritual.pour('kettle', 'cup1', 9)
  return ritual
}
