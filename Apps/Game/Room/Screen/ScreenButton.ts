export const screenButtons = ['tilt', 'whyPouring', 'leaveFirstPerson'] as const

export type ScreenButton = (typeof screenButtons)[number]
