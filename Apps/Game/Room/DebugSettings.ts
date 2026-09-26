import { isAKeeperHeight, keeperHeightByDefaultCentimetres } from './Camera/KeeperHeight.ts'

export type DebugSettings = {
  readonly keeperHeightCentimetres: number
  readonly isFrameBudgetShown: boolean
  readonly areEyesGoogly: boolean
  readonly isAfroGiant: boolean
  readonly isEveryFaceShown: boolean
}

export const debugSettingsByDefault: DebugSettings = { keeperHeightCentimetres: keeperHeightByDefaultCentimetres, isFrameBudgetShown: false, areEyesGoogly: false, isAfroGiant: false, isEveryFaceShown: false }

export function debugSettingsFrom(saved: unknown): DebugSettings {
  if (typeof saved !== 'object' || saved === null) return debugSettingsByDefault
  const settings = saved as Partial<Record<keyof DebugSettings, unknown>>
  return {
    keeperHeightCentimetres: isAKeeperHeight(settings.keeperHeightCentimetres) ? settings.keeperHeightCentimetres : keeperHeightByDefaultCentimetres,
    isFrameBudgetShown: settings.isFrameBudgetShown === true,
    areEyesGoogly: settings.areEyesGoogly === true,
    isAfroGiant: settings.isAfroGiant === true,
    isEveryFaceShown: settings.isEveryFaceShown === true,
  }
}

export function describeDebugSettings(settings: DebugSettings): string {
  const onOrOff = (isOn: boolean): string => (isOn ? 'on' : 'off')
  return `keeper ${settings.keeperHeightCentimetres} cm, frame budget ${onOrOff(settings.isFrameBudgetShown)}, googly eyes ${onOrOff(settings.areEyesGoogly)}, giant afro ${onOrOff(settings.isAfroGiant)}, every face at once ${onOrOff(settings.isEveryFaceShown)}`
}
