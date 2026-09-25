import assert from 'node:assert/strict'
import test from 'node:test'
import { FrameRate } from '../../../Apps/Game/Room/FrameRate.ts'

test('frameRate_beforeHalfASecondOfFrames_hasNoReading', () => {
  const frameRate = new FrameRate()

  const readings = [0.1, 0.1, 0.1, 0.1].map((seconds) => frameRate.frameDrawn(seconds))

  assert.deepEqual(readings, [null, null, null, null])
})

test('frameRate_afterHalfASecondOfTenthSecondFrames_readsTenFramesPerSecond', () => {
  const frameRate = new FrameRate()

  const readings = [0.1, 0.1, 0.1, 0.1, 0.1].map((seconds) => frameRate.frameDrawn(seconds))

  assert.equal(readings.at(-1)?.toFixed(1), '10.0')
})

test('frameRate_afterAReading_countsTheNextHalfSecondAnew', () => {
  const frameRate = new FrameRate()
  for (let frame = 0; frame < 5; frame += 1) frameRate.frameDrawn(0.1)

  const nextReadings = [0.25, 0.25].map((seconds) => frameRate.frameDrawn(seconds))

  assert.deepEqual(nextReadings, [null, 4])
})
