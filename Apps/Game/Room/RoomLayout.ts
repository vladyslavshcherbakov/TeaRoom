import { facingDirection, figurineIds, furniturePlacementsFor, pointOn, sinkOnTheCounter, type Facing, type FigurineId, type FurnitureArrangement, type PiecePlacement, type WindowPlace } from '../../../Shared/Content/Rooms.ts'
import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'

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
  readonly facing: Facing
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
  readonly canTheProphecyBeSeen: boolean
}

type PieceShape = {
  readonly id: FurnitureId
  readonly widthMetres: number
  readonly depthMetres: number
  readonly height: number
  readonly takesItemsOnItsTop: boolean
  readonly standsInFrontMetres: number
  readonly closeUp: {
    readonly targetForwardMetres: number
    readonly targetHeight: number
    readonly acrossToCamera: number
    readonly upToCamera: number
    readonly widthMetres: number
    readonly heightMetres: number
  }
}

type LookOfAWindow = {
  readonly windows: readonly WallWindow[]
  readonly figurines: Readonly<Record<FigurineId, WorldPoint>>
}

export const roomHalfSize = 3
export const floorCellSize = 0.25
export const walkerRadius = 0.25
export const walkerStart: FloorPoint = { x: 1.6, z: 1.8 }
export const heaterPlate = { width: 0.34, depth: 0.3, height: 0.05 }

const puddleOffsetFromTheTeaTableCentre: FloorPoint = { x: -0.2, z: 0.1 }
const puddleAboveTheSurfaceMetres = 0.002
const largestPuddleRadiusMetres = 0.25

const counterShape: PieceShape = {
  id: 'counter',
  widthMetres: 2.2,
  depthMetres: 0.7,
  height: 0.9,
  takesItemsOnItsTop: true,
  standsInFrontMetres: 0.8,
  closeUp: { targetForwardMetres: 0.05, targetHeight: 0.95, acrossToCamera: 0.2, upToCamera: 0.8, widthMetres: 2.6, heightMetres: 1.4 },
}

const shelfShape: PieceShape = {
  id: 'shelf',
  widthMetres: 1.8,
  depthMetres: 0.5,
  height: 1.7,
  takesItemsOnItsTop: false,
  standsInFrontMetres: 0.8,
  closeUp: { targetForwardMetres: 0, targetHeight: 0.95, acrossToCamera: -0.1, upToCamera: 0.3, widthMetres: 2.1, heightMetres: 1.9 },
}

const teaTableShape: PieceShape = {
  id: 'teaTable',
  widthMetres: 1.4,
  depthMetres: 0.9,
  height: 0.42,
  takesItemsOnItsTop: true,
  standsInFrontMetres: 0.95,
  closeUp: { targetForwardMetres: -0.05, targetHeight: 0.42, acrossToCamera: 0, upToCamera: 1.6, widthMetres: 1.7, heightMetres: 1.3 },
}

const sinkPlateMetres = 0.004
const sinkBasinCentreForwardOfTheSinkSpotMetres = 0.02

const onTheCounter = {
  sinkBasin: { across: sinkOnTheCounter.across, forward: sinkOnTheCounter.forward + sinkBasinCentreForwardOfTheSinkSpotMetres, widthMetres: 0.36, depthMetres: 0.34, floorHeight: sinkOnTheCounter.y - sinkPlateMetres, plateMetres: sinkPlateMetres },
  faucetBase: { across: sinkOnTheCounter.across, forward: -0.25, y: 0.9 },
  faucetSpout: { across: sinkOnTheCounter.across, forward: -0.07, y: 1.3 },
} as const

const secondCushionBeyondTheTableEndMetres = 0.55

const looksOfTheWindows: Readonly<Record<WindowPlace, LookOfAWindow>> = {
  inTheBackWall: {
    windows: [{ wall: 'back', centreAlongTheWall: 1, width: 1.8, sillHeight: 0.85, height: 1.3, hasTheProphecyAbove: true }],
    figurines: {
      dragon: { x: 0.45, y: 0.85, z: -2.88 },
      toad: { x: 1.55, y: 0.85, z: -2.88 },
    },
  },
  alongTheLeftWall: {
    windows: [{ wall: 'left', centreAlongTheWall: 0, width: 5.6, sillHeight: 0.85, height: 1.3, hasTheProphecyAbove: false }],
    figurines: {
      dragon: { x: -2.88, y: 0.875, z: -1.2 },
      toad: { x: -2.88, y: 0.875, z: 1.2 },
    },
  },
}

export function roomLayoutFor(arrangement: FurnitureArrangement): RoomLayout {
  const placements = furniturePlacementsFor(arrangement)
  const { teaTable } = placements
  const counter = pieceAt(counterShape, placements.counter, [placements.counter.facing])
  const tableFacings: readonly [Facing, ...Facing[]] = teaTable.alsoFacing === null ? [teaTable.facing] : [teaTable.facing, teaTable.alsoFacing]
  const look = looksOfTheWindows[arrangement.window]
  const medal = medalFor(arrangement)
  return {
    furniture: [counter, pieceAt(shelfShape, placements.shelf, [placements.shelf.facing]), pieceAt(teaTableShape, teaTable, tableFacings)],
    cushionSpots: cushionSpotsBy(teaTable),
    windows: look.windows,
    medal,
    settingsGear: { ...medal, y: 1 },
    faucetSpout: worldPointOn(placements.counter, onTheCounter.faucetSpout),
    sinkBasin: sinkBasinIn(placements.counter),
    itemSpots: [{ id: 'faucet', shape: 'faucet', position: worldPointOn(placements.counter, onTheCounter.faucetBase) }, ...figurineIds.map((id) => ({ id, shape: 'figurine' as const, position: look.figurines[id] }))],
    canTheProphecyBeSeen: look.windows.some((window) => window.hasTheProphecyAbove) && teaTable.alsoFacing !== null,
  }
}

