export const daylightHours = 12
export const realSecondsPerDaylightHour = 120
export const firstHourAfterSunrise = 1

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

export function hoursAfter(hoursSinceSunrise: number, realSeconds: number): number {
  const hours = hoursSinceSunrise + realSeconds / realSecondsPerDaylightHour
  return hours % daylightHours
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
