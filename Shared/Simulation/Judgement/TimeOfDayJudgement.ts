import type { Atmosphere, TimeOfDay } from '../Definitions/Atmosphere.ts'
import { clampedToShare } from '../Physics/ClampedToShare.ts'

type HoursWindow = {
  readonly earliest: number
  readonly latest: number
}

const timesOfDayInTheirOrder: readonly TimeOfDay[] = ['dawn', 'morning', 'day', 'sunset', 'dusk', 'night']

const hoursSinceSunriseWindows: Readonly<Record<TimeOfDay, HoursWindow>> = {
  dawn: { earliest: 0.8, latest: 2.2 },
  morning: { earliest: 2.2, latest: 3.5 },
  day: { earliest: 3, latest: 8 },
  sunset: { earliest: 10, latest: 11.4 },
  dusk: { earliest: 11.4, latest: 11.8 },
  night: { earliest: 11.8, latest: 11.95 },
}

export function hoursSinceSunriseOf(atmosphere: Atmosphere): number {
  const { earliest, latest } = hoursSinceSunriseWindows[atmosphere.timeOfDay]
  return earliest + (latest - earliest) * clampedToShare(atmosphere.shareThroughTheTimeOfDay)
}

export function timeOfDayAfter(timeOfDay: TimeOfDay, offered: readonly TimeOfDay[]): TimeOfDay {
  const start = timesOfDayInTheirOrder.indexOf(timeOfDay)
  for (let step = 1; step <= timesOfDayInTheirOrder.length; step += 1) {
    const candidate = timesOfDayInTheirOrder[(start + step) % timesOfDayInTheirOrder.length]
    if (candidate !== undefined && offered.includes(candidate)) return candidate
  }
  return timeOfDay
}
