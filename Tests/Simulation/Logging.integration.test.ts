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

  ritual.do({ type: 'adjustPour', tiltDegrees: 30, streamOnTargetFraction: 0.5, missedStreamLandsAt: null })

  assert.ok(ritual.log.messagesAt('debug').some((message) => message.endsWith('pour tilted to 30.0°, 50% on target')))
  assert.ok(!ritual.log.messagesAt('info').some((message) => message.includes('pour tilted')))
})

test('worldReport_whileTheKettleHeats_logsItsWaterAndHowFastItWarms', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(6)

  assert.ok(
    ritual.log.messagesAt('debug').some((message) => message.includes('the room: kettle on the working heater, lid closed: 500.0 ml (+0.00 ml/s) at 40.2 °C (+4.000 °C/s)')),
    ritual.log.messagesAt('debug').join('\n'),
  )
})

test('worldReport_whileTheTapWashesLeavesOutOfAFullKettle_logsHowFastTheLeavesGo', () => {
  const ritual = TestRitual.begun()
  ritual.addLeavesToKettle(5)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.do({ type: 'turnTheTapOn' })

  ritual.wait(11)

  assert.ok(
    ritual.log.messagesAt('debug').some((message) => /the room: kettle in the sink, lid open: 1000\.0 ml .* g \(-[0-9.]+ g\/s\) of testGreen/.test(message)),
    ritual.log.messagesAt('debug').join('\n'),
  )
})

test('worldReport_ofARoomWhereNothingChanges_saysTheRoomIsStill', () => {
  const ritual = TestRitual.begun()

  ritual.wait(6)

  assert.ok(ritual.log.messagesAt('debug').some((message) => message.endsWith('the room: the room is still')), ritual.log.messagesAt('debug').join('\n'))
})
