import assert from 'node:assert/strict'
import test from 'node:test'
import type { FigurineDefinition } from '../../Shared/GameLogic/Definitions/FigurineDefinition.ts'
import { judgeOffering } from '../../Shared/GameLogic/Judgement/OfferingJudgement.ts'
import { blendOf } from '../../Shared/GameLogic/Judgement/TasteJudgement.ts'
import { water, type Liquid } from '../../Shared/GameLogic/Chemistry/Liquid.ts'
import { testCatalog } from '../Support/TestCatalog.ts'

test('offering_ofPlainWater_earnsOnePointAndBarelyAResponse', () => {
  const offering = judgeOffering(water(90, 60), [], figurine('toad'))

  assert.deepEqual(offering, { satisfactionDelta: 1, response: 'barely' })
})

test('offering_ofATeaTheFigurineLikesAtItsPreferredStrength_earnsTwelvePointsAndAGlow', () => {
  const offering = judgedOffering(greenTea({ strength: 55 }), 'toad')

  assert.deepEqual(offering, { satisfactionDelta: 12, response: 'glow' })
})

test('offering_ofALikedTeaAtItsPreferredStrengthButBitter_losesFourPointsAndIsSubtle', () => {
  const offering = judgedOffering(greenTea({ strength: 55, bitterness: 45 }), 'toad')

  assert.deepEqual(offering, { satisfactionDelta: 8, response: 'subtle' })
})

test('offering_ofATeaTheFigurineIsIndifferentToAboveItsPreferredStrength_earnsFourPointsAndBarelyAResponse', () => {
  const offering = judgedOffering(greenTea({ strength: 80 }), 'dragon')

  assert.deepEqual(offering, { satisfactionDelta: 4, response: 'barely' })
})

function judgedOffering(offered: Liquid, figurineId: string): ReturnType<typeof judgeOffering> {
  return judgeOffering(offered, blendOf(offered, testCatalog()), figurine(figurineId))
}

function figurine(id: string): FigurineDefinition {
  const definition = testCatalog().figurines[id]
  if (definition === undefined) throw new Error(`the test catalog lost its ${id}`)
  return definition
}

function greenTea({ strength, bitterness = 0 }: { strength: number; bitterness?: number }): Liquid {
  return { volumeMl: 90, temperatureC: 60, strength, strengthByTeaId: { testGreen: strength }, bitterness }
}
