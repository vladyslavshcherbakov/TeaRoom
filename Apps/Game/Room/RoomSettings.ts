export const coatColours = ['#3f7f8f', '#4a5a9a', '#7a4a7f', '#a8523a', '#6b7a3a', '#c9a13a', '#3a3a3a', '#e6dcc8'] as const

export type CoatColour = (typeof coatColours)[number]

export const faceFeatures = ['nose', 'eyes', 'ears', 'afro'] as const

export type FaceFeature = (typeof faceFeatures)[number]

export type RoomSettings = {
  readonly coatColour: CoatColour
  readonly hasSoftShadowsInCorners: boolean
  readonly isFrameRateShown: boolean
  readonly faceFeature: FaceFeature
}

export const defaultRoomSettings: RoomSettings = { coatColour: coatColours[0], hasSoftShadowsInCorners: false, isFrameRateShown: false, faceFeature: 'nose' }

export function roomSettingsFrom(saved: unknown): RoomSettings {
  if (typeof saved !== 'object' || saved === null) return defaultRoomSettings
  const settings = saved as Partial<Record<keyof RoomSettings, unknown>>
  const coatColour = coatColours.find((colour) => colour === settings.coatColour) ?? defaultRoomSettings.coatColour
  const faceFeature = faceFeatures.find((feature) => feature === settings.faceFeature) ?? defaultRoomSettings.faceFeature
  return { coatColour, hasSoftShadowsInCorners: settings.hasSoftShadowsInCorners === true, isFrameRateShown: settings.isFrameRateShown === true, faceFeature }
}
