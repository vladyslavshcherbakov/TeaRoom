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

export type FurnitureSide = {
  readonly name: string
  readonly standingPoint: FloorPoint
  readonly closeUp: CloseUp
}

export type Furniture = {
  readonly id: FurnitureId
  readonly footprint: Footprint
  readonly height: number
  readonly sides: readonly [FurnitureSide, ...FurnitureSide[]]
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

export const medalOnLeftWall = { z: -1.4, y: 1.55 }

export const settingsGearOnLeftWall = { z: medalOnLeftWall.z, y: 1 }

export const furniture: readonly Furniture[] = [
  {
    id: 'counter',
    footprint: { x: -1.8, z: -2.65, width: 2.2, depth: 0.7 },
    height: 0.9,
    sides: [
      {
        name: 'front',
        standingPoint: { x: -1.8, z: -1.85 },
        closeUp: { target: { x: -1.8, y: 0.95, z: -2.6 }, directionToCamera: { x: 0.2, y: 0.8, z: 1 }, widthMetres: 2.6, heightMetres: 1.4 },
      },
    ],
  },
  {
    id: 'shelf',
    footprint: { x: -2.75, z: 0.4, width: 0.5, depth: 1.8 },
    height: 1.7,
    sides: [
      {
        name: 'front',
        standingPoint: { x: -1.95, z: 0.4 },
        closeUp: { target: { x: -2.75, y: 0.95, z: 0.4 }, directionToCamera: { x: 1, y: 0.3, z: 0.1 }, widthMetres: 2.1, heightMetres: 1.9 },
      },
    ],
  },
  {
    id: 'teaTable',
    footprint: { x: 1, z: -1.55, width: 1.4, depth: 0.9 },
    height: 0.42,
    sides: [
      {
        name: 'front',
        standingPoint: { x: 1, z: -0.6 },
        closeUp: { target: { x: 1, y: 0.42, z: -1.6 }, directionToCamera: { x: 0, y: 1.6, z: 1 }, widthMetres: 1.7, heightMetres: 1.3 },
      },
      {
        name: 'window side',
        standingPoint: { x: 1, z: -2.5 },
        closeUp: { target: { x: 1, y: 0.42, z: -1.5 }, directionToCamera: { x: 0, y: 1.6, z: -1 }, widthMetres: 1.7, heightMetres: 1.3 },
      },
    ],
  },
]

export const heaterFootprintRadiusMetres = 0.18

const puddleOffsetFromTheTeaTableCentre: FloorPoint = { x: -0.2, z: 0.1 }
const puddleAboveTheSurfaceMetres = 0.002
const largestPuddleRadiusMetres = 0.25

export function puddleRadiusMetres(puddleShare: number): number {
  return Math.sqrt(puddleShare) * largestPuddleRadiusMetres
}

export const faucetSpout: WorldPoint = { x: -1.45, y: 1.3, z: -2.72 }
export const sinkBasin = { placeId: 'counter', x: -1.45, z: -2.68, width: 0.36, depth: 0.34, floorHeight: 0.816, plateMetres: 0.004 }

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

export function sideStoodAt(piece: Furniture, position: FloorPoint): FurnitureSide {
  const distanceTo = (side: FurnitureSide) => Math.hypot(side.standingPoint.x - position.x, side.standingPoint.z - position.z)
  return piece.sides.reduce((nearest, side) => (distanceTo(side) < distanceTo(nearest) ? side : nearest))
}

export function puddleCentreOn(placeId: string, spilledAround: WorldPoint | null): WorldPoint | null {
  if (spilledAround !== null) return { x: spilledAround.x, y: spilledAround.y + puddleAboveTheSurfaceMetres, z: spilledAround.z }
  const piece = furniture.find((candidate) => candidate.id === placeId)
  if (piece === undefined) return null
  const offset = piece.id === 'teaTable' ? puddleOffsetFromTheTeaTableCentre : { x: 0, z: 0 }
  return { x: piece.footprint.x + offset.x, y: piece.height + puddleAboveTheSurfaceMetres, z: piece.footprint.z + offset.z }
}
