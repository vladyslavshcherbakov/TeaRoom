import { controlSchemes, type ControlScheme } from './Camera/FirstPersonControls.ts'
import { temperatureUnits, type TemperatureUnit } from './Temperatures.ts'

export const coatColours = ['#3f7f8f', '#4a5a9a', '#7a4a7f', '#a8523a', '#6b7a3a', '#c9a13a', '#3a3a3a', '#e6dcc8'] as const

export type CoatColour = (typeof coatColours)[number]

export const faceFeatures = ['nose', 'eyes', 'ears', 'afro'] as const

export type FaceFeature = (typeof faceFeatures)[number]

export const cameraModes = ['room', 'firstPerson'] as const

export type CameraMode = (typeof cameraModes)[number]

export const stickLayouts = ['walkOnTheLeft', 'lookOnTheLeft'] as const

export type StickLayout = (typeof stickLayouts)[number]

export const objectDetails = ['full', 'reduced'] as const

export type ObjectDetail = (typeof objectDetails)[number]

export const faceFeaturesOfANewGame: readonly [FaceFeature, ...FaceFeature[]] = ['nose', 'eyes', 'ears']

export type RoomSettings = {
  readonly areAchievementsShown: boolean
  readonly coatColour: CoatColour
  readonly hasSoftShadowsInCorners: boolean
  readonly hasGlow: boolean
  readonly isFrameRateShown: boolean
  readonly hasFullResolution: boolean
  readonly hasSmoothEdges: boolean
  readonly objectDetail: ObjectDetail
  readonly faceFeature: FaceFeature
  readonly isNerdModeOn: boolean
  readonly temperatureUnit: TemperatureUnit
  readonly cameraMode: CameraMode
  readonly controlScheme: ControlScheme
  readonly stickLayout: StickLayout
}

export function defaultRoomSettingsWith(controlScheme: ControlScheme): RoomSettings {
  return { areAchievementsShown: false, coatColour: coatColours[0], hasSoftShadowsInCorners: false, hasGlow: true, isFrameRateShown: false, hasFullResolution: false, hasSmoothEdges: false, objectDetail: 'reduced', faceFeature: 'nose', isNerdModeOn: false, temperatureUnit: 'celsius', cameraMode: 'room', controlScheme, stickLayout: 'walkOnTheLeft' }
}

export function roomSettingsFrom(saved: unknown, controlSchemeByDefault: ControlScheme): RoomSettings {
  const defaultRoomSettings = defaultRoomSettingsWith(controlSchemeByDefault)
  if (typeof saved !== 'object' || saved === null) return defaultRoomSettings
  const settings = saved as Partial<Record<keyof RoomSettings, unknown>>
  const coatColour = coatColours.find((colour) => colour === settings.coatColour) ?? defaultRoomSettings.coatColour
  const faceFeature = faceFeatures.find((feature) => feature === settings.faceFeature) ?? defaultRoomSettings.faceFeature
  const temperatureUnit = temperatureUnits.find((unit) => unit === settings.temperatureUnit) ?? defaultRoomSettings.temperatureUnit
  const cameraMode = cameraModes.find((mode) => mode === settings.cameraMode) ?? defaultRoomSettings.cameraMode
  const controlScheme = controlSchemes.find((scheme) => scheme === settings.controlScheme) ?? defaultRoomSettings.controlScheme
  const stickLayout = stickLayouts.find((layout) => layout === settings.stickLayout) ?? defaultRoomSettings.stickLayout
  return { areAchievementsShown: settings.areAchievementsShown === true, coatColour, hasSoftShadowsInCorners: settings.hasSoftShadowsInCorners === true, hasGlow: settings.hasGlow !== false, isFrameRateShown: settings.isFrameRateShown === true, hasFullResolution: settings.hasFullResolution === true, hasSmoothEdges: settings.hasSmoothEdges === true, objectDetail: objectDetails.find((detail) => detail === settings.objectDetail) ?? defaultRoomSettings.objectDetail, faceFeature, isNerdModeOn: settings.isNerdModeOn === true, temperatureUnit, cameraMode, controlScheme, stickLayout }
}
