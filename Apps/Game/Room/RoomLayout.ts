import type { KitchenPlacement } from '../../../Shared/Content/Rooms.ts'

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
  readonly takesItemsOnItsTop: boolean
  readonly sides: readonly [FurnitureSide, ...FurnitureSide[]]
}

export type WallSide = 'back' | 'left'

export type WallWindow = {
  readonly wall: WallSide
  readonly centreAlongTheWall: number
  readonly width: number
  readonly sillHeight: number
  readonly height: number
  readonly hasTheProphecyAbove: boolean
}

export type SpotOnAWall = {
  readonly wall: WallSide
  readonly alongTheWall: number
  readonly y: number
}

export type SinkBasin = {
  readonly placeId: string
  readonly x: number
  readonly z: number
  readonly width: number
  readonly depth: number
  readonly floorHeight: number
  readonly plateMetres: number
}

export type ItemShape = 'figurine' | 'faucet'

export type ItemSpot = {
  readonly id: string
  readonly shape: ItemShape
  readonly position: WorldPoint
}

export type RoomLayout = {
  readonly furniture: readonly Furniture[]
  readonly cushionSpots: readonly FloorPoint[]
  readonly windows: readonly WallWindow[]
  readonly medal: SpotOnAWall
  readonly settingsGear: SpotOnAWall
  readonly faucetSpout: WorldPoint
  readonly sinkBasin: SinkBasin
  readonly itemSpots: readonly ItemSpot[]
}

export const roomHalfSize = 3
export const floorCellSize = 0.25
export const walkerRadius = 0.25
export const walkerStart: FloorPoint = { x: 1.6, z: 1.8 }
export const heaterFootprintRadiusMetres = 0.18

const puddleOffsetFromTheTeaTableCentre: FloorPoint = { x: -0.2, z: 0.1 }
const puddleAboveTheSurfaceMetres = 0.002
const largestPuddleRadiusMetres = 0.25

