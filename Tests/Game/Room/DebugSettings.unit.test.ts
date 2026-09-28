import assert from 'node:assert/strict'
import test from 'node:test'
import { debugSettingValues } from '../../../Apps/Game/Room/DebugSettings.ts'
import { settingsFrom } from '../../../Apps/Engine/SettingValues.ts'

test('debugSettings_savedWithAHeightAndEveryToggleOn_keepThemAll', () => {
  const saved = { playerHeightCentimetres: 180, isFrameBudgetShown: true, isTheWorldFast: true }

  assert.deepEqual(settingsFrom(debugSettingValues, saved), saved)
})

test('debugSettings_savedWithAHeightTheGameDoesNotHaveAndNoToggles_fallBackTo165cmWithEveryToggleOff', () => {
  const settings = settingsFrom(debugSettingValues, { playerHeightCentimetres: 400 })

  assert.deepEqual(settings, { playerHeightCentimetres: 165, isFrameBudgetShown: false, isTheWorldFast: false })
})
