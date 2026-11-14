export const timesOfTheEvening = ['dusk', 'twilight', 'night'] as const

export type TimeOfTheEvening = (typeof timesOfTheEvening)[number]

export function laterOf(first: TimeOfTheEvening, second: TimeOfTheEvening): TimeOfTheEvening {
  return timesOfTheEvening.indexOf(second) > timesOfTheEvening.indexOf(first) ? second : first
}

export function timeNamed(name: string): TimeOfTheEvening | null {
  return timesOfTheEvening.find((time) => time === name) ?? null
}
