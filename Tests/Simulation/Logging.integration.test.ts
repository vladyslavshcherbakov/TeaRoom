import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRitual } from '../Support/TestRitual.ts'

test('refusedCommand_isLoggedWithItsReasonAndTheValueThatDecidedIt', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })

  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })

  assert.ok(
    ritual.log.messagesAt('info').some((message) => message.endsWith('placeOnHeater refused (heaterOccupied): {"itemId":"kettle"}, kettle is on it')),
    ritual.log.messagesAt('info').join('\n'),
  )
})

test('heaterSwitchOff_isLoggedWithTheTemperatureAndTheJudgement', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(14)

  ritual.do({ type: 'switchHeaterOff' })

  assert.ok(
    ritual.log.messagesAt('info').some((message) => message.includes('kettle 500.0 ml at 76.0 °C, strength 0, bitterness 0 judged ideal for testGreen')),
    ritual.log.messagesAt('info').join('\n'),
  )
})

test('logLine_startsWithTheSimulatedTimeToTheMillisecond', () => {
  const ritual = TestRitual.begun()
  ritual.wait(2.5)

  ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })

  assert.equal(ritual.log.messagesAt('info').at(-1), 't=2.500s caddy lid opened')
})

test('pourTilt_isLoggedOnlyAtDebugLevel', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  ritual.do({ type: 'adjustPour', tiltDegrees: 30, streamOnTargetFraction: 0.5 })

  assert.ok(ritual.log.messagesAt('debug').some((message) => message.endsWith('pour tilted to 30.0°, 50% on target')))
  assert.ok(!ritual.log.messagesAt('info').some((message) => message.includes('pour tilted')))
})
