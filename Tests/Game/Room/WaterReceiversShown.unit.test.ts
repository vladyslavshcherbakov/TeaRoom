import assert from 'node:assert/strict'
import test from 'node:test'
import { WaterReceiversShown } from '../../../Apps/Game/Room/WaterReceiversShown.ts'
import type { WorldViewState } from '../../../Apps/Game/Presentation/WorldViewState.ts'

const halfASecondToLand = [{ itemId: 'cloth', secondsWaterTakesToLand: 0.5 }]

test('cloth_whileTheTapWaterStillFallsTowardsIt_isShownAsCharredAsItWas', () => {
  const shown = new WaterReceiversShown()
  shown.viewAfterAFrame(viewWithTheClothCharred(1), [], 10)

  const view = shown.viewAfterAFrame(viewWithTheClothCharred(0.9), halfASecondToLand, 10.4)

  assert.equal(view.charringByItem['cloth']?.charring, 1)
})

test('cloth_whenTheTapWaterHasReachedIt_isShownAsCharredAsTheWaterLeftIt', () => {
  const shown = new WaterReceiversShown()
  shown.viewAfterAFrame(viewWithTheClothCharred(1), [], 10)
  shown.viewAfterAFrame(viewWithTheClothCharred(0.9), halfASecondToLand, 10.5)

  const view = shown.viewAfterAFrame(viewWithTheClothCharred(0.8), halfASecondToLand, 11)

  assert.equal(view.charringByItem['cloth']?.charring, 0.9)
})

test('otherItems_whileTheTapWaterFallsOnTheCloth_areShownAsTheyAre', () => {
  const shown = new WaterReceiversShown()
  shown.viewAfterAFrame(viewWithTheClothCharred(1, 1), [], 10)

  const view = shown.viewAfterAFrame(viewWithTheClothCharred(0.9, 0.5), halfASecondToLand, 10.4)

  assert.equal(view.charringByItem['bowl1']?.charring, 0.5)
})

function viewWithTheClothCharred(clothCharring: number, bowlCharring = 0): WorldViewState {
  return {
    vessels: {},
    isHeaterOn: false,
    thermostat: { targetC: 90, isOn: false },
    looseLeavesByItem: {},
    cloths: { cloth: { wetShare: 1, teaStain: 0 } },
    charringByItem: { cloth: { charring: clothCharring, heating: 'none' }, bowl1: { charring: bowlCharring, heating: 'none' } },
    puddles: [],
  }
}
