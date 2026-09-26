import assert from 'node:assert/strict'
import test from 'node:test'
import { shareOfTheStrengthByTeaId } from '../../Shared/Simulation/Physics/Liquid.ts'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, withMoreCaddies } from '../Support/TestCatalog.ts'
import { TestRitual } from '../Support/TestRitual.ts'

const catalogOfTwoTeas = withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack' })

test('leaves_steepingInWater_creditTheStrengthTheyGiveToTheirTea', () => {
  const ritual = TestRitual.begun(catalogOfTwoTeas)
  ritual.heatKettleTo(80)
  ritual.pour('kettle', 'cup1', 5)
  ritual.tipASpoonOfLeavesInto('cup1', 'blackCaddy')

  ritual.wait(30)

  const tea = ritual.vessel('cup1').liquid
  assert.deepEqual(Object.keys(tea.strengthByTeaId), ['testBlack'])
  assertNear(tea.strengthByTeaId['testBlack'] ?? 0, tea.strength)
})

test('leaves_whenTheirVesselIsPouredFrom_stayInItAndOnlyTheTeaGoes', () => {
  const ritual = TestRitual.begun()
  ritual.heatKettleTo(80)
  ritual.addLeavesToKettle(5)
  ritual.wait(60)

  ritual.pour('kettle', 'cup1', 5)

  assert.equal(ritual.vessel('kettle').leaves?.grams, 5)
  assert.equal(ritual.vessel('cup1').leaves, null)
  assert.deepEqual(shareOfTheStrengthByTeaId(ritual.vessel('cup1').liquid), { testGreen: 1 })
})

test('tea_pouredIntoAsMuchPlainWater_hasHalfItsStrengthAndStaysOfItsOneTea', () => {
  const ritual = TestRitual.begun()
  ritual.heatKettleTo(80)
  ritual.pour('kettle', 'cup2', 2.5)
  ritual.addLeavesToKettle(5)
  ritual.wait(60)
  ritual.pour('kettle', 'cup1', 5)
  const strengthOfTheTea = ritual.vessel('cup1').liquid.strength

  ritual.pour('cup1', 'cup2', 5)

  const dilutedTea = ritual.vessel('cup2').liquid
  assertNear(dilutedTea.volumeMl, 50)
  assertNear(dilutedTea.strength, strengthOfTheTea / 2)
  assert.deepEqual(shareOfTheStrengthByTeaId(dilutedTea), { testGreen: 1 })
})

test('teas_ofEqualStrengthPouredTogether_eachGiveHalfTheStrength', () => {
  const ritual = TestRitual.begun(catalogOfTwoTeas)

  ritual.mixInTheThermos(['caddy', 'blackCaddy'])

  const shares = shareOfTheStrengthByTeaId(ritual.vessel('thermos').liquid)
  assertNear(shares['testGreen'] ?? 0, 0.5)
  assertNear(shares['testBlack'] ?? 0, 0.5)
})

test('mixture_whenPartOfItIsPouredOut_keepsItsBlend', () => {
  const ritual = TestRitual.begun(catalogOfTwoTeas)
  ritual.mixInTheThermos(['caddy', 'blackCaddy'])

  ritual.pour('thermos', 'cup3', 4)

  const shares = shareOfTheStrengthByTeaId(ritual.vessel('cup3').liquid)
  assertNear(ritual.vessel('cup3').liquid.volumeMl, 40)
  assertNear(shares['testGreen'] ?? 0, 0.5)
  assertNear(shares['testBlack'] ?? 0, 0.5)
})
