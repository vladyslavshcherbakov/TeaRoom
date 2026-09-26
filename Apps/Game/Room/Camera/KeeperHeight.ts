export const lowestKeeperHeightCentimetres = 70
export const tallestKeeperHeightCentimetres = 200
export const keeperHeightByDefaultCentimetres = 140

const standingEyeShareOfTheHeight = 0.93
const seatedEyeShareOfTheHeight = 0.55
const secondsToSitDownOrStandUp = 0.8

export function keeperHeightSteppedBy(heightCentimetres: number, stepCentimetres: number): number {
  return Math.min(tallestKeeperHeightCentimetres, Math.max(lowestKeeperHeightCentimetres, heightCentimetres + stepCentimetres))
}

export function isAKeeperHeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= lowestKeeperHeightCentimetres && value <= tallestKeeperHeightCentimetres
}

export function seatedShareAfter(seatedShare: number, isSeated: boolean, seconds: number): number {
  const stepShare = seconds / secondsToSitDownOrStandUp
  return isSeated ? Math.min(1, seatedShare + stepShare) : Math.max(0, seatedShare - stepShare)
}

export function easedSeatedShare(seatedShare: number): number {
  return seatedShare * seatedShare * (3 - 2 * seatedShare)
}

export function eyeHeightMetres(heightCentimetres: number, seatedShare: number): number {
  const eyeShareOfTheHeight = standingEyeShareOfTheHeight + (seatedEyeShareOfTheHeight - standingEyeShareOfTheHeight) * easedSeatedShare(seatedShare)
  return (heightCentimetres / 100) * eyeShareOfTheHeight
}
