import assert from 'node:assert/strict'
import test from 'node:test'
import { definitionIn } from '../../Shared/Engine/Catalog.ts'
import type { TeaDefinition } from '../../Shared/GameLogic/Definitions/TeaDefinition.ts'
import { steepLeaves, type Leaves } from '../../Shared/GameLogic/Chemistry/Brewing.ts'
import { water } from '../../Shared/GameLogic/Chemistry/Liquid.ts'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog } from '../Support/TestCatalog.ts'

const catalog = testCatalog()

test('bitterness_aSecondBeforeTheTeasIdealTime_growsByItsBitternessPerSecond', () => {
  const steeped = steepLeaves(water(100, 80), leavesSteepedFor({ testGreen: 59 }), teaOf, 1)

  assertNear(steeped.liquid.bitterness, 0.1)
})

test('bitterness_fromTheTeasIdealTime_growsFourTimesAsFastByItsMultiplier', () => {
  const steeped = steepLeaves(water(100, 80), leavesSteepedFor({ testGreen: 60 }), teaOf, 1)

  assertNear(steeped.liquid.bitterness, 0.4)
})

test('bitterness_inWaterFiveDegreesAboveTheGoodRange_growsAQuarterFasterThanTheHeatAloneMakesIt', () => {
  const steeped = steepLeaves(water(100, 90), leavesSteepedFor({ testGreen: 0 }), teaOf, 32)

  assertNear(steeped.liquid.bitterness, 5)
})

test('bitterness_ofTwoTeasSteepedForAMinuteInOneVessel_growsFourTimesAsFastOnlyForTheTeaWhoseIdealTimeHasCome', () => {
  const steeped = steepLeaves(water(100, 80), leavesSteepedFor({ testGreen: 60, testOolong: 60 }), teaOf, 1)

  assertNear(steeped.liquid.bitterness, 0.5)
})

test('leaves_ofTwoTeasSteepedForDifferentTimes_eachSteepOnFromTheirOwnTime', () => {
  const steeped = steepLeaves(water(100, 80), leavesSteepedFor({ testGreen: 60, testOolong: 0 }), teaOf, 10)

  assert.deepEqual(steeped.leaves.steepedSecondsByTeaId, { testGreen: 70, testOolong: 10 })
})

test('leaves_inWaterAtFortyDegrees_giveNoStrength', () => {
  const steeped = steepLeaves(water(100, 40), leavesSteepedFor({ testGreen: 0 }), teaOf, 10)

  assert.equal(steeped.liquid.strength, 0)
})

function leavesSteepedFor(steepedSecondsByTeaId: Readonly<Record<string, number>>): Leaves {
  const aGramOfEachTea = Object.fromEntries(Object.keys(steepedSecondsByTeaId).map((teaId) => [teaId, 1]))
  return { gramsByTeaId: aGramOfEachTea, isSteeping: true, isStirredByTheBoil: false, steepedSecondsByTeaId }
}

function teaOf(teaId: string): TeaDefinition {
  return definitionIn(catalog, 'teas', teaId)
}
