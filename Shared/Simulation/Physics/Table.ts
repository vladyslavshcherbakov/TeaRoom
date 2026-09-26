import { clampedToShare } from './ClampedToShare.ts'

const evaporationMlPerSecond = 0.1
const evaporationDoublesAtC = 90
const puddleCoolingPerSecond = 0.03
const slowStrokeCmPerSecond = 50
const fastStrokeCmPerSecond = 200
const slowStrokeEfficiency = 0.8
const fastStrokeEfficiency = 0.3
const soakingMlPerSecond = 0.5
const cleanClothDryingMlPerSecond = 0.1
const stainedClothDryingMlPerSecond = 0.03
const strongTeaMlThatStainsTheClothFully = 20
const strongestTea = 100
const washingAFullStainOffSeconds = 10
const wrungClothHoldsMl = 8
const steamingOffAHotPlateMlPerSecond = 2
const washingAFullCharringOffSeconds = 5
const clothHoldsMl = 40

export function wetMlAfterDrying(wetMl: number, temperatureC: number, ambientC: number, seconds: number): number {
  const warmthShare = Math.max(0, (temperatureC - ambientC) / (evaporationDoublesAtC - ambientC))
  return Math.max(0, wetMl - evaporationMlPerSecond * (1 + warmthShare) * seconds)
}

export function puddleTemperatureAfterCooling(temperatureC: number, ambientC: number, seconds: number): number {
  return temperatureC + (ambientC - temperatureC) * Math.min(1, puddleCoolingPerSecond * seconds)
}

export function puddleStrengthAfterSpill(wetMl: number, strength: number, spilledMl: number, spilledStrength: number): number {
  return mixedBySpill(wetMl, strength, spilledMl, spilledStrength)
}

export function puddleTemperatureAfterSpill(wetMl: number, temperatureC: number, spilledMl: number, spilledTemperatureC: number): number {
  return mixedBySpill(wetMl, temperatureC, spilledMl, spilledTemperatureC)
}

export function clothStainAfterTakingIn(stain: number, takenMl: number, strength: number): number {
  return Math.min(1, stain + (takenMl * (strength / strongestTea)) / strongTeaMlThatStainsTheClothFully)
}

export function clothWetMlAfterDrying(wetMl: number, stain: number, seconds: number): number {
  const dryingMlPerSecond = cleanClothDryingMlPerSecond + (stainedClothDryingMlPerSecond - cleanClothDryingMlPerSecond) * stain
  return Math.max(0, wetMl - dryingMlPerSecond * seconds)
}

export function clothStainAfterWashing(stain: number, seconds: number): number {
  return Math.max(0, stain - seconds / washingAFullStainOffSeconds)
}

export function clothWetMlUnderTheTap(wetMl: number, flowMlPerSecond: number, seconds: number): number {
  return Math.max(wetMl, Math.min(clothHoldsMl, wetMl + flowMlPerSecond * seconds))
}

export function clothWetMlAfterWringing(wetMl: number): number {
  return Math.min(wetMl, wrungClothHoldsMl)
}

export function clothWetMlOnAHotPlate(wetMl: number, seconds: number): number {
  return Math.max(0, wetMl - steamingOffAHotPlateMlPerSecond * seconds)
}

export function clothCharringAfterWashing(charring: number, seconds: number): number {
  return Math.max(0, charring - seconds / washingAFullCharringOffSeconds)
}

export function mlSoakedUp(tableWetMl: number, clothWetMl: number, seconds: number): number {
  return Math.max(0, Math.min(tableWetMl, soakingMlPerSecond * seconds, clothHoldsMl - clothWetMl))
}

export function wetMlAfterWiping(wetMl: number, strokeSpeedCmPerSecond: number, coveredFraction: number): number {
  const coverage = clampedToShare(coveredFraction)
  return wetMl * (1 - strokeEfficiency(strokeSpeedCmPerSecond)) ** coverage
}

function strokeEfficiency(strokeSpeedCmPerSecond: number): number {
  if (strokeSpeedCmPerSecond <= slowStrokeCmPerSecond) return slowStrokeEfficiency
  if (strokeSpeedCmPerSecond >= fastStrokeCmPerSecond) return fastStrokeEfficiency
  const shareOfTheWayToFast = (strokeSpeedCmPerSecond - slowStrokeCmPerSecond) / (fastStrokeCmPerSecond - slowStrokeCmPerSecond)
  return slowStrokeEfficiency + (fastStrokeEfficiency - slowStrokeEfficiency) * shareOfTheWayToFast
}

function mixedBySpill(wetMl: number, value: number, spilledMl: number, spilledValue: number): number {
  const wetMlAfterSpill = wetMl + spilledMl
  if (wetMlAfterSpill === 0) return spilledValue
  return (wetMl * value + spilledMl * spilledValue) / wetMlAfterSpill
}
