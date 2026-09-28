import assert from 'node:assert/strict'
import test from 'node:test'
import { WorldTime } from '../../Apps/Engine/WorldTime.ts'

test('frame_ofATenthOfASecondOrLess_movesTheWorldAsFarAndLogsNothing', () => {
  const lines: string[] = []
  const worldTime = new WorldTime((line) => lines.push(line))

  const worldSeconds = [0.016, 0.1].map((realSeconds) => worldTime.frameDrawn(realSeconds))

  assert.deepEqual(worldSeconds, [0.016, 0.1])
  assert.deepEqual(lines, [])
})

test('stretchOfSlowFrames_whenAFastFrameEndsIt_isLoggedOnceWithTheLostSecondsAndTheFrameRate', () => {
  const lines: string[] = []
  const worldTime = new WorldTime((line) => lines.push(line))
  for (let frame = 0; frame < 4; frame += 1) worldTime.frameDrawn(0.5)

  worldTime.frameDrawn(0.016)

  assert.deepEqual(lines, ['the world fell 1.6 s behind real time over 2.0 s at 2.0 frames a second, because a frame moves it at most 0.1 s'])
})

test('stretchOfSlowFrames_whenItLastsTenSeconds_isLoggedWithoutWaitingForItsEnd', () => {
  const lines: string[] = []
  const worldTime = new WorldTime((line) => lines.push(line))

  for (let frame = 0; frame < 20; frame += 1) worldTime.frameDrawn(0.5)

  assert.deepEqual(lines, ['the world fell 8.0 s behind real time over 10.0 s at 2.0 frames a second, because a frame moves it at most 0.1 s'])
})
