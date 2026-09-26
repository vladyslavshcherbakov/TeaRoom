import assert from 'node:assert/strict'
import test from 'node:test'
import { testHouseCatalog } from '../Support/TestCatalog.ts'
import { TestRitual } from '../Support/TestRitual.ts'

test('refusedCommand_isLoggedWithItsReasonAndTheValueThatDecidedIt', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })

  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })

  assertAnInfoLineMatches(ritual, /placeOnHeater refused \(heaterOccupied\).*kettle is on it/)
})

test('refusal_outOfReach_isLoggedNamingWhereTheItemAndTheKeeperAre', () => {
  const ritual = new TestRitual(testHouseCatalog(), 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'table' })

  ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  assertAnInfoLineMatches(ritual, /tasteCup refused \(outOfReach\).*cup1 is on the shelf, the keeper is at the table/)
})

test('heaterSwitchOff_isLoggedWithTheTemperatureOfTheWaterOnIt', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(14)

  ritual.do({ type: 'switchHeaterOff' })

  assertAnInfoLineMatches(ritual, /heater switched off.*on it: kettle .* at 76\.0 °C/)
})

test('logLine_startsWithTheSimulatedTimeToTheMillisecond', () => {
  const ritual = new TestRitual()
  ritual.wait(2.5)

  ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })

  assert.match(ritual.log.messagesAt('info').at(-1) ?? '', /^t=2\.500s /)
})

test('pourTilt_isLoggedOnlyAtDebugLevel', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  ritual.do({ type: 'adjustPour', tiltDegrees: 30, streamOnTargetFraction: 0.5, missedStreamLandsAt: null })

  assertADebugLineMatches(ritual, /pour tilted to 30\.0°/)
  assert.ok(!ritual.log.messagesAt('info').some((message) => message.includes('pour tilted')))
})

test('worldReport_whileTheKettleHeats_logsItsWaterAndHowFastItWarms', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(6)

  assertADebugLineMatches(ritual, /the room: kettle on the working heater.* \(\+4\.000 °C\/s\)/)
})

test('worldReport_whileTheTapWashesLeavesOutOfAFullKettle_logsHowFastTheLeavesGo', () => {
  const ritual = new TestRitual()
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

test('worldReport_whileTheClothCharsOnTheHeater_logsHowFastItChars', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(6)

  assertADebugLineMatches(ritual, /the room: cloth on the working heater: holds 0\.00 ml .*charring [0-9]+% \(\+[0-9.]+%\/s\)/)
})

test('worldReport_whileTheSpoonCharsOnTheHeater_logsHowFastItChars', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'spoon' })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(6)

  assertADebugLineMatches(ritual, /the room: the spoon on the working heater with 0\.00 g of no tea on it: charring [0-9]+% \(\+[0-9.]+%\/s\)/)
})

test('worldReport_whileAPuddleDries_logsHowFastItDries', () => {
  const ritual = new TestRitual()
  ritual.pour('kettle', null, 2.5)

  ritual.wait(6)

  assertADebugLineMatches(ritual, /the room: the puddle on the table: [0-9.]+ ml \(-[0-9.]+ ml\/s\)/)
})

test('worldReport_whileTheTapRuns_logsWhereItsWaterGoes', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'turnTheTapOn' })

  ritual.wait(6)

  assertADebugLineMatches(ritual, /the room: the tap has been open for 5 s over the empty sink: [0-9]+ ml down the drain since it opened/)
})

test('worldReport_ofARoomWhereNothingChanges_saysTheRoomIsStill', () => {
  const ritual = new TestRitual()

  ritual.wait(6)

  assert.ok(ritual.log.messagesAt('debug').some((message) => message.endsWith('the room: the room is still')), ritual.log.messagesAt('debug').join('\n'))
})

function assertADebugLineMatches(ritual: TestRitual, pattern: RegExp): void {
  assert.ok(ritual.log.messagesAt('debug').some((message) => pattern.test(message)), ritual.log.messagesAt('debug').join('\n'))
}

function assertAnInfoLineMatches(ritual: TestRitual, pattern: RegExp): void {
  assert.ok(ritual.log.messagesAt('info').some((message) => pattern.test(message)), ritual.log.messagesAt('info').join('\n'))
}
