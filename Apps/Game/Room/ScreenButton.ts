export const screenButtons = ['sip', 'tilt', 'whyPouring', 'leaveFirstPerson'] as const

export type ScreenButton = (typeof screenButtons)[number]
