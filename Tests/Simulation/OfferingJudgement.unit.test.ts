import assert from 'node:assert/strict'
import test from 'node:test'
import { judgeOffering } from '../../Shared/Simulation/Judgement/OfferingJudgement.ts'
import { water } from '../../Shared/Simulation/Physics/Liquid.ts'
import { testCatalog } from '../Support/TestCatalog.ts'

test('offering_ofPlainWater_earnsOnePointAndBarelyAResponse', () => {
  const toad = testCatalog().figurines['toad']
  if (toad === undefined) throw new Error('the test catalog lost its toad')

  const offering = judgeOffering(water(90, 60), [], toad)

  assert.deepEqual(offering, { satisfactionDelta: 1, response: 'barely' })
})
