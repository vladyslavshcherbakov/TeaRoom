export const lowestKeeperHeightCentimetres = 70
export const tallestKeeperHeightCentimetres = 200
export const keeperHeightByDefaultCentimetres = 140

const standingEyeShareOfTheHeight = 0.93
const seatedEyeShareOfTheHeight = 0.55

export function keeperHeightSteppedBy(heightCentimetres: number, stepCentimetres: number): number {
  return Math.min(tallestKeeperHeightCentimetres, Math.max(lowestKeeperHeightCentimetres, heightCentimetres + stepCentimetres))
}

export function isAKeeperHeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= lowestKeeperHeightCentimetres && value <= tallestKeeperHeightCentimetres
}

export function eyeHeightMetres(heightCentimetres: number, isSeated: boolean): number {
  return (heightCentimetres / 100) * (isSeated ? seatedEyeShareOfTheHeight : standingEyeShareOfTheHeight)
}
