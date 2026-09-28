import { splitLiquid, water, type Liquid } from '../Chemistry/Liquid.ts'
import type { VesselState } from '../State/SessionState.ts'

export function takeLiquidFrom(vessel: VesselState, requestedMl: number): Liquid {
  const { taken, left } = splitLiquid(vessel.liquid, requestedMl)
  vessel.liquid = left
  if (taken.volumeMl > 0) vessel.hasOnlyBoiledDownSinceFull = false
  return taken
}

export function emptyTheVessel(vessel: VesselState): Liquid {
  const taken = takeLiquidFrom(vessel, vessel.liquid.volumeMl)
  vessel.liquid = water(0, vessel.liquid.temperatureC)
  return taken
}
