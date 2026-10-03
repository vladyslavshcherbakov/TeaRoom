import { controlSchemes, stickLayouts, type ControlScheme } from '../../Engine/Camera/FirstPersonControls.ts'
import { defaultsOf, oneOf, onOff, someOf, type SettingsOf } from '../../Engine/SettingValues.ts'
import { soundLoudnesses } from '../../Engine/Audio/SoundLoudness.ts'
import { temperatureUnits } from '../../Engine/Temperatures.ts'

export const coatColours = ['#3f7f8f', '#4a5a9a', '#7a4a7f', '#a8523a', '#6b7a3a', '#c9a13a', '#3a3a3a', '#e6dcc8'] as const

export type CoatColour = (typeof coatColours)[number]

export const faceFeatures = ['nose', 'eyes', 'googlyEyes', 'ears', 'afro', 'giantAfro'] as const

export type FaceFeature = (typeof faceFeatures)[number]

export const cameraModes = ['room', 'firstPerson'] as const

export type CameraMode = (typeof cameraModes)[number]

export const objectDetails = ['full', 'reduced'] as const

export type ObjectDetail = (typeof objectDetails)[number]

export const faceFeaturesOfANewGame: readonly [FaceFeature, ...FaceFeature[]] = ['nose', 'eyes', 'ears']

export const roomSettingValues = {
  areAchievementsShown: onOff(true),
  soundLoudness: oneOf(soundLoudnesses, 'full'),
  coatColour: oneOf(coatColours, coatColours[0]),
  hasSoftShadowsInCorners: onOff(false),
  hasGlow: onOff(true),
  isFrameRateShown: onOff(false),
  hasFullResolution: onOff(false),
  hasSmoothEdges: onOff(false),
  objectDetail: oneOf(objectDetails, 'reduced'),
  faceFeaturesShown: someOf(faceFeatures, ['nose']),
  isNerdModeOn: onOff(false),
  temperatureUnit: oneOf(temperatureUnits, 'celsius'),
  cameraMode: oneOf(cameraModes, 'room'),
  controlScheme: oneOf(controlSchemes, 'twoSticks'),
  stickLayout: oneOf(stickLayouts, 'walkOnTheLeft'),
}

export type RoomSettings = SettingsOf<typeof roomSettingValues>

export type RoomSettingName = keyof RoomSettings

export function defaultRoomSettingsWith(controlScheme: ControlScheme): RoomSettings {
  return { ...defaultsOf(roomSettingValues), controlScheme }
}
