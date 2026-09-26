import assert from 'node:assert/strict'
import test from 'node:test'
import { roomSettingsFrom } from '../../../Apps/Game/Room/RoomSettings.ts'

test('roomSettings_savedWithAColourAFaceAndAUnitFromTheLists_keepThemTheShadowsTheGlowTheFrameRateAndNerdMode', () => {
  const settings = roomSettingsFrom({ coatColour: '#7a4a7f', hasSoftShadowsInCorners: true, hasGlow: false, isFrameRateShown: true, faceFeature: 'afro', isNerdModeOn: true, temperatureUnit: 'fahrenheit' })

  assert.deepEqual(settings, { coatColour: '#7a4a7f', hasSoftShadowsInCorners: true, hasGlow: false, isFrameRateShown: true, faceFeature: 'afro', isNerdModeOn: true, temperatureUnit: 'fahrenheit' })
})

test('roomSettings_savedWithAColourAFaceAndAUnitNoLongerOfferedAndNoGlowFrameRateOrNerdMode_fallBackToTheFirstColourANoseCelsiusTheGlowOnAndTheRestOff', () => {
  const settings = roomSettingsFrom({ coatColour: '#ff00ff', hasSoftShadowsInCorners: 'yes', faceFeature: 'moustache', temperatureUnit: 'kelvin' })

  assert.deepEqual(settings, { coatColour: '#3f7f8f', hasSoftShadowsInCorners: false, hasGlow: true, isFrameRateShown: false, faceFeature: 'nose', isNerdModeOn: false, temperatureUnit: 'celsius' })
})
