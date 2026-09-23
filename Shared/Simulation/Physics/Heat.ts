import type { HeaterDefinition } from '../Definitions/HeaterDefinition.ts'
import type { VesselDefinition } from '../Definitions/VesselDefinition.ts'
import { isEmpty, type Liquid } from './Liquid.ts'

const boilingPointC = 100

export function heatLiquid(liquid: Liquid, heater: HeaterDefinition, seconds: number): Liquid {
  if (isEmpty(liquid)) return liquid
  const risePerSecond = heater.degreesPerSecondPerLitre * (1000 / liquid.volumeMl)
  return { ...liquid, temperatureC: Math.min(boilingPointC, liquid.temperatureC + risePerSecond * seconds) }
}

export function coolLiquid(liquid: Liquid, ambientC: number, coolingPerSecond: number, seconds: number): Liquid {
  const shareOfGapClosed = Math.min(1, coolingPerSecond * seconds)
  return { ...liquid, temperatureC: liquid.temperatureC + (ambientC - liquid.temperatureC) * shareOfGapClosed }
}

export function coolingPerSecondOf(vessel: VesselDefinition, isLidOpen: boolean): number {
  if (vessel.lid === null || !isLidOpen) return vessel.coolingPerSecond
  return vessel.coolingPerSecond * vessel.lid.coolingMultiplierWhenOpen
}
