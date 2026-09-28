import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultRoomSettingsWith, roomSettingValues } from '../../../Apps/Game/Room/RoomSettings.ts'
import { settingsFrom } from '../../../Apps/Engine/SettingValues.ts'

test('roomSettings_savedWithEveryChoiceFromTheLists_keepThemAll', () => {
  const saved = { areAchievementsShown: true, coatColour: '#7a4a7f', hasSoftShadowsInCorners: true, hasGlow: false, isFrameRateShown: true, hasFullResolution: true, hasSmoothEdges: true, objectDetail: 'full', faceFeaturesShown: ['googlyEyes', 'giantAfro'], isNerdModeOn: true, temperatureUnit: 'fahrenheit', cameraMode: 'firstPerson', controlScheme: 'keyboardAndLookStick', stickLayout: 'lookOnTheLeft' }

  const settings = settingsFrom(roomSettingValues, saved, defaultRoomSettingsWith('twoSticks'))

  assert.deepEqual(settings, saved)
})

test('roomSettings_savedWithValuesNoLongerOffered_fallBackToTheDefaults', () => {
  const settings = settingsFrom(roomSettingValues, { areAchievementsShown: 'yes', coatColour: '#ff00ff', hasSoftShadowsInCorners: 'yes', faceFeaturesShown: ['nose', 'moustache'], temperatureUnit: 'kelvin' }, defaultRoomSettingsWith('twoSticks'))

  assert.deepEqual(settings, { areAchievementsShown: true, coatColour: '#3f7f8f', hasSoftShadowsInCorners: false, hasGlow: true, isFrameRateShown: false, hasFullResolution: false, hasSmoothEdges: false, objectDetail: 'reduced', faceFeaturesShown: ['nose'], isNerdModeOn: false, temperatureUnit: 'celsius', cameraMode: 'room', controlScheme: 'twoSticks', stickLayout: 'walkOnTheLeft' })
})

test('roomSettings_savedBeforeTheCameraWasASetting_openInTheRoomViewWithTheControlsOfThisDeviceAndTheWalkStickOnTheLeft', () => {
  const settings = settingsFrom(roomSettingValues, { coatColour: '#7a4a7f' }, defaultRoomSettingsWith('mouseAndKeyboard'))

  assert.deepEqual([settings.cameraMode, settings.controlScheme, settings.stickLayout], ['room', 'mouseAndKeyboard', 'walkOnTheLeft'])
})

test('roomSettings_savedWithoutTheAchievementsSetting_showThem', () => {
  const settings = settingsFrom(roomSettingValues, { coatColour: '#7a4a7f', isNerdModeOn: true }, defaultRoomSettingsWith('twoSticks'))

  assert.equal(settings.areAchievementsShown, true)
})

test('roomSettings_savedWithOneFaceFeatureAndNotAList_showTheNose', () => {
  const settings = settingsFrom(roomSettingValues, { faceFeature: 'afro', faceFeaturesShown: 'afro' }, defaultRoomSettingsWith('twoSticks'))

  assert.deepEqual(settings.faceFeaturesShown, ['nose'])
})

test('roomSettings_savedWithAFaceFeatureTwice_showTheNose', () => {
  const settings = settingsFrom(roomSettingValues, { faceFeaturesShown: ['ears', 'ears'] }, defaultRoomSettingsWith('twoSticks'))

  assert.deepEqual(settings.faceFeaturesShown, ['nose'])
})
