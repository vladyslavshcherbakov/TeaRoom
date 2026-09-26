import type { HeaterDefinition } from '../Definitions/HeaterDefinition.ts'
import type { VesselDefinition } from '../Definitions/VesselDefinition.ts'
import { isEmpty, smallestMeaningfulVolumeMl, type Liquid } from './Liquid.ts'

const boilingPointC = 100
const shellHeatsThroughSeconds = 60
const shellCoolsDownSeconds = 60
const shellTooHotToHoldFrom = 0.2
const joulesInAKilowattHour = 3_600_000

export function heatLiquid(liquid: Liquid, heater: HeaterDefinition, shareOfTheHeatKept: number, seconds: number, highestC = boilingPointC): Liquid {
  const ceilingC = Math.min(boilingPointC, highestC)
  if (isEmpty(liquid) || liquid.temperatureC >= ceilingC) return liquid
  const risePerSecond = heater.degreesPerSecondPerLitre * shareOfTheHeatKept * (1000 / liquid.volumeMl)
  return { ...liquid, temperatureC: Math.min(ceilingC, liquid.temperatureC + risePerSecond * seconds) }
}

export function kilowattHoursUsed(heater: HeaterDefinition, seconds: number): number {
  return (heater.powerWatts * seconds) / joulesInAKilowattHour
}

export function liquidBoiledAway(liquid: Liquid, heater: HeaterDefinition, seconds: number): Liquid {
  if (isEmpty(liquid) || liquid.temperatureC < boilingPointC) return liquid
  const volumeMlLeft = liquid.volumeMl - heater.boilingAwayMlPerSecond * seconds
  return { ...liquid, volumeMl: volumeMlLeft < smallestMeaningfulVolumeMl ? 0 : volumeMlLeft }
}

export function coolLiquid(liquid: Liquid, ambientC: number, coolingPerSecond: number, seconds: number): Liquid {
  const shareOfGapClosed = Math.min(1, coolingPerSecond * seconds)
  return { ...liquid, temperatureC: liquid.temperatureC + (ambientC - liquid.temperatureC) * shareOfGapClosed }
}

export function shellHeatAfter(shellHeat: number, isOnAWorkingHeater: boolean, seconds: number): number {
  if (isOnAWorkingHeater) return Math.min(1, shellHeat + seconds / shellHeatsThroughSeconds)
  return Math.max(0, shellHeat - seconds / shellCoolsDownSeconds)
}

export function isAtTheBoil(liquid: Liquid): boolean {
  return !isEmpty(liquid) && liquid.temperatureC >= boilingPointC
}

export function isTooHotToHold(shellHeat: number): boolean {
  return shellHeat >= shellTooHotToHoldFrom
}

export function coolingPerSecondOf(vessel: VesselDefinition, isLidOpen: boolean): number {
  if (vessel.lid === null || !isLidOpen) return vessel.coolingPerSecond
  return vessel.coolingPerSecond * vessel.lid.coolingMultiplierWhenOpen
}

export function shareOfTheHeatKeptBy(vessel: VesselDefinition, isLidOpen: boolean): number {
  if (vessel.lid === null || !isLidOpen) return 1
  return vessel.lid.heatingMultiplierWhenOpen
}
