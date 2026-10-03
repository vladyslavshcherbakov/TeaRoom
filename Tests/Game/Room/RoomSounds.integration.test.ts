import assert from 'node:assert/strict'
import test from 'node:test'
import { worldViewState } from '../../../Apps/Game/Presentation/WorldPresenter.ts'
import type { Heating } from '../../../Apps/Game/Presentation/WorldViewState.ts'
import { soundsLastingIn, type LastingRoomSound } from '../../../Apps/Game/Room/RoomSounds.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { TestRoom } from '../../Support/TestRoom.ts'

const tiltOfAFlowingPourDegrees = 30
const longestHeatingSeconds = 600
const longestHeatingOfTheMetalSeconds = 120
const secondsTheThermosTakesToGrowTooHotToHold = 9
const heatingStepSeconds = 5

test('soundsLasting_inARoomWhereNothingHappens_areTheBirdsAlone', () => {
  const room = new TestRoom()

  const lasting = lastingSoundsOf(room)

  assert.deepEqual(lasting, ['backgroundBirds'])
})

test('tapRunning_whileTheTapRuns_lasts', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')

  room.tap({ kind: 'faucet' })

  assert.deepEqual(lastingSoundsOf(room), ['backgroundBirds', 'tapRunning'])
})

test('pouring_whileTheStreamRuns_lasts', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  room.testSession.doWithoutARefusal({ type: 'startPouring', sourceId: 'kettle', targetId: 'bowl1' })

  room.testSession.doWithoutARefusal({ type: 'adjustPour', tiltDegrees: tiltOfAFlowingPourDegrees, streamOnTargetFraction: 1, missedStreamLandsAt: null })

  assert.deepEqual(lastingSoundsOf(room), ['backgroundBirds', 'pouring'])
})

test('kettleWhistle_whenTheKettleOnTheWorkingHeaterHoldsBoilingWater_lasts', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.testSession.putOnTheWorkingHeater('kettle')

  room.testSession.doWithoutARefusal({ type: 'fillWithBoilingWater', vesselId: 'kettle' })

  assert.deepEqual(lastingSoundsOf(room), ['backgroundBirds', 'heaterWorking', 'kettleWhistle'])
})

test('burning_whileTheSpoonBurnsOnTheWorkingHeater_lastsInPlaceOfTheHeatersHum', () => {
  const room = new TestRoom()

  heatTheSpoonOnTheHeaterUntil(room, 'burning')

  assert.deepEqual(lastingSoundsOf(room), ['backgroundBirds', 'burning'])
})

test('burning_whileTheSpoonOnTheWorkingHeaterOnlySmoulders_lasts', () => {
  const room = new TestRoom()

  heatTheSpoonOnTheHeaterUntil(room, 'smouldering')

  assert.deepEqual(lastingSoundsOf(room), ['backgroundBirds', 'burning'])
})

test('spoonCrumbling_whenTheBurningSpoonIsTaken_isHeard', () => {
  const room = new TestRoom()
  heatTheSpoonOnTheHeaterUntil(room, 'burning')
  const soundsBeforeTheAct = room.soundsStarted.length

  room.tapAndChoose({ kind: 'item', itemId: 'spoon' }, 'take')

  assert.deepEqual(room.soundsStarted.slice(soundsBeforeTheAct), ['spoonCrumbling'])
})

test('sip_beforeTheBowlIsHalfwayToTheLips_isNotHeard', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  room.playerController.sipTapped()
  const soundsBeforeTheWait = room.soundsStarted.length

  room.advance(0.2)

  assert.deepEqual(room.soundsStarted.slice(soundsBeforeTheWait), [])
})

test('sip_whenTheBowlIsHalfwayToTheLips_isHeardOnce', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  room.playerController.sipTapped()
  const soundsBeforeTheWait = room.soundsStarted.length

  room.advance(1.6)

  assert.deepEqual(room.soundsStarted.slice(soundsBeforeTheWait), ['sip'])
})

