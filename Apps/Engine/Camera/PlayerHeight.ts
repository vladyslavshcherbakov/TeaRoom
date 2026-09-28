import { clamped, easedAtBothEnds } from '../Arithmetic.ts'

export const lowestPlayerHeightCentimetres = 70
export const tallestPlayerHeightCentimetres = 200
export const playerHeightByDefaultCentimetres = 165

const standingEyeShareOfTheHeight = 0.93
const seatedEyeShareOfTheHeight = 0.55
const secondsToSitDownOrStandUp = 0.8

export function playerHeightSteppedBy(heightCentimetres: number, stepCentimetres: number): number {
  return clamped(heightCentimetres + stepCentimetres, lowestPlayerHeightCentimetres, tallestPlayerHeightCentimetres)
}

export function isAPlayerHeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= lowestPlayerHeightCentimetres && value <= tallestPlayerHeightCentimetres
}

export function seatedShareAfter(seatedShare: number, isSeated: boolean, seconds: number): number {
  const stepShare = seconds / secondsToSitDownOrStandUp
  return isSeated ? Math.min(1, seatedShare + stepShare) : Math.max(0, seatedShare - stepShare)
}

export function easedSeatedShare(seatedShare: number): number {
  return easedAtBothEnds(seatedShare)
}

export function eyeHeightMetres(heightCentimetres: number, seatedShare: number): number {
  const eyeShareOfTheHeight = standingEyeShareOfTheHeight + (seatedEyeShareOfTheHeight - standingEyeShareOfTheHeight) * easedSeatedShare(seatedShare)
  return (heightCentimetres / 100) * eyeShareOfTheHeight
}
