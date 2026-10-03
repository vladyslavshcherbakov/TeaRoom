import assert from 'node:assert/strict'
import test from 'node:test'
import { debugSettingValues } from '../../../../Apps/Game/Room/Debug/DebugSettings.ts'
import { settingsFrom } from '../../../../Apps/Engine/SettingValues.ts'

test('debugSettings_savedWithAHeightEveryToggleOnAndASparrowAnimation_keepThemAll', () => {
  const saved = { playerHeightCentimetres: 180, isFrameBudgetShown: true, isTheWorldFast: true, sparrowAnimation: 'Fly' }

  assert.deepEqual(settingsFrom(debugSettingValues, saved), saved)
})

test('debugSettings_savedWithAHeightTheGameDoesNotHaveAndNothingElse_fallBackTo165cmEveryToggleOffAndTheIdleSparrow', () => {
  const settings = settingsFrom(debugSettingValues, { playerHeightCentimetres: 400 })

  assert.deepEqual(settings, { playerHeightCentimetres: 165, isFrameBudgetShown: false, isTheWorldFast: false, sparrowAnimation: 'Idle_A' })
})
