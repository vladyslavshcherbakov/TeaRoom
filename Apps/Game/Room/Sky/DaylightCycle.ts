import type { TimeOfDay } from '../../../../Shared/Simulation/Definitions/Atmosphere.ts'

const daylightHours = 12

export type Daylight = {
  readonly sunPosition: { readonly x: number; readonly y: number; readonly z: number }
  readonly warmth: number
  readonly sunIntensity: number
  readonly skyIntensity: number
}

const sunDistanceEastToWestMetres = 8
const sunHighestMetres = 8
const sunLowestMetres = 0.8
const sunBehindTheWindowMetres = -6
const faintestSunShare = 0.25
const brightestSunIntensity = 2.1
const faintestSkyIntensity = 1.1
const brightestSkyIntensity = 1.45

const hoursSinceSunriseAt: Readonly<Record<TimeOfDay, number>> = { dawn: 0.8, morning: 2.5, day: 5.5, sunset: 11.2, dusk: 11.7, night: 11.9 }

export function daylightFor(timeOfDay: TimeOfDay): Daylight {
  return daylightAt(hoursSinceSunriseAt[timeOfDay])
}

export function daylightAt(hoursSinceSunrise: number): Daylight {
  const arc = (Math.PI * hoursSinceSunrise) / daylightHours
  const elevation = Math.sin(arc)
  const brightness = faintestSunShare + (1 - faintestSunShare) * Math.sqrt(elevation)
  return {
    sunPosition: {
      x: sunDistanceEastToWestMetres * Math.cos(arc),
      y: sunLowestMetres + (sunHighestMetres - sunLowestMetres) * elevation,
      z: sunBehindTheWindowMetres,
    },
    warmth: 1 - elevation,
    sunIntensity: brightestSunIntensity * brightness,
    skyIntensity: faintestSkyIntensity + (brightestSkyIntensity - faintestSkyIntensity) * elevation,
  }
}
