import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, withASecondCloth } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

test('heater_whenSwitchedOffAfterHeatingTheKettle_saysHowLongItHeatedIt', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(10)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assertNear(eventsOfType(events, 'heaterSwitchedOff')[0]?.secondsHeatedByItemId['kettle'] ?? 0, 10)
})

test('heater_whenSwitchedOffAfterTheKettleWasTakenOffAndTheSpoonPutOn_namesBothWithTheirSeconds', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(10)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'putDown', itemId: 'kettle', spot: { placeId: 'table', x: 2, y: 0, z: 0 } })
  ritual.do({ type: 'placeOnHeater', itemId: 'spoon' })
  ritual.wait(5)

  const events = ritual.do({ type: 'switchHeaterOff' })

  const secondsHeated = eventsOfType(events, 'heaterSwitchedOff')[0]?.secondsHeatedByItemId ?? {}
  assert.deepEqual(Object.keys(secondsHeated).sort(), ['kettle', 'spoon'])
  assertNear(secondsHeated['spoon'] ?? 0, 5)
})

test('heater_whenSwitchedOffEmpty_saysItHeatedNothingAndTheKeeperSwitchedItOff', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(10)

  const events = ritual.do({ type: 'switchHeaterOff' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assert.deepEqual(switchedOff?.secondsHeatedByItemId, {})
  assert.equal(switchedOff?.wasSwitchedOffByTheKeeper, true)
})

test('heater_whenTheRitualFinishesWhileItWorks_saysTheKeeperDidNotSwitchItOff', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'switchHeaterOn' })

  const events = ritual.do({ type: 'finishRitual' })

  assert.equal(eventsOfType(events, 'heaterSwitchedOff')[0]?.wasSwitchedOffByTheKeeper, false)
})

test('kettleWater_whenHeatedForTenSeconds_warmsByFortyDegrees', () => {
  const ritual = ritualWithKettleOnWorkingHeater()

  ritual.wait(10)

  assertNear(ritual.vessel('kettle').liquid.temperatureC, 60)
})

test('kettleWater_withItsLidOpenForTenSecondsOnAWorkingHeater_warmsByTwentyDegrees', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })

  ritual.wait(10)

  assertNear(ritual.vessel('kettle').liquid.temperatureC, 40)
})

test('kettleWater_whenLeftOnTheHeater_stopsAtBoiling', () => {
  const ritual = ritualWithKettleOnWorkingHeater()

  ritual.wait(60)

  assert.equal(ritual.vessel('kettle').liquid.temperatureC, 100)
})

test('heater_whenSwitchedOffInsideTheGoodRange_judgesTheWaterIdeal', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(14)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assert.equal(eventsOfType(events, 'heaterSwitchedOff')[0]?.waterJudgement, 'ideal')
})

test('heater_whenSwitchedOffPastTheAcceptableRange_judgesTheWaterTooHot', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(20)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assert.equal(eventsOfType(events, 'heaterSwitchedOff')[0]?.waterJudgement, 'tooHot')
})

test('heater_whenSwitchedOffAfterTwoMinutes_saysItWasOnThatLongAndUsedATenthOfAKilowattHour', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(120)

  const events = ritual.do({ type: 'switchHeaterOff' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assertNear(switchedOff?.onSeconds ?? 0, 120)
  assertNear(switchedOff?.kilowattHoursUsed ?? 0, 0.1)
})

test('heater_whenSwitchedOffAfterHeatingOnlyTheKettle_hasWastedNothing', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(120)

  const events = ritual.do({ type: 'switchHeaterOff' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assert.equal(switchedOff?.wastedSeconds, 0)
  assert.equal(switchedOff?.kilowattHoursWasted, 0)
})

test('heater_whenSwitchedOffAfterTwoMinutesWithNothingOnIt_hasWastedATenthOfAKilowattHour', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(120)

  const events = ritual.do({ type: 'switchHeaterOff' })

  const [switchedOff] = eventsOfType(events, 'heaterSwitchedOff')
  assertNear(switchedOff?.wastedSeconds ?? 0, 120)
  assertNear(switchedOff?.kilowattHoursWasted ?? 0, 0.1)
})

test('heater_whenSwitchedOffAfterTheKettleAndThenTheThermos_hasWastedOnlyTheThermosSeconds', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(10)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'putDown', itemId: 'kettle', spot: { placeId: 'table', x: 2, y: 0, z: 0 } })
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.wait(5)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assertNear(eventsOfType(events, 'heaterSwitchedOff')[0]?.wastedSeconds ?? 0, 5)
})

