import assert from 'node:assert/strict'
import test from 'node:test'
import { roomSettingsFrom } from '../../../Apps/Game/Room/RoomSettings.ts'

test('roomSettings_savedWithEveryChoiceFromTheLists_keepThemAll', () => {
  const saved = { areAchievementsShown: true, coatColour: '#7a4a7f', hasSoftShadowsInCorners: true, hasGlow: false, isFrameRateShown: true, hasFullResolution: true, hasSmoothEdges: true, objectDetail: 'full', faceFeature: 'afro', isNerdModeOn: true, temperatureUnit: 'fahrenheit', cameraMode: 'firstPerson', controlScheme: 'keyboardAndLookStick', stickLayout: 'lookOnTheLeft' }

  const settings = roomSettingsFrom(saved, 'twoSticks')

  assert.deepEqual(settings, saved)
})

test('roomSettings_savedWithValuesNoLongerOffered_fallBackToTheDefaults', () => {
  const settings = roomSettingsFrom({ areAchievementsShown: 'yes', coatColour: '#ff00ff', hasSoftShadowsInCorners: 'yes', faceFeature: 'moustache', temperatureUnit: 'kelvin' }, 'twoSticks')

  assert.deepEqual(settings, { areAchievementsShown: false, coatColour: '#3f7f8f', hasSoftShadowsInCorners: false, hasGlow: true, isFrameRateShown: false, hasFullResolution: false, hasSmoothEdges: false, objectDetail: 'reduced', faceFeature: 'nose', isNerdModeOn: false, temperatureUnit: 'celsius', cameraMode: 'room', controlScheme: 'twoSticks', stickLayout: 'walkOnTheLeft' })
})

test('roomSettings_savedBeforeTheCameraWasASetting_openInTheRoomViewWithTheControlsOfThisDeviceAndTheWalkStickOnTheLeft', () => {
  const settings = roomSettingsFrom({ coatColour: '#7a4a7f' }, 'mouseAndKeyboard')

  assert.deepEqual([settings.cameraMode, settings.controlScheme, settings.stickLayout], ['room', 'mouseAndKeyboard', 'walkOnTheLeft'])
})

test('roomSettings_savedBeforeAchievementsCouldBeShown_hideThem', () => {
  const settings = roomSettingsFrom({ coatColour: '#7a4a7f', isNerdModeOn: true }, 'twoSticks')

  assert.equal(settings.areAchievementsShown, false)
})
