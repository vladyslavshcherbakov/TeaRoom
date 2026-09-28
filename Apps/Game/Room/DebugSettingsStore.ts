import { settingsStore } from '../../Engine/SettingValues.ts'
import type { StoreWithADefault } from '../../Engine/BrowserStorage.ts'
import type { AppLog } from '../../Engine/AppLog.ts'
import { debugSettingsByDefault, debugSettingValues, type DebugSettings } from './DebugSettings.ts'

export function debugSettingsStore(log: AppLog): StoreWithADefault<DebugSettings> {
  return settingsStore(debugSettingValues, { key: 'debugSettings', name: 'the debug settings' }, debugSettingsByDefault, log)
}
