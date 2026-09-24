const evaporationMlPerSecond = 0.05
const slowStrokeCmPerSecond = 50
const fastStrokeCmPerSecond = 200
const slowStrokeEfficiency = 0.8
const fastStrokeEfficiency = 0.3
const soakingMlPerSecond = 0.5
const clothHoldsMl = 40

export function wetMlAfterDrying(wetMl: number, seconds: number): number {
  return Math.max(0, wetMl - evaporationMlPerSecond * seconds)
}

export function mlSoakedUp(tableWetMl: number, clothWetMl: number, seconds: number): number {
  return Math.max(0, Math.min(tableWetMl, soakingMlPerSecond * seconds, clothHoldsMl - clothWetMl))
}

export function wetMlAfterWiping(wetMl: number, strokeSpeedCmPerSecond: number, coveredFraction: number): number {
  const coverage = Math.min(1, Math.max(0, coveredFraction))
  return wetMl * (1 - strokeEfficiency(strokeSpeedCmPerSecond)) ** coverage
}

function strokeEfficiency(strokeSpeedCmPerSecond: number): number {
  if (strokeSpeedCmPerSecond <= slowStrokeCmPerSecond) return slowStrokeEfficiency
  if (strokeSpeedCmPerSecond >= fastStrokeCmPerSecond) return fastStrokeEfficiency
  const shareOfTheWayToFast = (strokeSpeedCmPerSecond - slowStrokeCmPerSecond) / (fastStrokeCmPerSecond - slowStrokeCmPerSecond)
  return slowStrokeEfficiency + (fastStrokeEfficiency - slowStrokeEfficiency) * shareOfTheWayToFast
}
