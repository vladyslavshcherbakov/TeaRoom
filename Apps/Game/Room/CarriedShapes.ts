import { itemKindOf } from '../../../Shared/Simulation/Ritual/ItemKinds.ts'
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
  teaCaddy: 'caddy',
}

export function carriedShapeOf(state: DeepReadonly<SessionState>, itemId: string): CarriedShape | undefined {
  switch (itemKindOf(state, itemId)) {
    case 'vessel':
      return shapeByVesselDefinitionId[state.vessels[itemId]?.definitionId ?? '']
    case 'spoon':
      return 'spoon'
    case 'cloth':
      return 'cloth'
    case undefined:
      return undefined
  }
}

export type FootprintCircle = { readonly x: number; readonly z: number; readonly radius: number; readonly restsOnTheSurface: boolean }

export type LidLayout = {
  readonly lyingRadiusMetres: number
}

export type CarriedShapeLayout = {
  readonly footprintRadiusMetres: number
  readonly reachesPastTheFootprint: readonly FootprintCircle[]
  readonly openingRadiusMetres: number
  readonly lid: LidLayout | null
}

const kettleSpoutReach: FootprintCircle = { x: 0.19, z: 0, radius: 0.05, restsOnTheSurface: false }

export const layoutByShape: Readonly<Record<CarriedShape, CarriedShapeLayout>> = {
  kettle: { footprintRadiusMetres: 0.16, reachesPastTheFootprint: [kettleSpoutReach], openingRadiusMetres: 0.075, lid: { lyingRadiusMetres: 0.085 } },
  thermos: { footprintRadiusMetres: 0.08, reachesPastTheFootprint: [], openingRadiusMetres: 0.05, lid: { lyingRadiusMetres: 0.046 } },
  caddy: { footprintRadiusMetres: 0.09, reachesPastTheFootprint: [], openingRadiusMetres: 0.07, lid: { lyingRadiusMetres: 0.085 } },
  bowl: { footprintRadiusMetres: 0.09, reachesPastTheFootprint: [], openingRadiusMetres: 0.075, lid: null },
  spoon: { footprintRadiusMetres: 0.12, reachesPastTheFootprint: [], openingRadiusMetres: 0, lid: null },
  cloth: { footprintRadiusMetres: 0.14, reachesPastTheFootprint: [], openingRadiusMetres: 0, lid: null },
}

export function footprintCirclesOf(layout: CarriedShapeLayout): readonly FootprintCircle[] {
  return [{ x: 0, z: 0, radius: layout.footprintRadiusMetres, restsOnTheSurface: true }, ...layout.reachesPastTheFootprint]
}

export function layoutOf(state: DeepReadonly<SessionState>, itemId: string): CarriedShapeLayout | undefined {
  const shape = carriedShapeOf(state, itemId)
  return shape === undefined ? undefined : layoutByShape[shape]
}

export function isTheLidOpen(state: DeepReadonly<SessionState>, itemId: string): boolean {
  const lid = layoutOf(state, itemId)?.lid ?? null
  return lid !== null && state.vessels[itemId]?.isLidOpen === true
}
