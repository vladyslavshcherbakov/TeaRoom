export function isTheThermostatCallingForHeat(isHeating: boolean, measuredWaterC: number | null, targetC: number, heatsAgainBelowTheTargetByC: number): boolean {
  if (measuredWaterC === null) return false
  if (isHeating) return measuredWaterC < targetC
  return measuredWaterC <= targetC - heatsAgainBelowTheTargetByC
}