test('buttonClick_whenTheSettingsGearIsTapped_isHeard', () => {
  const room = new TestRoom()

  room.tap({ kind: 'settingsGear' })

  assert.deepEqual(room.soundsStarted, ['buttonClick'])
})

test('buttonClick_whenTheHeaterSwitchIsTapped_isHeard', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  const soundsBeforeTheAct = room.soundsStarted.length

  room.tap({ kind: 'heaterSwitch' })

  assert.deepEqual(room.soundsStarted.slice(soundsBeforeTheAct), ['buttonClick'])
})

test('buttonClick_whenTheKettlesLidIsOpenedFromTheMenu_isHeard', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'lid', itemId: 'kettle' })
  const soundsBeforeTheAct = room.soundsStarted.length

  room.choose('openTheLid')

  assert.deepEqual({ isLidOpen: room.state.vessels['kettle']?.isLidOpen, sounds: room.soundsStarted.slice(soundsBeforeTheAct) }, { isLidOpen: true, sounds: ['buttonClick'] })
})

test('itemPutDown_whenTheKettleIsPutOnTheHeater_isHeard', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')
  const soundsBeforeTheTap = room.soundsStarted.length

  room.tapAndChoose({ kind: 'heater' }, 'putOnTheHeater')

  assert.deepEqual(room.soundsStarted.slice(soundsBeforeTheTap), ['itemPutDown'])
})

test('itemPickedUp_whenTheKettleIsTakenFromTheCounter_isHeard', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  const soundsBeforeTheAct = room.soundsStarted.length

  room.tapAndChoose({ kind: 'item', itemId: 'kettle' }, 'take')

  assert.deepEqual(room.soundsStarted.slice(soundsBeforeTheAct), ['itemPickedUp'])
})

test('menuOfTheHandHoldingTheKettle_whenItOpens_isSilent', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')
  const soundsBeforeTheTap = room.soundsStarted.length

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.deepEqual({ actions: room.actionsOffered(), sounds: room.soundsStarted.slice(soundsBeforeTheTap) }, { actions: ['putAway kettle', 'openTheLid kettle'], sounds: [] })
})

test('buttonClick_whenTheShownMedalIsTapped_isHeard', () => {
  const room = new TestRoom()
  room.areAchievementsShown = true

  room.tap({ kind: 'medal' })

  assert.deepEqual(room.soundsStarted, ['buttonClick'])
})

test('buttonClick_whenTheOpenLidOfTheKettleInHandIsTapped_isHeardAsItCloses', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })
  const soundsBeforeTheTap = room.soundsStarted.length

  room.tap({ kind: 'lid', itemId: 'kettle' })

  assert.deepEqual({ isLidOpen: room.state.vessels['kettle']?.isLidOpen, sounds: room.soundsStarted.slice(soundsBeforeTheTap) }, { isLidOpen: false, sounds: ['buttonClick'] })
})

test('buttonClick_whenAnEmptyHandIsTapped_isNotHeard', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  const soundsBeforeTheTap = room.soundsStarted.length

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.deepEqual(room.soundsStarted.slice(soundsBeforeTheTap), [])
})

test('leavesRustling_whenTheSpoonScoopsFromTheOpenCaddy_isHeard', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  room.take('spoon')
  const soundsBeforeTheTap = room.soundsStarted.length

  room.tapAndChoose({ kind: 'item', itemId: 'caddy' }, 'scoopFrom')

  assert.deepEqual(room.soundsStarted.slice(soundsBeforeTheTap), ['leavesRustling'])
})

test('leavesRustling_whenTheFullSpoonTipsItsLeavesIntoTheOpenKettle_isHeard', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })
  room.take('spoon')
  room.session.dispatch({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })
  const soundsBeforeTheTap = room.soundsStarted.length

  room.tapAndChoose({ kind: 'item', itemId: 'kettle' }, 'tipLeavesInto')

  assert.deepEqual(room.soundsStarted.slice(soundsBeforeTheTap), ['leavesRustling'])
})

