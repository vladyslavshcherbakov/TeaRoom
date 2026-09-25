import type { HeaterDefinition } from '../Definitions/HeaterDefinition.ts'
import type { VesselDefinition } from '../Definitions/VesselDefinition.ts'
import { isEmpty, type Liquid } from './Liquid.ts'

const boilingPointC = 100
const shellHeatsThroughSeconds = 20
const shellCoolsDownSeconds = 60
const shellTooHotToHoldFrom = 0.2

export function heatLiquid(liquid: Liquid, heater: HeaterDefinition, seconds: number): Liquid {
  if (isEmpty(liquid)) return liquid
  const risePerSecond = heater.degreesPerSecondPerLitre * (1000 / liquid.volumeMl)
  return { ...liquid, temperatureC: Math.min(boilingPointC, liquid.temperatureC + risePerSecond * seconds) }
}

export function liquidBoiledAway(liquid: Liquid, heater: HeaterDefinition, seconds: number): Liquid {
  if (isEmpty(liquid) || liquid.temperatureC < boilingPointC) return liquid
  return { ...liquid, volumeMl: Math.max(0, liquid.volumeMl - heater.boilingAwayMlPerSecond * seconds) }
}

export function coolLiquid(liquid: Liquid, ambientC: number, coolingPerSecond: number, seconds: number): Liquid {
  const shareOfGapClosed = Math.min(1, coolingPerSecond * seconds)
  return { ...liquid, temperatureC: liquid.temperatureC + (ambientC - liquid.temperatureC) * shareOfGapClosed }
}

export function shellHeatAfter(shellHeat: number, isOnAWorkingHeater: boolean, seconds: number): number {
  if (isOnAWorkingHeater) return Math.min(1, shellHeat + seconds / shellHeatsThroughSeconds)
  return Math.max(0, shellHeat - seconds / shellCoolsDownSeconds)
}

export function isTooHotToHold(shellHeat: number): boolean {
  return shellHeat >= shellTooHotToHoldFrom
}

export function coolingPerSecondOf(vessel: VesselDefinition, isLidOpen: boolean): number {
  if (vessel.lid === null || !isLidOpen) return vessel.coolingPerSecond
  return vessel.coolingPerSecond * vessel.lid.coolingMultiplierWhenOpen
}