test('heater_whenSwitchedOnAgain_countsItsTimeFromTheNewSwitch', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(30)
  ritual.do({ type: 'switchHeaterOff' })
  ritual.wait(30)
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(10)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assertNear(eventsOfType(events, 'heaterSwitchedOff')[0]?.onSeconds ?? 0, 10)
})

test('heater_whenSwitchedOffEarly_judgesTheWaterTooCool', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(5)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assert.equal(eventsOfType(events, 'heaterSwitchedOff')[0]?.waterJudgement, 'tooCool')
})

test('heater_whenSwitchedOffBetweenTheGoodAndAcceptableRanges_judgesTheWaterSlightlyHot', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(17)

  const events = ritual.do({ type: 'switchHeaterOff' })

  assert.equal(eventsOfType(events, 'heaterSwitchedOff')[0]?.waterJudgement, 'slightlyHot')
})

test('kettle_whenLiftedOffAWorkingHeater_isJudgedAndStopsWarming', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(14)

  const events = ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.wait(10)

  assert.deepEqual(eventsOfType(events, 'takenOffHeater'), [{ type: 'takenOffHeater', itemId: 'kettle', waterJudgement: 'ideal' }])
  assertNear(ritual.vessel('kettle').liquid.temperatureC, 76)
})

test('heating_whenTheWaterEntersTheGoodRange_announcesTheTargetOnce', () => {
  const ritual = ritualWithKettleOnWorkingHeater()

  const eventsBeforeTheRange = ritual.wait(13)
  const eventsAfterwards = ritual.wait(12)

  assert.equal(eventsOfType(eventsBeforeTheRange, 'targetTemperatureReached').length, 0)
  assert.deepEqual(eventsOfType(eventsAfterwards, 'targetTemperatureReached'), [
    { type: 'targetTemperatureReached', vesselId: 'kettle' },
  ])
})

test('kettleWater_whenOffTheHeater_coolsButStaysAboveTheRoom', () => {
  const ritual = TestRitual.begun(testCatalog({ kettle: 0.01 }))
  ritual.heatKettleTo(80)
  const temperatureWhenLiftedC = ritual.vessel('kettle').liquid.temperatureC

  ritual.wait(60)

  const temperatureAfterAMinuteC = ritual.vessel('kettle').liquid.temperatureC
  assert.ok(temperatureAfterAMinuteC < temperatureWhenLiftedC - 10, `kettle is still at ${temperatureAfterAMinuteC} °C`)
  assert.ok(temperatureAfterAMinuteC > 20, `kettle fell to ${temperatureAfterAMinuteC} °C, below the room`)
})

test('cup_whenPlacedOnTheHeater_isRefused', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'placeOnHeater', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'placeOnHeater', reason: 'cannotSitOnHeater' }])
})

test('cloth_onAWorkingHeater_charsThroughInAMinute', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(30)

  assertNear(ritual.cloth().charring, 0.5)
})

test('cloth_wetOnAWorkingHeater_steamsDryBeforeItChars', () => {
  const ritual = TestRitual.begun()
  ritual.pour('kettle', null, 2.5)
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'wipeTable', clothId: 'cloth', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(1)

  assert.equal(ritual.cloth().charring, 0)
})

