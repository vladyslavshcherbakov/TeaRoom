import assert from 'node:assert/strict'
import test from 'node:test'
import { roomSettingsFrom } from '../../../Apps/Game/Room/RoomSettings.ts'

test('roomSettings_savedWithAColourAndAFaceFromTheLists_keepThemTheShadowsAndTheFrameRate', () => {
  const settings = roomSettingsFrom({ coatColour: '#7a4a7f', hasSoftShadowsInCorners: true, isFrameRateShown: true, faceFeature: 'afro' })

  assert.deepEqual(settings, { coatColour: '#7a4a7f', hasSoftShadowsInCorners: true, isFrameRateShown: true, faceFeature: 'afro' })
})

test('roomSettings_savedWithAColourAndAFaceNoLongerOfferedAndNoFrameRate_fallBackToTheFirstColourANoseShadowsOffAndTheFrameRateHidden', () => {
  const settings = roomSettingsFrom({ coatColour: '#ff00ff', hasSoftShadowsInCorners: 'yes', faceFeature: 'moustache' })

  assert.deepEqual(settings, { coatColour: '#3f7f8f', hasSoftShadowsInCorners: false, isFrameRateShown: false, faceFeature: 'nose' })
})
