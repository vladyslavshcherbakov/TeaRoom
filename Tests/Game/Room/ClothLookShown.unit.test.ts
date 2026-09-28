import assert from 'node:assert/strict'
import test from 'node:test'
import { ClothLookShown } from '../../../Apps/Game/Room/ClothLookShown.ts'

const frameSeconds = 1 / 60
const dryCloth = { wetShare: 0, teaStain: 0 }
const soakedCloth = { wetShare: 1, teaStain: 0 }

test('clothLook_whenFirstShown_isAsWetAsTheClothIs', () => {
  const look = new ClothLookShown()

  const shown = look.clothsAfterAFrame({ cloth: soakedCloth }, frameSeconds)

  assert.equal(shown['cloth']?.wetShare, 1)
})

test('clothLook_whenTheClothIsSoakedAtOnce_isStillNearlyDryAFrameLater', () => {
  const look = new ClothLookShown()
  look.clothsAfterAFrame({ cloth: dryCloth }, frameSeconds)

  const shown = look.clothsAfterAFrame({ cloth: soakedCloth }, frameSeconds)

  assert.ok((shown['cloth']?.wetShare ?? 1) < 0.1, `${shown['cloth']?.wetShare} after one frame`)
})

test('clothLook_whenTheClothIsSoakedAtOnce_looksSoakedTwoSecondsLater', () => {
  const look = new ClothLookShown()
  look.clothsAfterAFrame({ cloth: dryCloth }, frameSeconds)

  for (let frame = 0; frame < 120; frame += 1) look.clothsAfterAFrame({ cloth: soakedCloth }, frameSeconds)

  assert.ok((look.clothsAfterAFrame({ cloth: soakedCloth }, 0)['cloth']?.wetShare ?? 0) > 0.95)
})

test('clothLook_whenTheTeaIsWashedOutAtOnce_losesItsStainGradually', () => {
  const look = new ClothLookShown()
  look.clothsAfterAFrame({ cloth: { wetShare: 1, teaStain: 1 } }, frameSeconds)

  const shown = look.clothsAfterAFrame({ cloth: { wetShare: 1, teaStain: 0 } }, frameSeconds)

  assert.ok((shown['cloth']?.teaStain ?? 0) > 0.9, `${shown['cloth']?.teaStain} after one frame`)
})
