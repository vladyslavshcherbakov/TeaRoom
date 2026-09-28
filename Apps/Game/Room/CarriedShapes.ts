import { itemKindOf, type DeepReadonly, type SessionState } from '../../../Shared/GameLogic/GameLogic.ts'
import { bowlShape } from './Rendering/Carried/Shapes/BowlShape.ts'
import { caddyShape } from './Rendering/Carried/Shapes/CaddyShape.ts'
import { clothShape } from './Rendering/Carried/Shapes/ClothShape.ts'
import { kettleShape } from './Rendering/Carried/Shapes/KettleShape.ts'
import { spoonShape } from './Rendering/Carried/Shapes/SpoonShape.ts'
import { thermosShape } from './Rendering/Carried/Shapes/ThermosShape.ts'

export type CarriedShape = 'kettle' | 'thermos' | 'caddy' | 'bowl' | 'spoon' | 'cloth'

export type ShapedItem = {
  readonly itemId: string
  readonly shape: CarriedShape
}

export const shapeByVesselDefinitionId: Readonly<Record<string, CarriedShape>> = {
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
  readonly bodyRadiusMetres: number
  readonly footprintRadiusMetres: number
  readonly reachesPastTheFootprint: readonly FootprintCircle[]
  readonly openingRadiusMetres: number
  readonly lid: LidLayout | null
}

const kettleSpoutReach: FootprintCircle = { x: kettleShape.spout.reachOutMetres, z: 0, radius: kettleShape.spout.reachRadiusMetres, restsOnTheSurface: false }
const { columns: clothCoverColumns, outerColumnMetres: clothCoverOuterColumnMetres, rowMetres: clothCoverRowMetres, radiusMetres: clothCoverRadiusMetres } = clothShape.cover
const clothCoverColumnsMetres = Array.from({ length: clothCoverColumns }, (_, column) => clothCoverOuterColumnMetres * ((2 * column) / (clothCoverColumns - 1) - 1))
const clothCover: readonly FootprintCircle[] = clothCoverColumnsMetres.flatMap((x) => [-1, 1].map((acrossSide) => ({ x, z: acrossSide * clothCoverRowMetres, radius: clothCoverRadiusMetres, restsOnTheSurface: true })))

export const layoutByShape: Readonly<Record<CarriedShape, CarriedShapeLayout>> = {
  kettle: { bodyRadiusMetres: kettleShape.reachMetres, footprintRadiusMetres: kettleShape.reachMetres, reachesPastTheFootprint: [kettleSpoutReach], openingRadiusMetres: kettleShape.openingRadiusMetres, lid: { lyingRadiusMetres: kettleShape.lid.bottomRadiusMetres } },
  thermos: { bodyRadiusMetres: thermosShape.reachMetres, footprintRadiusMetres: thermosShape.reachMetres, reachesPastTheFootprint: [], openingRadiusMetres: thermosShape.mouthRadiusMetres, lid: { lyingRadiusMetres: thermosShape.cup.lyingRadiusMetres } },
  caddy: { bodyRadiusMetres: caddyShape.reachMetres, footprintRadiusMetres: caddyShape.reachMetres, reachesPastTheFootprint: [], openingRadiusMetres: caddyShape.openingRadiusMetres, lid: { lyingRadiusMetres: caddyShape.lid.radiusMetres } },
  bowl: { bodyRadiusMetres: bowlShape.reachMetres, footprintRadiusMetres: bowlShape.reachMetres, reachesPastTheFootprint: [], openingRadiusMetres: bowlShape.openingRadiusMetres, lid: null },
  spoon: { bodyRadiusMetres: spoonShape.reachMetres, footprintRadiusMetres: spoonShape.reachMetres, reachesPastTheFootprint: [], openingRadiusMetres: 0, lid: null },
  cloth: { bodyRadiusMetres: clothShape.lengthMetres / 2, footprintRadiusMetres: clothShape.widthMetres / 2, reachesPastTheFootprint: clothCover, openingRadiusMetres: 0, lid: null },
}

export function footprintCirclesOf(layout: CarriedShapeLayout): readonly FootprintCircle[] {
  return [{ x: 0, z: 0, radius: layout.footprintRadiusMetres, restsOnTheSurface: true }, ...layout.reachesPastTheFootprint]
}

export function layoutOf(state: DeepReadonly<SessionState>, itemId: string): CarriedShapeLayout | undefined {
  const shape = carriedShapeOf(state, itemId)
  return shape === undefined ? undefined : layoutByShape[shape]
}

export function isTheLidOpen(state: DeepReadonly<SessionState>, itemId: string): boolean {
  return state.vessels[itemId]?.isLidOpen === true
}
