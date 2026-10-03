import assert from 'node:assert/strict'
import test from 'node:test'
import { debugSettingValues } from '../../../Apps/Game/Room/Debug/DebugSettings.ts'
import { debugMenuRows } from '../../../Apps/Game/Room/Rendering/Controls/DebugMenu.ts'

test('debugMenu_showsEveryDebugSettingInExactlyOneRow', () => {
  const settingsInRows = debugMenuRows.map((row) => row.setting)

  assert.deepEqual([...settingsInRows].sort(), Object.keys(debugSettingValues).sort())
})
