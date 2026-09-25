import assert from 'node:assert/strict'
import test from 'node:test'
import { roomSettingsFrom } from '../../../Apps/Game/Room/RoomSettings.ts'

test('roomSettings_savedWithAColourFromThePalette_keepItAndTheShadows', () => {
  const settings = roomSettingsFrom({ coatColour: '#7a4a7f', hasSoftShadowsInCorners: true })

  assert.deepEqual(settings, { coatColour: '#7a4a7f', hasSoftShadowsInCorners: true })
})

test('roomSettings_savedWithAColourNoLongerInThePalette_fallBackToTheFirstColourWithShadowsOff', () => {
  const settings = roomSettingsFrom({ coatColour: '#ff00ff', hasSoftShadowsInCorners: 'yes' })

  assert.deepEqual(settings, { coatColour: '#3f7f8f', hasSoftShadowsInCorners: false })
})