export const kitchenBesideTheWindow: RoomLayout = {
  furniture: [
    {
      id: 'counter',
      footprint: { x: -1.8, z: -2.65, width: 2.2, depth: 0.7 },
      height: 0.9,
      takesItemsOnItsTop: true,
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
      takesItemsOnItsTop: false,
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
      takesItemsOnItsTop: true,
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
  ],
  cushionSpots: [
    { x: 1, z: -0.6 },
    { x: 1, z: -2.5 },
  ],
  windows: [{ wall: 'back', centreAlongTheWall: 1, width: 1.8, sillHeight: 0.85, height: 1.3, hasTheProphecyAbove: true }],
  medal: { wall: 'left', alongTheWall: -1.4, y: 1.55 },
  settingsGear: { wall: 'left', alongTheWall: -1.4, y: 1 },
  faucetSpout: { x: -1.45, y: 1.3, z: -2.72 },
  sinkBasin: { placeId: 'counter', x: -1.45, z: -2.68, width: 0.36, depth: 0.34, floorHeight: 0.816, plateMetres: 0.004 },
  itemSpots: [
    { id: 'faucet', shape: 'faucet', position: { x: -1.45, y: 0.9, z: -2.9 } },
    { id: 'dragon', shape: 'figurine', position: { x: 0.45, y: 0.85, z: -2.88 } },
    { id: 'toad', shape: 'figurine', position: { x: 1.55, y: 0.85, z: -2.88 } },
  ],
}

export const kitchenFacingTheWindow: RoomLayout = {
  furniture: [
    {
      id: 'counter',
      footprint: { x: -1.45, z: -2.65, width: 2.2, depth: 0.7 },
      height: 0.9,
      takesItemsOnItsTop: true,
      sides: [
        {
          name: 'front',
          standingPoint: { x: -1.45, z: -1.85 },
          closeUp: { target: { x: -1.45, y: 0.95, z: -2.6 }, directionToCamera: { x: 0.2, y: 0.8, z: 1 }, widthMetres: 2.6, heightMetres: 1.4 },
        },
      ],
    },
    {
      id: 'shelf',
      footprint: { x: 1.8, z: -2.75, width: 1.8, depth: 0.5 },
      height: 1.7,
      takesItemsOnItsTop: false,
      sides: [
        {
          name: 'front',
          standingPoint: { x: 1.8, z: -1.95 },
          closeUp: { target: { x: 1.8, y: 0.95, z: -2.75 }, directionToCamera: { x: -0.1, y: 0.3, z: 1 }, widthMetres: 2.1, heightMetres: 1.9 },
        },
      ],
    },
    {
      id: 'teaTable',
      footprint: { x: -2.1, z: 0, width: 0.9, depth: 1.4 },
      height: 0.42,
      takesItemsOnItsTop: true,
      sides: [
        {
          name: 'front',
          standingPoint: { x: -1.15, z: 0 },
          closeUp: { target: { x: -2.15, y: 0.42, z: 0 }, directionToCamera: { x: 1, y: 1.6, z: 0 }, widthMetres: 1.7, heightMetres: 1.3 },
        },
      ],
    },
  ],
  cushionSpots: [
    { x: -1.15, z: 0 },
    { x: -2.1, z: -1.25 },
  ],
  windows: [{ wall: 'left', centreAlongTheWall: 0, width: 5.6, sillHeight: 0.85, height: 1.3, hasTheProphecyAbove: false }],
  medal: { wall: 'back', alongTheWall: 0.28, y: 1.55 },
  settingsGear: { wall: 'back', alongTheWall: 0.28, y: 1 },
  faucetSpout: { x: -1.1, y: 1.3, z: -2.72 },
  sinkBasin: { placeId: 'counter', x: -1.1, z: -2.68, width: 0.36, depth: 0.34, floorHeight: 0.816, plateMetres: 0.004 },
  itemSpots: [
    { id: 'faucet', shape: 'faucet', position: { x: -1.1, y: 0.9, z: -2.9 } },
    { id: 'dragon', shape: 'figurine', position: { x: -2.88, y: 0.875, z: -1.2 } },
    { id: 'toad', shape: 'figurine', position: { x: -2.88, y: 0.875, z: 1.2 } },
  ],
}

export function roomLayoutFor(kitchen: KitchenPlacement): RoomLayout {
  return kitchen === 'besideTheWindow' ? kitchenBesideTheWindow : kitchenFacingTheWindow
}

export function puddleRadiusMetres(puddleShare: number): number {
  return Math.sqrt(puddleShare) * largestPuddleRadiusMetres
}

export function furnitureWithId(layout: RoomLayout, id: FurnitureId): Furniture {
  const found = layout.furniture.find((piece) => piece.id === id)
  if (found === undefined) throw new Error(`the room layout has no furniture "${id}"`)
  return found
}

export function sideStoodAt(piece: Furniture, position: FloorPoint): FurnitureSide {
  const distanceTo = (side: FurnitureSide) => Math.hypot(side.standingPoint.x - position.x, side.standingPoint.z - position.z)
  return piece.sides.reduce((nearest, side) => (distanceTo(side) < distanceTo(nearest) ? side : nearest))
}

export function puddleCentreOn(layout: RoomLayout, placeId: string, spilledAround: WorldPoint | null): WorldPoint | null {
  if (spilledAround !== null) return { x: spilledAround.x, y: spilledAround.y + puddleAboveTheSurfaceMetres, z: spilledAround.z }
  const piece = layout.furniture.find((candidate) => candidate.id === placeId)
  if (piece === undefined) return null
  const offset = piece.id === 'teaTable' ? puddleOffsetFromTheTeaTableCentre : { x: 0, z: 0 }
  return { x: piece.footprint.x + offset.x, y: piece.height + puddleAboveTheSurfaceMetres, z: piece.footprint.z + offset.z }
}
