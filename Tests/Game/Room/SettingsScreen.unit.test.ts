import assert from 'node:assert/strict'
import test from 'node:test'
import { roomSettingValues } from '../../../Apps/Game/Room/RoomSettings.ts'
import { settingsScreenRows } from '../../../Apps/Game/Room/Rendering/Controls/SettingsScreen.ts'

test('settingsScreen_showsEverySettingInExactlyOneRow', () => {
  const settingsInRows = settingsScreenRows.flatMap((row) => (row.setting === null ? [] : [row.setting]))

  assert.deepEqual([...settingsInRows].sort(), Object.keys(roomSettingValues).sort())
})
