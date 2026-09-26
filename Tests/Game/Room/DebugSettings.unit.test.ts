import assert from 'node:assert/strict'
import test from 'node:test'
import { debugSettingsFrom } from '../../../Apps/Game/Room/DebugSettings.ts'

test('debugSettings_savedWithAHeightAndEveryToggleOn_keepThemAll', () => {
  const saved = { keeperHeightCentimetres: 180, isFrameBudgetShown: true, areEyesGoogly: true, isAfroGiant: true, isEveryFaceShown: true }

  assert.deepEqual(debugSettingsFrom(saved), saved)
})

test('debugSettings_savedWithAHeightTheGameDoesNotHaveAndNoToggles_fallBackTo165cmWithEveryToggleOff', () => {
  const settings = debugSettingsFrom({ keeperHeightCentimetres: 400 })

  assert.deepEqual(settings, { keeperHeightCentimetres: 165, isFrameBudgetShown: false, areEyesGoogly: false, isAfroGiant: false, isEveryFaceShown: false })
})
