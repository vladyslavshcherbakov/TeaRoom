import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRitual } from '../Support/TestRitual.ts'

test('kettle_whenFilledWithBoilingWaterFromTheDebugMenuWhileHeldWithLeaves_holdsALitreOfCleanWaterAt100C', () => {
  const ritual = new TestRitual()
  ritual.addLeavesToKettle(5)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  ritual.do({ type: 'fillWithBoilingWater', vesselId: 'kettle' })

  assert.deepEqual(ritual.vessel('kettle').liquid, { volumeMl: 1000, temperatureC: 100, strength: 0, strengthByTeaId: {}, bitterness: 0 })
  assert.equal(ritual.vessel('kettle').leaves, null)
})

test('kettle_whenFilledWithBoilingWaterBeforeTheRitualBegins_isFilled', () => {
  const ritual = new TestRitual()

  ritual.do({ type: 'fillWithBoilingWater', vesselId: 'kettle' })

  assert.equal(ritual.vessel('kettle').liquid.volumeMl, 1000)
})
