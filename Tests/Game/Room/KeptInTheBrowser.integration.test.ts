import assert from 'node:assert/strict'
import test from 'node:test'
import { achievementStore } from '../../../Apps/Game/Room/AchievementStore.ts'
import { nothingUnlocked, type AchievementRecord } from '../../../Apps/Game/Room/Achievements.ts'
import { aimHintStore } from '../../../Apps/Game/Room/AimHintStore.ts'
import { debugSettingsByDefault } from '../../../Apps/Game/Room/DebugSettings.ts'
import { debugSettingsStore } from '../../../Apps/Game/Room/DebugSettingsStore.ts'
import { playTimeStore } from '../../../Apps/Engine/PlayTimeStore.ts'
import { playedVersionStore } from '../../../Apps/Game/Room/PlayedVersionStore.ts'
import { defaultRoomSettingsWith } from '../../../Apps/Game/Room/RoomSettings.ts'
import { settingsStore } from '../../../Apps/Game/Room/SettingsStore.ts'
import { RecordingRoomLog } from '../../Support/RecordingRoomLog.ts'
import { installStorageInMemory } from '../../Support/StorageInMemory.ts'

const settingsByDefault = defaultRoomSettingsWith('twoSticks')
const notJson = '{"isNerdModeOn": true,'

test('settings_whenKept_areFoundAgainByTheNextPage', (t) => {
  installStorageInMemory(t)
  const keptSettings = { ...settingsByDefault, isNerdModeOn: true, temperatureUnit: 'fahrenheit' } as const
  settingsStore(() => {}, 'twoSticks').keep(keptSettings)

  const foundSettings = settingsStore(() => {}, 'twoSticks').load()

  assert.deepEqual(foundSettings, keptSettings)
})

test('settings_whenTheStorageIsBlocked_areTheDefaultsAndTheFailureIsLoggedAsAnError', (t) => {
  installStorageInMemory(t).isBlocked = true
  const log = new RecordingRoomLog()

  const foundSettings = settingsStore(log.write, 'twoSticks').load()

  assert.deepEqual(foundSettings, settingsByDefault)
  assert.equal(log.messagesAt('error').length, 1)
})

test('settings_whenTheirTextIsNotJson_areTheDefaultsAndTheFailureIsLoggedAsAnError', (t) => {
  installStorageInMemory(t).setItem('settings', notJson)
  const log = new RecordingRoomLog()

  const foundSettings = settingsStore(log.write, 'twoSticks').load()

  assert.deepEqual(foundSettings, settingsByDefault)
  assert.equal(log.messagesAt('error').length, 1)
})

test('debugSettings_whenKept_areFoundAgainByTheNextPage', (t) => {
  installStorageInMemory(t)
  const keptSettings = { ...debugSettingsByDefault, isFrameBudgetShown: true, playerHeightCentimetres: 180 }
  debugSettingsStore(() => {}).keep(keptSettings)

  const foundSettings = debugSettingsStore(() => {}).load()

  assert.deepEqual(foundSettings, keptSettings)
})

test('debugSettings_whenTheStorageIsBlocked_areTheDefaultsAndTheFailureIsLoggedAsAnError', (t) => {
  installStorageInMemory(t).isBlocked = true
  const log = new RecordingRoomLog()

  const foundSettings = debugSettingsStore(log.write).load()

  assert.deepEqual(foundSettings, debugSettingsByDefault)
  assert.equal(log.messagesAt('error').length, 1)
})

test('debugSettings_whenTheirTextIsNotJson_areTheDefaultsAndTheFailureIsLoggedAsAnError', (t) => {
  installStorageInMemory(t).setItem('debugSettings', notJson)
  const log = new RecordingRoomLog()

  const foundSettings = debugSettingsStore(log.write).load()

  assert.deepEqual(foundSettings, debugSettingsByDefault)
  assert.equal(log.messagesAt('error').length, 1)
})

test('achievements_whenKept_areFoundAgainByTheNextPage', (t) => {
  installStorageInMemory(t)
  const keptRecord: AchievementRecord = { unlocked: ['died', 'shiva'], hasTheTapRunForNothing: true, hasTheHeaterRunForNothing: false, puddlesWiped: 1, visitsBegun: 3 }
  achievementStore(() => {}).keep(keptRecord)

  const foundRecord = achievementStore(() => {}).load()

  assert.deepEqual(foundRecord, keptRecord)
})

