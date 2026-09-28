import assert from 'node:assert/strict'
import test from 'node:test'
import { testCatalog, testHouseCatalog, withMoreCaddies } from '../Support/TestCatalog.ts'
import { fullFlowTiltDegrees, TestTeaSession } from '../Support/TestTeaSession.ts'

const spotBesideTheTable = { placeId: 'table', x: -1, y: 0, z: 0 }

test('refusedCommand_isLoggedWithItsReasonAndTheValueThatDecidedIt', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })

  session.do({ type: 'placeOnHeater', itemId: 'kettle' })

  assertAnInfoLineMatches(session, /placeOnHeater refused \(heaterOccupied\).*kettle is on it/)
})

test('refusal_outOfReach_isLoggedNamingWhereTheItemAndThePlayerAre', () => {
  const session = new TestTeaSession(testHouseCatalog(), 'testHouse')
  session.do({ type: 'standAt', placeId: 'table' })

  session.do({ type: 'tasteCup', cupId: 'cup1' })

  assertAnInfoLineMatches(session, /tasteCup refused \(outOfReach\).*cup1 is on the shelf, the player is at the table/)
})

test('heaterSwitchOff_isLoggedWithTheTemperatureOfTheWaterOnIt', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(14)

  session.do({ type: 'switchHeaterOff' })

  assertAnInfoLineMatches(session, /heater switched off.*on it: kettle .* at 76\.0 °C/)
})

test('pickUp_ofAKettleInTheSink_isLoggedAsTakenFromTheSink', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'putInTheSink', itemId: 'kettle' })

  session.do({ type: 'pickUp', itemId: 'kettle' })

  assertAnInfoLineMatches(session, /picked up kettle, which was in the sink, into hand/)
})

test('pickUp_ofAKettleOnTheHeater_isLoggedAsTakenFromTheHeater', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })

  session.do({ type: 'pickUp', itemId: 'kettle' })

  assertAnInfoLineMatches(session, /picked up kettle, which was on the cold heater, into hand/)
})

test('player_whenWalkingAwayFromAPlace_isLoggedNamingThatPlace', () => {
  const session = new TestTeaSession(testHouseCatalog(), 'testHouse')
  session.do({ type: 'standAt', placeId: 'table' })

  session.do({ type: 'standAt', placeId: null })

  assertAnInfoLineMatches(session, /the player walks away from the table$/)
})

test('tapClosed_afterAKettleWentUnderIt_isLoggedWithWhatWentInSinceTheKettleAndWhatDrainedSinceTheTapOpened', () => {
  const session = new TestTeaSession()
  session.do({ type: 'turnTheTapOn' })
  session.wait(2)
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })
  session.do({ type: 'putInTheSink', itemId: 'kettle' })
  session.wait(1)

  session.do({ type: 'turnTheTapOff' })

  assertAnInfoLineMatches(session, /tap closed over kettle: since it ran over kettle, [0-9.]+ ml went in and 0\.0 ml down the drain; open for 3\.0 s in all, [1-9][0-9.]* ml down the drain since it opened/)
})

test('logLine_startsWithTheWorldTimeToTheMillisecond', () => {
  const session = new TestTeaSession()
  session.wait(2.5)

  session.do({ type: 'openVesselLid', vesselId: 'caddy' })

  assert.match(session.log.messagesAt('info').at(-1) ?? '', /^t=2\.500s /)
})

test('pourTilt_isLoggedOnlyAtDebugLevel', () => {
  const session = new TestTeaSession()
  session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  session.do({ type: 'adjustPour', tiltDegrees: 30, streamOnTargetFraction: 0.5, missedStreamLandsAt: spotBesideTheTable })

  assertADebugLineMatches(session, /pour tilted to 30\.0°/)
  assert.ok(!session.log.messagesAt('info').some((message) => message.includes('pour tilted')))
})

