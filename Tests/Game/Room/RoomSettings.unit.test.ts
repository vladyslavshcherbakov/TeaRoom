import assert from 'node:assert/strict'
import test from 'node:test'
import { roomSettingsFrom } from '../../../Apps/Game/Room/RoomSettings.ts'

test('roomSettings_savedWithAColourAFaceAUnitAndACameraFromTheLists_keepThemTheShadowsTheGlowTheFrameRateTheResolutionTheSmoothEdgesTheObjectDetailAndNerdMode', () => {
  const saved = { coatColour: '#7a4a7f', hasSoftShadowsInCorners: true, hasGlow: false, isFrameRateShown: true, hasFullResolution: true, hasSmoothEdges: true, objectDetail: 'full', faceFeature: 'afro', isNerdModeOn: true, temperatureUnit: 'fahrenheit', cameraMode: 'firstPerson', controlScheme: 'keyboardAndLookStick', stickLayout: 'lookOnTheLeft' }

  const settings = roomSettingsFrom(saved, 'twoSticks')

  assert.deepEqual(settings, saved)
})

test('roomSettings_savedWithAColourAFaceAndAUnitNoLongerOfferedAndNoGlowFrameRateOrNerdMode_fallBackToTheFirstColourANoseCelsiusTheGlowOnReducedObjectDetailTheRoomViewAndTheRestOff', () => {
  const settings = roomSettingsFrom({ coatColour: '#ff00ff', hasSoftShadowsInCorners: 'yes', faceFeature: 'moustache', temperatureUnit: 'kelvin' }, 'twoSticks')

  assert.deepEqual(settings, { coatColour: '#3f7f8f', hasSoftShadowsInCorners: false, hasGlow: true, isFrameRateShown: false, hasFullResolution: false, hasSmoothEdges: false, objectDetail: 'reduced', faceFeature: 'nose', isNerdModeOn: false, temperatureUnit: 'celsius', cameraMode: 'room', controlScheme: 'twoSticks', stickLayout: 'walkOnTheLeft' })
})

test('roomSettings_savedBeforeTheCameraWasASetting_openInTheRoomViewWithTheControlsOfThisDeviceAndTheWalkStickOnTheLeft', () => {
  const settings = roomSettingsFrom({ coatColour: '#7a4a7f' }, 'mouseAndKeyboard')

  assert.deepEqual([settings.cameraMode, settings.controlScheme, settings.stickLayout], ['room', 'mouseAndKeyboard', 'walkOnTheLeft'])
})