test('cloth_whenTakenOffTheHeater_saysHowCharredItIs', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(30)

  const events = ritual.do({ type: 'pickUp', itemId: 'cloth' })

  assertNear(eventsOfType(events, 'clothTakenOffTheHeater')[0]?.charring ?? 0, 0.5)
})

test('cloth_onAHeaterThatIsOff_doesNotChar', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })

  ritual.wait(30)

  assert.equal(ritual.cloth().charring, 0)
})

test('charredCloth_whenWashedUnderTheTap_isAsGoodAsNew', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(60)
  ritual.do({ type: 'switchHeaterOff' })
  ritual.do({ type: 'pickUp', itemId: 'cloth' })

  ritual.do({ type: 'putInTheSink', itemId: 'cloth' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(5)

  assert.equal(ritual.cloth().charring, 0)
})

test('washedBurntCloth_whenTakenOutOfTheSink_isNoticedAsNew', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(10)
  ritual.do({ type: 'switchHeaterOff' })
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'putInTheSink', itemId: 'cloth' })
  ritual.do({ type: 'turnTheTapOn' })
  ritual.wait(5)

  const events = ritual.do({ type: 'pickUp', itemId: 'cloth' })

  assert.deepEqual(eventsOfType(events, 'burntClothWashedBackToNew'), [{ type: 'burntClothWashedBackToNew', clothId: 'cloth' }])
})

test('clothThatNeverBurnt_whenTakenOutOfTheSink_isNotRemarkedOn', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  ritual.do({ type: 'putInTheSink', itemId: 'cloth' })
  ritual.wait(5)

  const events = ritual.do({ type: 'pickUp', itemId: 'cloth' })

  assert.deepEqual(eventsOfType(events, 'burntClothWashedBackToNew'), [])
})

test('spoon_onAWorkingHeater_charsThroughInTwentySeconds', () => {
  const ritual = ritualWithTheSpoonOnAWorkingHeater()

  ritual.wait(10)

  assertNear(ritual.state.spoon.charring, 0.5)
})

test('spoon_onAHeaterThatIsOff_doesNotChar', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'spoon' })

  ritual.wait(30)

  assert.equal(ritual.state.spoon.charring, 0)
})

test('spoon_whenTakenBeforeItBurns_isSavedButStaysCharred', () => {
  const ritual = ritualWithTheSpoonOnAWorkingHeater()
  ritual.wait(10)

  ritual.do({ type: 'pickUp', itemId: 'spoon' })
  ritual.wait(10)

  assert.deepEqual(ritual.state.spoon.location, { kind: 'inHand', handIndex: 0 })
  assertNear(ritual.state.spoon.charring, 0.5)
})