test('pourTilt_whenOnlyTheTiltAndTheShareChange_isLoggedOnceAndNotAsReceived', () => {
  const session = new TestTeaSession()
  session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  session.do({ type: 'adjustPour', tiltDegrees: 10, streamOnTargetFraction: 0.5, missedStreamLandsAt: spotBesideTheTable })
  session.do({ type: 'adjustPour', tiltDegrees: 20, streamOnTargetFraction: 0.6, missedStreamLandsAt: spotBesideTheTable })

  const debugLines = session.log.messagesAt('debug')
  assert.equal(debugLines.filter((message) => message.includes('pour tilted')).length, 1, debugLines.join('\n'))
  assert.ok(!debugLines.some((message) => message.includes('"adjustPour"')), debugLines.join('\n'))
})

test('pourTilt_whenTheWholeStreamLandsOnTargetAgain_isLoggedWithoutASpill', () => {
  const session = new TestTeaSession()
  session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })
  session.do({ type: 'adjustPour', tiltDegrees: 10, streamOnTargetFraction: 0.5, missedStreamLandsAt: spotBesideTheTable })

  session.do({ type: 'adjustPour', tiltDegrees: 12, streamOnTargetFraction: 1, missedStreamLandsAt: null })

  assertADebugLineMatches(session, /pour tilted to 12\.0°, 100% on target$/)
})

test('wipes_fromAbout25MlToUnder1Ml_areLoggedAsItPasses16And8And4And2And1Ml', () => {
  const session = new TestTeaSession()
  session.pour('kettle', null, 2.5)
  session.do({ type: 'pickUp', itemId: 'cloth' })

  for (let wipe = 0; wipe < 40; wipe += 1) session.do({ type: 'wipeTable', clothId: 'cloth', puddleId: 'puddle1', strokeSpeedCmPerSecond: 10, coveredFraction: 0.05 })

  const wipeLines = session.log.messagesAt('debug').filter((message) => message.includes('the table wiped'))
  const wetMlBeforeAndAfter = wipeLines.map((line) => /: ([0-9.]+) → ([0-9.]+) ml/.exec(line)?.slice(1).map(Number) ?? [])
  assert.deepEqual(wetMlBeforeAndAfter.map(([before = 0, after = 0]) => [16, 8, 4, 2, 1].find((wetMl) => before >= wetMl && after < wetMl)), [16, 8, 4, 2, 1], wipeLines.join('\n'))
  assert.ok(!session.log.messagesAt('debug').some((message) => message.includes('"wipeTable"')))
})

test('pourFinished_isLoggedWithTheHighestTiltOfThePour', () => {
  const session = new TestTeaSession()
  session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })
  session.do({ type: 'adjustPour', tiltDegrees: 30, streamOnTargetFraction: 1, missedStreamLandsAt: null })
  session.do({ type: 'adjustPour', tiltDegrees: 10, streamOnTargetFraction: 1, missedStreamLandsAt: null })

  session.do({ type: 'stopPouring' })

  assertAnInfoLineMatches(session, /pour from kettle into cup1 finished, tilted at most 30\.0°/)
})

test('worldReport_whileTheKettleHeats_logsItsWaterAndHowFastItWarms', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  session.do({ type: 'switchHeaterOn' })

  session.wait(6)

  assertADebugLineMatches(session, /the room: kettle on the working heater.* \(\+4\.000 °C\/s\)/)
})

test('worldReport_whileTheTapWashesLeavesOutOfAFullKettle_logsHowFastTheLeavesGo', () => {
  const session = new TestTeaSession()
  session.addLeavesToKettle(5)
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })
  session.do({ type: 'putInTheSink', itemId: 'kettle' })
  session.do({ type: 'turnTheTapOn' })

  session.wait(11)

  assert.ok(
    session.log.messagesAt('debug').some((message) => /the room: kettle in the sink, lid open: 1000\.0 ml .* g \(-[0-9.]+ g\/s\) of testGreen/.test(message)),
    session.log.messagesAt('debug').join('\n'),
  )
})

test('worldReport_whileOneTeaSteeps_logsHowLongItHasSteeped', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  session.addLeavesToKettle(5)

  session.wait(20)

  assertADebugLineMatches(session, /the room: kettle .* [0-9.]+ g of testGreen steeping for 1[5-9] s$/)
})