export const quietRoomLayout = roomLayoutFor({ window: 'inTheBackWall', besideTheWindow: 'kitchen', table: 'byTheWindow' })

export function puddleRadiusMetres(puddleShare: number): number {
  return Math.sqrt(puddleShare) * largestPuddleRadiusMetres
}

export function furnitureWithId(layout: RoomLayout, id: FurnitureId): Furniture {
  const found = layout.furniture.find((piece) => piece.id === id)
  if (found === undefined) throw new Error(`the room layout has no furniture "${id}"`)
  return found
}

export function turnOfItemAt(layout: RoomLayout, spot: Spot): number {
  return spot.turnRadians ?? turnOfItemsOn(layout, spot.placeId)
}

export function turnFacingTheCameraOf(closeUp: CloseUp): number {
  return Math.atan2(closeUp.directionToCamera.x, closeUp.directionToCamera.z)
}

export function turnOfItemsOn(layout: RoomLayout, placeId: string): number {
  const piece = layout.furniture.find((candidate) => candidate.id === placeId)
  return piece === undefined ? 0 : turnFacing(piece.facing)
}

export function turnFacing(facing: Facing): number {
  const ahead = facingDirection(facing)
  return Math.atan2(ahead.x, ahead.z)
}

export function turnedBy(offset: FloorPoint, turnRadians: number): FloorPoint {
  const cos = Math.cos(turnRadians)
  const sin = Math.sin(turnRadians)
  return { x: offset.x * cos + offset.z * sin, z: -offset.x * sin + offset.z * cos }
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

function pieceAt(shape: PieceShape, placement: PiecePlacement, facings: readonly [Facing, ...Facing[]]): Furniture {
  const isAlongX = runsAlongX(placement.facing)
  const [first, ...rest] = facings.map((facing) => sideOf(shape, { ...placement, facing }))
  return {
    id: shape.id,
    facing: placement.facing,
    footprint: { x: placement.x, z: placement.z, width: isAlongX ? shape.widthMetres : shape.depthMetres, depth: isAlongX ? shape.depthMetres : shape.widthMetres },
    height: shape.height,
    takesItemsOnItsTop: shape.takesItemsOnItsTop,
    sides: [first ?? sideOf(shape, placement), ...rest],
  }
}

function sideOf(shape: PieceShape, placement: PiecePlacement): FurnitureSide {
  const ahead = facingDirection(placement.facing)
  const target = pointOn(placement, 0, shape.closeUp.targetForwardMetres)
  const standingPoint = pointOn(placement, 0, shape.standsInFrontMetres)
  const across = { x: ahead.z, z: -ahead.x }
  return {
    name: `side ${placement.facing}`,
    standingPoint,
    closeUp: {
      target: { x: target.x, y: shape.closeUp.targetHeight, z: target.z },
      directionToCamera: { x: ahead.x + across.x * shape.closeUp.acrossToCamera, y: shape.closeUp.upToCamera, z: ahead.z + across.z * shape.closeUp.acrossToCamera },
      widthMetres: shape.closeUp.widthMetres,
      heightMetres: shape.closeUp.heightMetres,
    },
  }
}

function cushionSpotsBy(teaTable: PiecePlacement & { readonly alsoFacing: Facing | null }): FloorPoint[] {
  const first = pointOn(teaTable, 0, teaTableShape.standsInFrontMetres)
  if (teaTable.alsoFacing !== null) return [first, pointOn({ ...teaTable, facing: teaTable.alsoFacing }, 0, teaTableShape.standsInFrontMetres)]
  const alongTheEnd = teaTableShape.widthMetres / 2 + secondCushionBeyondTheTableEndMetres
  const ends = [pointOn(teaTable, alongTheEnd, 0), pointOn(teaTable, -alongTheEnd, 0)]
  const nearerTheMiddle = ends.reduce((nearest, end) => (Math.hypot(end.x, end.z) < Math.hypot(nearest.x, nearest.z) ? end : nearest))
  return [first, nearerTheMiddle]
}

function medalFor(arrangement: FurnitureArrangement): SpotOnAWall {
  if (arrangement.window === 'inTheBackWall') return { wall: 'left', alongTheWall: -1.4, y: 1.55 }
  return { wall: 'back', alongTheWall: arrangement.besideTheWindow === 'kitchen' ? 0.28 : -0.28, y: 1.55 }
}

function sinkBasinIn(counter: PiecePlacement): SinkBasin {
  const basin = onTheCounter.sinkBasin
  const centre = pointOn(counter, basin.across, basin.forward)
  const isAlongX = runsAlongX(counter.facing)
  return {
    placeId: 'counter',
    x: centre.x,
    z: centre.z,
    width: isAlongX ? basin.widthMetres : basin.depthMetres,
    depth: isAlongX ? basin.depthMetres : basin.widthMetres,
    floorHeight: basin.floorHeight,
    plateMetres: basin.plateMetres,
  }
}

function worldPointOn(placement: PiecePlacement, spot: { readonly across: number; readonly forward: number; readonly y: number }): WorldPoint {
  const { x, z } = pointOn(placement, spot.across, spot.forward)
  return { x, y: spot.y, z }
}

function runsAlongX(facing: Facing): boolean {
  return facing === 'towardsTheFront' || facing === 'towardsTheBack'
}