test('spoon_whenTakenWhileItBurns_crumblesWithTheLeavesOnIt', () => {
  const ritual = TestRitual.begun()
  ritual.tipASpoonOfLeavesInto('cup1')
  ritual.do({ type: 'scoopTea', depth: 1 })
  ritual.do({ type: 'placeOnHeater', itemId: 'spoon' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(17)

  const events = ritual.do({ type: 'pickUp', itemId: 'spoon' })

  assert.deepEqual(eventsOfType(events, 'spoonCrumbled'), [{ type: 'spoonCrumbled', gramsLost: 5 }])
  assert.deepEqual(ritual.state.spoon.location, { kind: 'gone' })
  assert.deepEqual(ritual.state.keeper.hands, [null, null, null])
  assert.equal(ritual.state.heater.itemIdOnTop, null)
})

test('spoon_afterItCrumbled_cannotBeTaken', () => {
  const ritual = ritualWithACrumbledSpoon()

  const events = ritual.do({ type: 'pickUp', itemId: 'spoon' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUp', reason: 'burntAway' }])
})

test('spoon_afterItCrumbled_cannotScoop', () => {
  const ritual = ritualWithACrumbledSpoon()

  const events = ritual.do({ type: 'scoopTea', depth: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'scoopTea', reason: 'burntAway' }])
})

test('spoon_afterItCrumbled_cannotTipLeaves', () => {
  const ritual = ritualWithACrumbledSpoon()

  const events = ritual.do({ type: 'tipSpoonInto', vesselId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tipSpoonInto', reason: 'burntAway' }])
})

test('spoon_afterItCrumbled_cannotBePutDown', () => {
  const ritual = ritualWithACrumbledSpoon()

  const events = ritual.do({ type: 'putDown', itemId: 'spoon', spot: { placeId: 'table', x: 7, y: 0, z: 0 } })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'putDown', reason: 'burntAway' }])
})

test('simulation_whenPlayedAt30And60FramesPerSecond_endsInTheSameState', () => {
  const catalog = testCatalog({ kettle: 0.01, cup: 0.02 })
  const at30 = ritualWithKettleOnWorkingHeater(TestRitual.begun(catalog))
  const at60 = ritualWithKettleOnWorkingHeater(TestRitual.begun(catalog))

  for (const [ritual, framesPerSecond] of [[at30, 30], [at60, 60]] as const) {
    for (let frame = 0; frame < 12 * framesPerSecond; frame += 1) ritual.wait(1 / framesPerSecond)
    ritual.do({ type: 'pickUp', itemId: 'kettle' })
    ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })
    ritual.do({ type: 'adjustPour', tiltDegrees: 30, streamOnTargetFraction: 0.9, missedStreamLandsAt: null })
    for (let frame = 0; frame < 6 * framesPerSecond; frame += 1) ritual.wait(1 / framesPerSecond)
  }

  assert.deepEqual(at30.state, at60.state)
})

test('kettleWater_whenCoolingWhileOnAWorkingHeater_stillReachesBoiling', () => {
  const ritual = ritualWithKettleOnWorkingHeater(TestRitual.begun(testCatalog({ kettle: 0.01 })))

  ritual.wait(120)

  assert.equal(ritual.vessel('kettle').liquid.temperatureC, 100)
})

test('water_boilingOnAWorkingHeater_boilsAwayAtTheHeatersRate', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(200)
  const volumeAtTheBoil = ritual.vessel('kettle').liquid.volumeMl

  ritual.wait(100)

  assertNear(ritual.vessel('kettle').liquid.volumeMl, volumeAtTheBoil - 100)
})

test('water_liftedOffTheHeaterAtTheBoil_stopsBoilingAway', () => {
  const ritual = ritualWithKettleOnWorkingHeater()
  ritual.wait(200)
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  const volumeWhenLifted = ritual.vessel('kettle').liquid.volumeMl

  ritual.wait(100)

  assert.equal(ritual.vessel('kettle').liquid.volumeMl, volumeWhenLifted)
})

test('water_belowTheBoil_doesNotBoilAway', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(10)

  assert.equal(ritual.vessel('kettle').liquid.volumeMl, 500)
})

test('thermos_afterHalfAMinuteOnAWorkingHeater_isTooHotToPickUp', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(30)

  const events = ritual.do({ type: 'pickUp', itemId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUp', reason: 'tooHotToHold' }])
  assert.equal(ritual.state.heater.itemIdOnTop, 'thermos')
})

test('thermos_afterTenSecondsOnAWorkingHeater_canStillBePickedUp', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(10)

  ritual.do({ type: 'pickUp', itemId: 'thermos' })

  assert.equal(ritual.state.heater.itemIdOnTop, null)
})

test('thermosLid_whenTheThermosIsRedHot_staysClosed', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(30)

  const events = ritual.do({ type: 'openVesselLid', vesselId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'openVesselLid', reason: 'tooHotToHold' }])
  assert.equal(ritual.vessel('thermos').isLidOpen, false)
})

test('thermosLid_whenOpenAsTheThermosTurnsRedHot_staysOpen', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'openVesselLid', vesselId: 'thermos' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(30)

  const events = ritual.do({ type: 'closeVesselLid', vesselId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'closeVesselLid', reason: 'tooHotToHold' }])
  assert.equal(ritual.vessel('thermos').isLidOpen, true)
})

