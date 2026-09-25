import { caddyItemId, clothItemId, spoonItemId } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { SessionState } from '../../../Shared/Simulation/State/SessionState.ts'

export type CarriedShape = 'kettle' | 'thermos' | 'caddy' | 'bowl' | 'spoon' | 'cloth'

export type ShapedItem = {
  readonly itemId: string
  readonly shape: CarriedShape
}

const shapeByVesselDefinitionId: Readonly<Record<string, CarriedShape>> = {
  clayKettle: 'kettle',
  thermos: 'thermos',
  teaBowl: 'bowl',
}

const shapeByToolId: Readonly<Record<string, CarriedShape>> = {
  [caddyItemId]: 'caddy',
  [spoonItemId]: 'spoon',
  [clothItemId]: 'cloth',
}

export function carriedShapeOf(state: DeepReadonly<SessionState>, itemId: string): CarriedShape | undefined {
  const vessel = state.vessels[itemId]
  return vessel === undefined ? shapeByToolId[itemId] : shapeByVesselDefinitionId[vessel.definitionId]
}

export const footprintRadiusMetres: Readonly<Record<CarriedShape, number>> = {
  kettle: 0.16,
  thermos: 0.08,
  caddy: 0.09,
  bowl: 0.09,
  spoon: 0.12,
  cloth: 0.14,
}

export const openingRadiusMetres: Readonly<Record<CarriedShape, number>> = {
  kettle: 0.075,
  thermos: 0.05,
  caddy: 0.07,
  bowl: 0.075,
  spoon: 0,
  cloth: 0,
}

export type FootprintCircle = { readonly x: number; readonly z: number; readonly radius: number; readonly restsOnTheSurface: boolean }

const kettleSpoutReach: FootprintCircle = { x: 0.19, z: 0, radius: 0.05, restsOnTheSurface: false }

export const footprintCirclesMetres: Readonly<Record<CarriedShape, readonly FootprintCircle[]>> = {
  kettle: [{ x: 0, z: 0, radius: footprintRadiusMetres.kettle, restsOnTheSurface: true }, kettleSpoutReach],
  thermos: [{ x: 0, z: 0, radius: footprintRadiusMetres.thermos, restsOnTheSurface: true }],
  caddy: [{ x: 0, z: 0, radius: footprintRadiusMetres.caddy, restsOnTheSurface: true }],
  bowl: [{ x: 0, z: 0, radius: footprintRadiusMetres.bowl, restsOnTheSurface: true }],
  spoon: [{ x: 0, z: 0, radius: footprintRadiusMetres.spoon, restsOnTheSurface: true }],
  cloth: [{ x: 0, z: 0, radius: footprintRadiusMetres.cloth, restsOnTheSurface: true }],
}

export const openLidRadiusMetres: Readonly<Record<CarriedShape, number>> = {
  kettle: 0.085,
  thermos: 0.046,
  caddy: 0.085,
  bowl: 0,
  spoon: 0,
  cloth: 0,
}
