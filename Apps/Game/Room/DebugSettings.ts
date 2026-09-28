import { isAPlayerHeight, playerHeightByDefaultCentimetres } from '../../Engine/Camera/PlayerHeight.ts'
import { defaultsOf, numberWhere, onOff, type SettingsOf } from '../../Engine/SettingValues.ts'

export const debugSettingValues = {
  playerHeightCentimetres: numberWhere(isAPlayerHeight, playerHeightByDefaultCentimetres),
  isFrameBudgetShown: onOff(false),
  isTheWorldFast: onOff(false),
}

export type DebugSettings = SettingsOf<typeof debugSettingValues>

export const debugSettingsByDefault: DebugSettings = defaultsOf(debugSettingValues)
