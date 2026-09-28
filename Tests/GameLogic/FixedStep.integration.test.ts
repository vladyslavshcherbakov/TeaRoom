import assert from 'node:assert/strict'
import test from 'node:test'
import { testCatalog } from '../Support/TestCatalog.ts'
import { sessionWithTheKettleOnTheWorkingHeater, TestTeaSession } from '../Support/TestTeaSession.ts'

const spotBesideTheTable = { placeId: 'table', x: -1, y: 0, z: 0 }

test('gameLogic_whenPlayedAt30And60FramesPerSecond_endsInTheSameState', () => {
  const catalog = testCatalog({ kettle: 0.01, cup: 0.02 })
  const at30 = sessionWithTheKettleOnTheWorkingHeater(new TestTeaSession(catalog))
  const at60 = sessionWithTheKettleOnTheWorkingHeater(new TestTeaSession(catalog))

  for (const [session, framesPerSecond] of [[at30, 30], [at60, 60]] as const) {
    for (let frame = 0; frame < 12 * framesPerSecond; frame += 1) session.wait(1 / framesPerSecond)
    session.do({ type: 'pickUp', itemId: 'kettle' })
    session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })
    session.do({ type: 'adjustPour', tiltDegrees: 30, streamOnTargetFraction: 0.9, missedStreamLandsAt: spotBesideTheTable })
    for (let frame = 0; frame < 6 * framesPerSecond; frame += 1) session.wait(1 / framesPerSecond)
  }

  assert.deepEqual(at30.state, at60.state)
})
