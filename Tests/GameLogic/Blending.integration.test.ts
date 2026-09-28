import assert from 'node:assert/strict'
import test from 'node:test'
import { shareOfTheStrengthByTeaId } from '../../Shared/GameLogic/Chemistry/Liquid.ts'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, withMoreCaddies } from '../Support/TestCatalog.ts'
import { eventsOfType, TestTeaSession } from '../Support/TestTeaSession.ts'

const catalogOfTwoTeas = withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack' })

test('leaves_steepingInWater_creditTheStrengthTheyGiveToTheirTea', () => {
  const session = new TestTeaSession(catalogOfTwoTeas)
  session.heatKettleTo(80)
  session.pour('kettle', 'cup1', 5)
  session.tipASpoonOfLeavesInto('cup1', 'blackCaddy')

  session.wait(30)

  const tea = session.vessel('cup1').liquid
  assert.deepEqual(Object.keys(tea.strengthByTeaId), ['testBlack'])
  assertNear(tea.strengthByTeaId['testBlack'] ?? 0, tea.strength)
})

test('leaves_whenTheirVesselIsPouredFrom_stayInItAndOnlyTheTeaGoes', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  session.addLeavesToKettle(5)
  session.wait(60)

  session.pour('kettle', 'cup1', 5)

  assert.deepEqual(session.vessel('kettle').leaves?.gramsByTeaId, { testGreen: 5 })
  assert.equal(session.vessel('cup1').leaves, null)
  assert.deepEqual(shareOfTheStrengthByTeaId(session.vessel('cup1').liquid), { testGreen: 1 })
})

test('tea_pouredIntoAsMuchPlainWater_hasHalfItsStrengthAndStaysOfItsOneTea', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  session.pour('kettle', 'cup2', 2.5)
  session.addLeavesToKettle(5)
  session.wait(60)
  session.pour('kettle', 'cup1', 5)
  const strengthOfTheTea = session.vessel('cup1').liquid.strength

  session.pour('cup1', 'cup2', 5)

  const dilutedTea = session.vessel('cup2').liquid
  assertNear(dilutedTea.volumeMl, 50)
  assertNear(dilutedTea.strength, strengthOfTheTea / 2)
  assert.deepEqual(shareOfTheStrengthByTeaId(dilutedTea), { testGreen: 1 })
})

test('leaves_ofTwoTeasSteepingInOneBowl_eachGiveStrengthAtTheirOwnRate', () => {
  const session = new TestTeaSession(withMoreCaddies(testCatalog(), { oolongCaddy: 'testOolong' }))
  session.heatKettleTo(80)
  session.pour('kettle', 'cup1', 5)
  session.tipASpoonOfLeavesInto('cup1')
  session.tipASpoonOfLeavesInto('cup1', 'oolongCaddy')

  session.wait(10)

  const shares = shareOfTheStrengthByTeaId(session.vessel('cup1').liquid)
  assertNear(shares['testGreen'] ?? 0, 1 / 3)
  assertNear(shares['testOolong'] ?? 0, 2 / 3)
})

test('sip_ofWhiteAndBlackLeavesSteepedTogetherToStrength60_isBalancedForTheirBlend', () => {
  const session = new TestTeaSession(withMoreCaddies(testCatalog(), { whiteCaddy: 'testWhite', blackCaddy: 'testBlack' }))
  session.heatKettleTo(80)
  session.pour('kettle', 'cup1', 5)
  session.tipASpoonOfLeavesInto('cup1', 'whiteCaddy')
  session.tipASpoonOfLeavesInto('cup1', 'blackCaddy')
  session.waitUntil(() => session.vessel('cup1').liquid.strength >= 60)

  const events = session.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.verdict.strength, 'balanced')
})

test('teas_ofEqualStrengthPouredTogether_eachGiveHalfTheStrength', () => {
  const session = new TestTeaSession(catalogOfTwoTeas)

  session.mixInTheThermos(['caddy', 'blackCaddy'])

  const shares = shareOfTheStrengthByTeaId(session.vessel('thermos').liquid)
  assertNear(shares['testGreen'] ?? 0, 0.5)
  assertNear(shares['testBlack'] ?? 0, 0.5)
})

test('mixture_whenPartOfItIsPouredOut_keepsItsBlend', () => {
  const session = new TestTeaSession(catalogOfTwoTeas)
  session.mixInTheThermos(['caddy', 'blackCaddy'])

  session.pour('thermos', 'cup3', 4)

  const shares = shareOfTheStrengthByTeaId(session.vessel('cup3').liquid)
  assertNear(session.vessel('cup3').liquid.volumeMl, 40)
  assertNear(shares['testGreen'] ?? 0, 0.5)
  assertNear(shares['testBlack'] ?? 0, 0.5)
})

test('sip_ofTwoTeasMixedHalfAndHalf_isJudgedAgainstTheAverageOfTheirBalancedStrengths', () => {
  const session = new TestTeaSession(catalogOfTwoTeas)
  session.mixInTheThermos(['caddy', 'blackCaddy'])
  session.pour('thermos', 'cup3', 4)

  const events = session.do({ type: 'tasteCup', cupId: 'cup3' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.verdict.strength, 'balanced')
})

test('sip_ofTheSecondTeaAloneBrewedTheSameWay_tastesWeak', () => {
  const session = new TestTeaSession(catalogOfTwoTeas)
  session.mixInTheThermos(['blackCaddy'])
  session.pour('thermos', 'cup3', 4)

  const events = session.do({ type: 'tasteCup', cupId: 'cup3' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.verdict.strength, 'weak')
})

test('figurine_offeredHalfATeaItLikesAndHalfATeaItIsIndifferentTo_respondsSubtly', () => {
  const session = new TestTeaSession(catalogOfTwoTeas)
  session.mixInTheThermos(['caddy', 'blackCaddy'])
  session.pour('thermos', 'cup3', 4)

  const events = session.do({ type: 'offerCup', cupId: 'cup3', figurineId: 'toad' })

  assert.deepEqual(eventsOfType(events, 'figurineAcceptedTea'), [{ type: 'figurineAcceptedTea', figurineId: 'toad', response: 'subtle' }])
})
