import assert from 'node:assert/strict'
import test from 'node:test'
import { testCatalog } from '../Support/TestCatalog.ts'
import { ritualWithTheKettleOnTheWorkingHeater, TestRitual } from '../Support/TestRitual.ts'

test('simulation_whenPlayedAt30And60FramesPerSecond_endsInTheSameState', () => {
  const catalog = testCatalog({ kettle: 0.01, cup: 0.02 })
  const at30 = ritualWithTheKettleOnTheWorkingHeater(new TestRitual(catalog))
  const at60 = ritualWithTheKettleOnTheWorkingHeater(new TestRitual(catalog))

  for (const [ritual, framesPerSecond] of [[at30, 30], [at60, 60]] as const) {
    for (let frame = 0; frame < 12 * framesPerSecond; frame += 1) ritual.wait(1 / framesPerSecond)
    ritual.do({ type: 'pickUp', itemId: 'kettle' })
    ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })
    ritual.do({ type: 'adjustPour', tiltDegrees: 30, streamOnTargetFraction: 0.9, missedStreamLandsAt: null })
    for (let frame = 0; frame < 6 * framesPerSecond; frame += 1) ritual.wait(1 / framesPerSecond)
  }

  assert.deepEqual(at30.state, at60.state)
})
