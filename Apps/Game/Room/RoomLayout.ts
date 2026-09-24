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

export type ItemShape = 'spoon' | 'cloth' | 'figurine' | 'faucet'

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

export type CarriedShape = 'kettle' | 'thermos' | 'caddy' | 'bowl'

export const carriedItemShapes: Readonly<Record<string, CarriedShape>> = {
  kettle: 'kettle',
  thermos: 'thermos',
  caddy: 'caddy',
  bowl1: 'bowl',
  bowl2: 'bowl',
  bowl3: 'bowl',
}

export const footprintRadiusMetres: Readonly<Record<CarriedShape, number>> = {
  kettle: 0.16,
  thermos: 0.08,
  caddy: 0.09,
  bowl: 0.09,
}

export const heaterFootprintRadiusMetres = 0.18

export const itemSpots: readonly ItemSpot[] = [
  { id: 'faucet', shape: 'faucet', position: { x: -1.45, y: 0.9, z: -2.9 } },
  { id: 'spoon', shape: 'spoon', position: { x: 1.45, y: 0.42, z: -1.3 } },
  { id: 'cloth', shape: 'cloth', position: { x: 0.5, y: 0.42, z: -1.25 } },
  { id: 'dragon', shape: 'figurine', position: { x: 0.45, y: 0.85, z: -2.88 } },
  { id: 'toad', shape: 'figurine', position: { x: 1.55, y: 0.85, z: -2.88 } },
]

export function furnitureWithId(id: FurnitureId): Furniture {
  const found = furniture.find((piece) => piece.id === id)
  if (found === undefined) throw new Error(`the room layout has no furniture "${id}"`)
  return found
}
