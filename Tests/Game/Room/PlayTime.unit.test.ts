import assert from 'node:assert/strict'
import test from 'node:test'
import { PlayTime, playTimeShownFor, type FrameCircumstances } from '../../../Apps/Game/Room/PlayTime.ts'

const playing: FrameCircumstances = { isThePageShown: true, hasTheKeeperDied: false }

test('playTime_whenARoomOpensAfterEarlierVisits_addsOnToTheirTime', () => {
  const playTime = playTimeAfterEarlierVisitsOf(120)

  drawFrames(playTime, 30, 1, playing)

  assert.equal(playTime.seconds, 150)
})

test('playTime_whileThePageIsHidden_doesNotGrow', () => {
  const playTime = playTimeAfterEarlierVisitsOf(0)

  drawFrames(playTime, 30, 1, { isThePageShown: false, hasTheKeeperDied: false })

  assert.equal(playTime.seconds, 0)
})

test('playTime_onTheScreenAfterTheKeeperDied_doesNotGrow', () => {
  const playTime = playTimeAfterEarlierVisitsOf(0)

  drawFrames(playTime, 30, 1, { isThePageShown: true, hasTheKeeperDied: true })

  assert.equal(playTime.seconds, 0)
})

test('playTime_afterAFrameThatCameAMinuteLate_countsOneSecondOfIt', () => {
  const playTime = playTimeAfterEarlierVisitsOf(0)

  playTime.frameDrawn(60, playing)

  assert.equal(playTime.seconds, 1)
})

test('playTime_afterTenSecondsOfPlay_isKeptForTheNextVisit', () => {
  const kept: number[] = []
  const playTime = new PlayTime({ load: () => 5, keep: (seconds) => kept.push(seconds) }, () => {})

  drawFrames(playTime, 10, 1, playing)

  assert.deepEqual(kept, [15])
})

test('playTimeShown_underAMinute_saysLessThanAMinute', () => {
  assert.deepEqual(playTimeShownFor(59), { kind: 'underAMinute' })
})

test('playTimeShown_underAnHour_isInWholeMinutes', () => {
  assert.deepEqual(playTimeShownFor(3599), { kind: 'minutes', minutes: 59 })
})

test('playTimeShown_fromAnHour_isInHoursAndMinutes', () => {
  assert.deepEqual(playTimeShownFor(7505), { kind: 'hoursAndMinutes', hours: 2, minutes: 5 })
})

function playTimeAfterEarlierVisitsOf(seconds: number): PlayTime {
  return new PlayTime({ load: () => seconds, keep: () => {} }, () => {})
}

function drawFrames(playTime: PlayTime, count: number, seconds: number, circumstances: FrameCircumstances): void {
  for (let frame = 0; frame < count; frame += 1) playTime.frameDrawn(seconds, circumstances)
}