test('worldReport_whileASecondTeaSteepsInTheKettle_logsHowLongEachTeaHasSteeped', () => {
  const session = new TestTeaSession(withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack' }))
  session.heatKettleTo(80)
  session.addLeavesToKettle(5)
  session.wait(20)
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })
  session.tipASpoonOfLeavesInto('kettle', 'blackCaddy')

  session.wait(6)

  assertADebugLineMatches(session, /the room: kettle .* of 50% testGreen, 50% testBlack steeping for 2[0-5] s of testGreen, [0-5] s of testBlack$/)
})

test('worldReport_whileTheClothCharsOnTheHeater_logsHowFastItChars', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'cloth' })
  session.do({ type: 'switchHeaterOn' })

  session.wait(6)

  assertADebugLineMatches(session, /the room: cloth on the working heater: holds 0\.00 ml, .*charring [0-9]+% \(\+[0-9.]+%\/s\)/)
})

test('worldReport_whileTheSpoonCharsOnTheHeater_logsHowFastItChars', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'spoon' })
  session.do({ type: 'switchHeaterOn' })

  session.wait(6)

  assertADebugLineMatches(session, /the room: the spoon on the working heater with 0\.00 g of no tea on it: charring [0-9]+% \(\+[0-9.]+%\/s\)/)
})

test('worldReport_whileAPuddleDries_logsHowFastItDries', () => {
  const session = new TestTeaSession()
  session.pour('kettle', null, 2.5)

  session.wait(6)

  assertADebugLineMatches(session, /the room: puddle1 on the table at \([0-9.-]+, [0-9.-]+\): [0-9.]+ ml \(-[0-9.]+ ml\/s\)/)
})

test('worldReport_ofAnEmptiedKettleWhoseLastWarmthFades_leavesTheKettleOut', () => {
  const session = new TestTeaSession(testCatalog({ kettle: 0.01 }))
  session.heatKettleTo(80)
  session.pour('kettle', null, 60, fullFlowTiltDegrees)
  session.log.lines.splice(0)

  session.wait(6)

  assert.ok(!session.log.messagesAt('debug').some((message) => message.includes('the room: kettle')), session.log.messagesAt('debug').join('\n'))
})

test('worldReport_ofTheKettleHeatedByHand_leavesOutTheRatesThatDoNotChange', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  session.do({ type: 'switchHeaterOn' })

  session.wait(6)

  assertADebugLineMatches(session, /the room: kettle on the working heater, lid closed: 500\.0 ml at [0-9.]+ °C \(\+4\.000 °C\/s\), strength 0\.0, bitterness 0\.0, no leaves$/)
  assertADebugLineMatches(session, /the room: the heater has been in use for 5 s, by hand, with kettle on it$/)
})

test('worldReport_whileTheTapRuns_logsWhereItsWaterGoes', () => {
  const session = new TestTeaSession()
  session.do({ type: 'turnTheTapOn' })

  session.wait(6)

  assertADebugLineMatches(session, /the room: the tap has been open for 5 s over the empty sink: [0-9]+ ml down the drain since it opened/)
})

test('worldReport_ofARoomWhereNothingChanges_saysTheRoomIsStill', () => {
  const session = new TestTeaSession()

  session.wait(6)

  assert.ok(session.log.messagesAt('debug').some((message) => message.endsWith('the room: the room is still')), session.log.messagesAt('debug').join('\n'))
})

test('worldNumbers_whenACommandMakesOneNotANumberInADevelopmentBuild_areLoggedAsAnErrorNamingTheField', () => {
  const session = new TestTeaSession()
  session.doWithoutARefusal({ type: 'startPouring', sourceId: 'kettle', targetId: null })

  session.do({ type: 'adjustPour', tiltDegrees: Number.NaN, streamOnTargetFraction: 1, missedStreamLandsAt: spotBesideTheTable })

  assert.ok(session.log.messagesAt('error').some((message) => message.endsWith('world.pour.tiltDegrees is NaN after the command adjustPour')), session.log.messagesAt('error').join('\n'))
})

function assertADebugLineMatches(session: TestTeaSession, pattern: RegExp): void {
  assert.ok(session.log.messagesAt('debug').some((message) => pattern.test(message)), session.log.messagesAt('debug').join('\n'))
}

function assertAnInfoLineMatches(session: TestTeaSession, pattern: RegExp): void {
  assert.ok(session.log.messagesAt('info').some((message) => pattern.test(message)), session.log.messagesAt('info').join('\n'))
}
