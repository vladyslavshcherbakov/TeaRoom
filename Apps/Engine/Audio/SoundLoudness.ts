export const soundLoudnesses = ['full', 'medium', 'quiet', 'off'] as const

export type SoundLoudness = (typeof soundLoudnesses)[number]

export const shareOfEverySoundsLoudnessBySetting: Readonly<Record<SoundLoudness, number>> = {
  full: 1,
  medium: 0.5,
  quiet: 0.25,
  off: 0,
}
