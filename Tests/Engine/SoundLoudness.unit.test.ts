import assert from 'node:assert/strict'
import test from 'node:test'
import { shareOfEverySoundsLoudnessBySetting, soundLoudnesses } from '../../Apps/Engine/Audio/SoundLoudness.ts'

test('soundLoudness_fromFullToOff_playsEverySoundAtItsOwnLoudnessThenQuieterAtEveryStepThenNotAtAll', () => {
  const shares = soundLoudnesses.map((loudness) => shareOfEverySoundsLoudnessBySetting[loudness])

  assert.deepEqual(shares, [1, 0.5, 0.25, 0])
})
