import assert from 'node:assert/strict'
import test from 'node:test'
import { roomSettingsFrom } from '../../../Apps/Game/Room/RoomSettings.ts'

test('roomSettings_savedWithAColourFromThePalette_keepItTheShadowsAndTheFrameRate', () => {
  const settings = roomSettingsFrom({ coatColour: '#7a4a7f', hasSoftShadowsInCorners: true, isFrameRateShown: true })

  assert.deepEqual(settings, { coatColour: '#7a4a7f', hasSoftShadowsInCorners: true, isFrameRateShown: true })
})

test('roomSettings_savedWithAColourNoLongerInThePaletteAndNoFrameRate_fallBackToTheFirstColourWithShadowsOffAndTheFrameRateHidden', () => {
  const settings = roomSettingsFrom({ coatColour: '#ff00ff', hasSoftShadowsInCorners: 'yes' })

  assert.deepEqual(settings, { coatColour: '#3f7f8f', hasSoftShadowsInCorners: false, isFrameRateShown: false })
})