test('achievements_whenTheStorageIsBlocked_areNoneUnlockedAndTheFailureIsLoggedAsAnError', (t) => {
  installStorageInMemory(t).isBlocked = true
  const log = new RecordingRoomLog()

  const foundRecord = achievementStore(log.write).load()

  assert.deepEqual(foundRecord, nothingUnlocked)
  assert.equal(log.messagesAt('error').length, 1)
})

test('achievements_whenTheirTextIsNotJson_areNoneUnlockedAndTheFailureIsLoggedAsAnError', (t) => {
  installStorageInMemory(t).setItem('achievements', notJson)
  const log = new RecordingRoomLog()

  const foundRecord = achievementStore(log.write).load()

  assert.deepEqual(foundRecord, nothingUnlocked)
  assert.equal(log.messagesAt('error').length, 1)
})

test('achievements_whenTheirListHoldsAnIdTheGameDoesNotKnow_keepOnlyTheKnownOnes', (t) => {
  installStorageInMemory(t).setItem('achievements', JSON.stringify({ ...nothingUnlocked, unlocked: ['died', 'flewToTheMoon'] }))

  const foundRecord = achievementStore(() => {}).load()

  assert.deepEqual(foundRecord.unlocked, ['died'])
})

test('playTime_whenKept_isFoundAgainByTheNextPage', (t) => {
  installStorageInMemory(t)
  playTimeStore(() => {}).keep(90)

  const foundSeconds = playTimeStore(() => {}).load()

  assert.equal(foundSeconds, 90)
})

test('playTime_whenTheStorageIsBlocked_startsFromNothingAndTheFailureIsLoggedAsAnError', (t) => {
  installStorageInMemory(t).isBlocked = true
  const log = new RecordingRoomLog()

  const foundSeconds = playTimeStore(log.write).load()

  assert.equal(foundSeconds, 0)
  assert.equal(log.messagesAt('error').length, 1)
})

test('playTime_whenItsSecondsAreNotANumber_startsFromNothingWithoutAnError', (t) => {
  installStorageInMemory(t).setItem('playTime', JSON.stringify({ secondsPlayed: 'an hour' }))
  const log = new RecordingRoomLog()

  const foundSeconds = playTimeStore(log.write).load()

  assert.equal(foundSeconds, 0)
  assert.deepEqual(log.messagesAt('error'), [])
})

test('aimingNote_whenRememberedAsSeen_isFoundSeenByTheNextPage', (t) => {
  installStorageInMemory(t)
  aimHintStore(() => {}).keep(true)

  const wasSeen = aimHintStore(() => {}).load()

  assert.equal(wasSeen, true)
})

test('aimingNote_whenTheStorageIsBlocked_isShownAndTheFailureIsLoggedAsAnError', (t) => {
  installStorageInMemory(t).isBlocked = true
  const log = new RecordingRoomLog()

  const wasSeen = aimHintStore(log.write).load()

  assert.equal(wasSeen, false)
  assert.equal(log.messagesAt('error').length, 1)
})

test('aimingNote_whenItsMarkIsSomethingElse_isShown', (t) => {
  installStorageInMemory(t).setItem('aimHintSeen', notJson)

  const wasSeen = aimHintStore(() => {}).load()

  assert.equal(wasSeen, false)
})

test('playedVersion_whenKept_isFoundAgainByTheNextPage', (t) => {
  installStorageInMemory(t)
  playedVersionStore(() => {}).keep('0.5.0')

  const lastPlayed = playedVersionStore(() => {}).load()

  assert.deepEqual(lastPlayed, { kind: 'found', value: '0.5.0' })
})

test('playedVersion_whenNeverKept_isNone', (t) => {
  installStorageInMemory(t)

  const lastPlayed = playedVersionStore(() => {}).load()

  assert.deepEqual(lastPlayed, { kind: 'none' })
})

test('playedVersion_whenItIsNotText_doesNotFit', (t) => {
  installStorageInMemory(t).setItem('lastPlayedVersion', '5')

  const lastPlayed = playedVersionStore(() => {}).load()

  assert.deepEqual(lastPlayed, { kind: 'doesNotFit' })
})
