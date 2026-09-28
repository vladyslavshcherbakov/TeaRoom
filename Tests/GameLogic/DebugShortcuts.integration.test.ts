import assert from 'node:assert/strict'
import test from 'node:test'
import { TestTeaSession } from '../Support/TestTeaSession.ts'

test('kettle_whenFilledWithBoilingWaterFromTheDebugMenuWhileHeldWithLeaves_holdsALitreOfCleanWaterAt100C', () => {
  const session = new TestTeaSession()
  session.addLeavesToKettle(5)
  session.do({ type: 'pickUp', itemId: 'kettle' })

  session.do({ type: 'fillWithBoilingWater', vesselId: 'kettle' })

  assert.deepEqual(session.vessel('kettle').liquid, { volumeMl: 1000, temperatureC: 100, strength: 0, strengthByTeaId: {}, bitterness: 0 })
  assert.equal(session.vessel('kettle').leaves, null)
})

test('kettle_whenFilledWithBoilingWaterBeforeTheRitualBegins_isFilled', () => {
  const session = new TestTeaSession()

  session.do({ type: 'fillWithBoilingWater', vesselId: 'kettle' })

  assert.equal(session.vessel('kettle').liquid.volumeMl, 1000)
})
