export type HowItChars = {
  readonly charsThroughOnAHotPlateSeconds: number
  readonly burnsFromCharring: number
}

export const howTheSpoonChars: HowItChars = { charsThroughOnAHotPlateSeconds: 20, burnsFromCharring: 0.8 }
export const howAClothChars: HowItChars = { charsThroughOnAHotPlateSeconds: 60, burnsFromCharring: 0.8 }

export function charringOnAHotPlate(charring: number, how: HowItChars, seconds: number): number {
  return Math.min(1, charring + seconds / how.charsThroughOnAHotPlateSeconds)
}

export function isBurning(charring: number, how: HowItChars): boolean {
  return charring >= how.burnsFromCharring
}