test('thermos_aMinuteAfterTheHeaterIsSwitchedOff_canBePickedUpAgain', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(30)
  ritual.do({ type: 'switchHeaterOff' })
  ritual.wait(60)

  const events = ritual.do({ type: 'pickUp', itemId: 'thermos' })

  assert.equal(events.some((event) => event.type === 'pickedUp'), true, JSON.stringify(events))
})

test('thermos_onAHeaterThatIsOff_staysCoolAndCanBePickedUp', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.wait(30)

  const events = ritual.do({ type: 'pickUp', itemId: 'thermos' })

  assert.equal(events.some((event) => event.type === 'pickedUp'), true, JSON.stringify(events))
  assert.equal(ritual.vessel('thermos').shellHeat, 0)
})

test('thermos_onAWorkingHeater_announcesOnceThatItsMetalGlowsTooHotToHold', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'switchHeaterOn' })

  const events = ritual.wait(30)

  assert.deepEqual(eventsOfType(events, 'metalGlowsTooHotToHold'), [{ type: 'metalGlowsTooHotToHold', vesselId: 'thermos' }])
})

test('kettle_leftOnAWorkingHeaterUntilItsWaterIsGone_announcesOnceThatItBoiledDry', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  const events = ritual.wait(600)

  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: false }])
})

test('kettle_boilingAwayInStepsThatDoNotDivideItsWaterEvenly_stillBoilsDryAndSaysSo', () => {
  const catalog = testCatalog()
  const heater = catalog.heaters['testHeater']
  if (heater === undefined) throw new Error('the test catalog lost its heater')
  const ritual = TestRitual.begun({ ...catalog, heaters: { testHeater: { ...heater, boilingAwayMlPerSecond: 8 } } })
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  const events = ritual.wait(600)

  assert.equal(ritual.vessel('kettle').liquid.volumeMl, 0)
  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: false }])
})

test('kettle_filledToTheBrimAndLeftToBoilDry_saysAllItsWaterBoiledAway', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })
  ritual.fillInTheSink('kettle', 10)
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  const events = ritual.wait(1200)

  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: true }])
})

test('kettle_filledToTheBrimThenPouredFromAndLeftToBoilDry_saysSomeWaterWasTaken', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })
  ritual.fillInTheSink('kettle', 10)
  ritual.pour('kettle', 'cup1', 1)
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  const events = ritual.wait(1200)

  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: false }])
})

test('secondCloth_onAWorkingHeater_charsWhileTheFirstStaysWhole', () => {
  const ritual = TestRitual.begun(withASecondCloth(testCatalog()))
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth2' })
  ritual.do({ type: 'switchHeaterOn' })

  ritual.wait(30)

  assertNear(ritual.cloth('cloth2').charring, 0.5)
  assert.equal(ritual.cloth('cloth').charring, 0)
})

test('secondCloth_takenOffTheHeaterBurning_isNamedInTheEvent', () => {
  const ritual = TestRitual.begun(withASecondCloth(testCatalog()))
  ritual.do({ type: 'placeOnHeater', itemId: 'cloth2' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(30)

  const events = ritual.do({ type: 'pickUp', itemId: 'cloth2' })

  assert.deepEqual(eventsOfType(events, 'clothTakenOffTheHeater').map((event) => event.clothId), ['cloth2'])
})

function ritualWithKettleOnWorkingHeater(ritual = TestRitual.begun()): TestRitual {
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })
  return ritual
}

function ritualWithACrumbledSpoon(): TestRitual {
  const ritual = ritualWithTheSpoonOnAWorkingHeater()
  ritual.wait(17)
  ritual.do({ type: 'pickUp', itemId: 'spoon' })
  return ritual
}

function ritualWithTheSpoonOnAWorkingHeater(): TestRitual {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'spoon' })
  ritual.do({ type: 'switchHeaterOn' })
  return ritual
}
