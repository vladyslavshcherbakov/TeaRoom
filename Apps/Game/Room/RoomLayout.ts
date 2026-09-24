import { caddyItemId, clothItemId, spoonItemId } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { SessionState } from '../../../Shared/Simulation/State/SessionState.ts'

export type FloorPoint = {
  readonly x: number
  readonly z: number
}

export type WorldPoint = FloorPoint & {
  readonly y: number
}

export type Footprint = FloorPoint & {
  readonly width: number
  readonly depth: number
}

export type CameraPose = {
  readonly position: WorldPoint
  readonly target: WorldPoint
}

export type FurnitureId = 'counter' | 'shelf' | 'teaTable'

export type CloseUp = {
  readonly target: WorldPoint
  readonly directionToCamera: WorldPoint
  readonly widthMetres: number
  readonly heightMetres: number
}

export type Furniture = {
  readonly id: FurnitureId
  readonly footprint: Footprint
  readonly height: number
  readonly standingPoint: FloorPoint
  readonly closeUp: CloseUp
}

export type ItemShape = 'figurine' | 'faucet'

export type ItemSpot = {
  readonly id: string
  readonly shape: ItemShape
  readonly position: WorldPoint
}

export const roomHalfSize = 3
export const floorCellSize = 0.25
export const walkerRadius = 0.25
export const walkerStart: FloorPoint = { x: 1.6, z: 1.8 }

export const windowOnBackWall = { centreX: 1, sillHeight: 0.85, width: 1.8, height: 1.3 }

export const furniture: readonly Furniture[] = [
  {
    id: 'counter',
    footprint: { x: -1.8, z: -2.65, width: 2.2, depth: 0.7 },
    height: 0.9,
    standingPoint: { x: -1.8, z: -1.85 },
    closeUp: { target: { x: -1.8, y: 0.95, z: -2.6 }, directionToCamera: { x: 0.2, y: 0.8, z: 1 }, widthMetres: 2.6, heightMetres: 1.4 },
  },
  {
    id: 'shelf',
    footprint: { x: -2.75, z: 0.4, width: 0.5, depth: 1.8 },
    height: 1.7,
    standingPoint: { x: -1.95, z: 0.4 },
    closeUp: { target: { x: -2.75, y: 0.95, z: 0.4 }, directionToCamera: { x: 1, y: 0.3, z: 0.1 }, widthMetres: 2.1, heightMetres: 1.9 },
  },
  {
    id: 'teaTable',
    footprint: { x: 1, z: -1.55, width: 1.4, depth: 0.9 },
    height: 0.42,
    standingPoint: { x: 1, z: -0.6 },
    closeUp: { target: { x: 1, y: 0.42, z: -1.6 }, directionToCamera: { x: 0, y: 1.6, z: 1 }, widthMetres: 1.7, heightMetres: 1.3 },
  },
]

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

export const heaterFootprintRadiusMetres = 0.18

const puddleOffsetFromTheTeaTableCentre: FloorPoint = { x: -0.2, z: 0.1 }
const puddleAboveTheTeaTableMetres = 0.002
const largestPuddleRadiusMetres = 0.25

export const puddleCentre: WorldPoint = puddleOnTheTeaTable()

export function puddleRadiusMetres(puddleShare: number): number {
  return Math.sqrt(puddleShare) * largestPuddleRadiusMetres
}

export const faucetSpout: WorldPoint = { x: -1.45, y: 1.22, z: -2.72 }

export const itemSpots: readonly ItemSpot[] = [
  { id: 'faucet', shape: 'faucet', position: { x: -1.45, y: 0.9, z: -2.9 } },
  { id: 'dragon', shape: 'figurine', position: { x: 0.45, y: 0.85, z: -2.88 } },
  { id: 'toad', shape: 'figurine', position: { x: 1.55, y: 0.85, z: -2.88 } },
]

export function furnitureWithId(id: FurnitureId): Furniture {
  const found = furniture.find((piece) => piece.id === id)
  if (found === undefined) throw new Error(`the room layout has no furniture "${id}"`)
  return found
}

function puddleOnTheTeaTable(): WorldPoint {
  const { footprint, height } = furnitureWithId('teaTable')
  return { x: footprint.x + puddleOffsetFromTheTeaTableCentre.x, y: height + puddleAboveTheTeaTableMetres, z: footprint.z + puddleOffsetFromTheTeaTableCentre.z }
}