test('closeUpWhoosh_whenTheWalkerArrivesAtTheCounter_isHeardOnce', () => {
  const room = new TestRoom()

  room.walkTo('counter')

  assert.deepEqual(room.soundsStarted, ['closeUpWhoosh'])
})

test('closeUpWhoosh_whenTheCloseUpIsLeftByATapOnTheFloor_isHeard', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  const soundsBeforeTheAct = room.soundsStarted.length

  room.walkAcrossTheFloorTo({ x: 0, z: 0 })

  assert.deepEqual(room.soundsStarted.slice(soundsBeforeTheAct), ['closeUpWhoosh'])
})

test('metalTooHot_twoSecondsBeforeTheThermosOnTheWorkingHeaterGlowsTooHotToHold_isHeard', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.testSession.putOnTheWorkingHeater('thermos')
  const soundsBeforeTheHeat = room.soundsStarted.length

  room.advance(secondsTheThermosTakesToGrowTooHotToHold - 1.5)

  assert.deepEqual({ sounds: room.soundsStarted.slice(soundsBeforeTheHeat), isTooHotYet: room.session.wouldRefuse([{ type: 'pickUp', itemId: 'thermos' }]) !== null }, { sounds: ['metalTooHot'], isTooHotYet: false })
})

test('metalTooHot_whenTheThermosOnTheWorkingHeaterGlowsTooHotToHold_isHeardOnce', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.testSession.putOnTheWorkingHeater('thermos')
  const soundsBeforeTheHeat = room.soundsStarted.length

  room.advance(longestHeatingOfTheMetalSeconds)

  assert.deepEqual(room.soundsStarted.slice(soundsBeforeTheHeat), ['metalTooHot'])
})

test('buttonClick_whenTheFaucetIsTapped_isNotHeard', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')
  const soundsBeforeTheTap = room.soundsStarted.length

  room.tap({ kind: 'faucet' })

  assert.deepEqual(room.soundsStarted.slice(soundsBeforeTheTap), [])
})

test('buttonClick_whenTheHiddenMedalIsTapped_isNotHeard', () => {
  const room = new TestRoom()
  room.areAchievementsShown = false

  room.tap({ kind: 'medal' })

  assert.deepEqual(room.soundsStarted, [])
})

test('debugMenuSound_whenTheRoseBushIsTappedTenTimesWithAchievementsHidden_isHeardAlone', () => {
  const room = new TestRoom()

  room.tapTimes(10, { kind: 'roseBush' })

  assert.deepEqual(room.soundsStarted, ['debugMenu'])
})

test('achievementSound_whenAnAchievementIsAnnounced_isHeardBeforeTheDebugMenu', () => {
  const room = new TestRoom()
  room.areAchievementsShown = true

  room.tapTimes(10, { kind: 'roseBush' })

  assert.deepEqual(room.soundsStarted, ['achievement', 'debugMenu'])
})

function lastingSoundsOf(room: TestRoom): LastingRoomSound[] {
  return [...soundsLastingIn(room.state, worldViewState(room.state, defaultCatalog), false)].sort()
}

function holdABowlOfTea(room: TestRoom): void {
  room.setTheTeaTable()
  room.testSession.pour('kettle', 'bowl1', 4)
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })
}

function heatTheSpoonOnTheHeaterUntil(room: TestRoom, heating: Heating): void {
  room.walkTo('teaTable')
  room.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'spoon' })
  room.walkTo('counter')
  room.testSession.putOnTheWorkingHeater('spoon')
  for (let secondsOnTheHeater = 0; heatingOfTheSpoon(room) !== heating; secondsOnTheHeater += heatingStepSeconds) {
    if (secondsOnTheHeater > longestHeatingSeconds) throw new Error(`the arrange could not bring the spoon to ${heating} in ${longestHeatingSeconds} s`)
    room.testSession.wait(heatingStepSeconds)
  }
}

function heatingOfTheSpoon(room: TestRoom): Heating | undefined {
  return worldViewState(room.state, defaultCatalog).charringByItem['spoon']?.heating
}
