import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

function ritualWithTeaInCups(steepSeconds: number, cupIds = ['cup1', 'cup2']): TestRitual {
  const ritual = TestRitual.begun(testCatalog({ cup: 0.02 }))
  ritual.heatKettleTo(80)
  ritual.addLeavesToKettle(5)
  ritual.wait(steepSeconds)
  for (const cupId of cupIds) ritual.pour('kettle', cupId, 9)
  return ritual
}

test('firstSip_whenTheTeaIsGood_pleasesTheGods', () => {
  const ritual = ritualWithTeaInCups(60)
  ritual.waitUntilCupCoolsTo('cup1', 60)

  const events = ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.deepEqual(eventsOfType(events, 'godsMoodChanged'), [
    { type: 'godsMoodChanged', delta: 4, satisfaction: 57, remark: 'pleasedWithTheTea' },
  ])
})

test('firstSip_whenTooHot_waitsForItToCoolAndLeavesTheGodsForLater', () => {
  const ritual = ritualWithTeaInCups(60, ['cup1'])

  const tooHotEvents = ritual.do({ type: 'tasteCup', cupId: 'cup1' })
  ritual.waitUntilCupCoolsTo('cup1', 60)
  const laterEvents = ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.equal(eventsOfType(tooHotEvents, 'teaTasted')[0]?.verdict.reaction, 'waitsForItToCool')
  assert.deepEqual(eventsOfType(tooHotEvents, 'godsMoodChanged'), [])
  assert.equal(eventsOfType(laterEvents, 'godsMoodChanged')[0]?.remark, 'pleasedWithTheTea')
})

test('firstSip_whenTheTeaIsVeryOverbrewed_costsTheGodsTwoPoints', () => {
  const ritual = ritualWithTeaInCups(300)
  ritual.waitUntilCupCoolsTo('cup1', 60)

  const events = ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.deepEqual(eventsOfType(events, 'godsMoodChanged'), [
    { type: 'godsMoodChanged', delta: -2, satisfaction: 51, remark: 'veryOverbrewed' },
  ])
})

test('secondSip_whateverItTastesLike_leavesTheGodsAlone', () => {
  const ritual = ritualWithTeaInCups(60)
  ritual.waitUntilCupCoolsTo('cup1', 60)
  ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  const events = ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.deepEqual(eventsOfType(events, 'godsMoodChanged'), [])
})

test('sip_takesTwentyMillilitresFromTheCup', () => {
  const ritual = ritualWithTeaInCups(60)

  ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  assertNear(ritual.vessel('cup1').liquid.volumeMl, 70)
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

test('figurine_whenOfferedATeaItLikesAtItsPreferredStrength_glowsAndPleasesTheGods', () => {
  const ritual = ritualWithTeaInCups(60)

  const events = ritual.do({ type: 'offerCup', cupId: 'cup1', figurineId: 'toad' })

  assert.deepEqual(eventsOfType(events, 'figurineAcceptedTea'), [
    { type: 'figurineAcceptedTea', figurineId: 'toad', response: 'glow' },
  ])
  assert.deepEqual(eventsOfType(events, 'godsMoodChanged'), [
    { type: 'godsMoodChanged', delta: 6, satisfaction: 59, remark: 'acceptTheOffering' },
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
