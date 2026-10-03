import { isAPlayerHeight, playerHeightByDefaultCentimetres } from '../../Engine/Camera/PlayerHeight.ts'
import { defaultsOf, numberWhere, oneOf, onOff, type SettingsOf } from '../../Engine/SettingValues.ts'
import { sparrowAnimations } from './SparrowAnimations.ts'

export const debugSettingValues = {
  playerHeightCentimetres: numberWhere(isAPlayerHeight, playerHeightByDefaultCentimetres),
  isFrameBudgetShown: onOff(false),
  isTheWorldFast: onOff(false),
  sparrowAnimation: oneOf(sparrowAnimations, 'Idle_A'),
}

export type DebugSettings = SettingsOf<typeof debugSettingValues>

export const debugSettingsByDefault: DebugSettings = defaultsOf(debugSettingValues)
