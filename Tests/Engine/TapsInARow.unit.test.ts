import assert from 'node:assert/strict'
import test from 'node:test'
import { TapsInARow } from '../../Apps/Engine/TapsInARow.ts'

test('tapsInARow_onTheSameThingUpToTheCount_areReachedOnTheLastTapAndStartAgain', () => {
  const taps = new TapsInARow('on a bush', 3, () => {})

  const counts = [1, 2, 3, 4].map(() => taps.countTapOn('bush'))

  assert.deepEqual(counts, [{ count: 1, isReached: false }, { count: 2, isReached: false }, { count: 3, isReached: true }, { count: 1, isReached: false }])
})

test('tapsInARow_onAnotherThing_countFromOne', () => {
  const taps = new TapsInARow('on a bush', 3, () => {})
  taps.countTapOn('bush')

  assert.deepEqual(taps.countTapOn('rose'), { count: 1, isReached: false })
})

test('tapsInARow_startedAgainAfterAnotherTap_logTheCountTheyLost', () => {
  const lines: string[] = []
  const taps = new TapsInARow('on a bush', 3, (line) => lines.push(line))
  taps.countTapOn('bush')
  taps.countTapOn('bush')

  taps.startAgainAfterAnotherTap()

  assert.deepEqual([lines, taps.isCounting('bush')], [['another tap after 2 taps on a bush starts the count again'], false])
})
