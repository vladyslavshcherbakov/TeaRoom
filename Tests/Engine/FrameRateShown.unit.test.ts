import assert from 'node:assert/strict'
import test from 'node:test'
import { FrameRateShown } from '../../Apps/Engine/FrameRateShown.ts'

const framesInHalfASecondAtEightFramesASecond = 4

test('frameRate_whenShownAgainWhileItIsShown_keepsItsReading', () => {
  const frameRate = new FrameRateShown()
  frameRate.show(true)
  for (let frame = 0; frame < framesInHalfASecondAtEightFramesASecond; frame += 1) frameRate.frameDrawn(1 / 8)

  frameRate.show(true)

  assert.equal(frameRate.reading, 8)
})

test('frameRate_whenHidden_hasNoReading', () => {
  const frameRate = new FrameRateShown()
  frameRate.show(true)
  for (let frame = 0; frame < framesInHalfASecondAtEightFramesASecond; frame += 1) frameRate.frameDrawn(1 / 8)

  frameRate.show(false)

  assert.deepEqual([frameRate.isShown, frameRate.reading], [false, null])
})
