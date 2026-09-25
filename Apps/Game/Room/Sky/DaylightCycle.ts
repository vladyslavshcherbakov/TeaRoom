import type { TimeOfDay } from '../../../../Shared/Simulation/Definitions/Atmosphere.ts'

export type Daylight = {
  readonly sunPosition: { readonly x: number; readonly y: number; readonly z: number }
  readonly warmth: number
  readonly sunIntensity: number
  readonly skyIntensity: number
}

type HoursWindow = {
  readonly earliest: number
  readonly latest: number
}

const daylightHours = 12
const noonHours = 6
const sunFacesTheOpenSideFromHours = 10
const sunDistanceMetres = 8
const sunHighestMetres = 8
const sunLowestMetres = 0.8
const sunriseDirectionRadians = Math.atan2(-6, 8)
const noonDirectionRadians = -Math.PI / 2
const sunsetDirectionTurnedPastWestRadians = Math.atan2(8, -3) - 2 * Math.PI
const faintestSunShare = 0.25
const brightestSunIntensity = 2.1
const faintestSkyIntensity = 1.1
const brightestSkyIntensity = 1.45

const hoursSinceSunriseWindows: Readonly<Record<TimeOfDay, HoursWindow>> = {
  dawn: { earliest: 0.8, latest: 2.2 },
  morning: { earliest: 2.2, latest: 3.5 },
  day: { earliest: 3, latest: 8 },
  sunset: { earliest: 10, latest: 11.4 },
  dusk: { earliest: 11.4, latest: 11.8 },
  night: { earliest: 11.8, latest: 11.95 },
}

export function hoursSinceSunriseFor(timeOfDay: TimeOfDay, shareThroughTheWindow: number): number {
  const { earliest, latest } = hoursSinceSunriseWindows[timeOfDay]
  return earliest + (latest - earliest) * Math.min(1, Math.max(0, shareThroughTheWindow))
}

export function daylightAt(hoursSinceSunrise: number): Daylight {
  const elevation = Math.sin((Math.PI * hoursSinceSunrise) / daylightHours)
  const brightness = faintestSunShare + (1 - faintestSunShare) * Math.sqrt(elevation)
  const direction = sunDirectionRadiansAt(hoursSinceSunrise)
  return {
    sunPosition: {
      x: sunDistanceMetres * Math.cos(direction),
      y: sunLowestMetres + (sunHighestMetres - sunLowestMetres) * elevation,
      z: sunDistanceMetres * Math.sin(direction),
    },
    warmth: 1 - elevation,
    sunIntensity: brightestSunIntensity * brightness,
    skyIntensity: faintestSkyIntensity + (brightestSkyIntensity - faintestSkyIntensity) * elevation,
  }
}

function sunDirectionRadiansAt(hoursSinceSunrise: number): number {
  if (hoursSinceSunrise <= noonHours) {
    return sunriseDirectionRadians + (noonDirectionRadians - sunriseDirectionRadians) * (hoursSinceSunrise / noonHours)
  }
  const shareOfTheTurnToTheOpenSide = Math.min(1, (hoursSinceSunrise - noonHours) / (sunFacesTheOpenSideFromHours - noonHours))
  return noonDirectionRadians + (sunsetDirectionTurnedPastWestRadians - noonDirectionRadians) * shareOfTheTurnToTheOpenSide
}
