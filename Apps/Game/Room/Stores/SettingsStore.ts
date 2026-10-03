import { settingsStore as storeOfSettings } from '../../../Engine/SettingValues.ts'
import type { StoreWithADefault } from '../../../Engine/BrowserStorage.ts'
import type { AppLog } from '../../../Engine/AppLog.ts'
import type { ControlScheme } from '../../../Engine/Camera/FirstPersonControls.ts'
import { defaultRoomSettingsWith, roomSettingValues, type RoomSettings } from '../RoomSettings.ts'

export function settingsStore(log: AppLog, controlSchemeByDefault: ControlScheme): StoreWithADefault<RoomSettings> {
  return storeOfSettings(roomSettingValues, { key: 'settings', name: 'the settings' }, defaultRoomSettingsWith(controlSchemeByDefault), log)
}
