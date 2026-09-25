import type { RoomCloth, RoomDefinition, Spot } from '../Simulation/Definitions/RoomDefinition.ts'

export type WindowPlace = 'inTheBackWall' | 'alongTheLeftWall'

export type BesideTheWindow = 'kitchen' | 'shelf'

export type TablePlace = 'byTheWindow' | 'againstTheFrontEdge' | 'againstTheRightEdge'

export type ToolsPlacement = 'onTheTeaTable' | 'apart'

export type Facing = 'towardsTheFront' | 'towardsTheBack' | 'towardsTheRight' | 'towardsTheLeft'

export type QuietRoomArrangement = {
  readonly window: WindowPlace
  readonly besideTheWindow: BesideTheWindow
  readonly table: TablePlace
  readonly tools: ToolsPlacement
  readonly clothCount: number
}

export type FurnitureArrangement = Pick<QuietRoomArrangement, 'window' | 'besideTheWindow' | 'table'>

export type PiecePlacement = {
  readonly x: number
  readonly z: number
  readonly facing: Facing
}

export type TablePlacement = PiecePlacement & {
  readonly alsoFacing: Facing | null
}

export type FurniturePlacements = {
  readonly counter: PiecePlacement
  readonly shelf: PiecePlacement
  readonly teaTable: TablePlacement
}

type SpotOnAPiece = {
  readonly across: number
  readonly forward: number
  readonly y: number
}

export const windowPlaces: readonly [WindowPlace, ...WindowPlace[]] = ['inTheBackWall', 'alongTheLeftWall']
export const besideTheWindowChoices: readonly [BesideTheWindow, ...BesideTheWindow[]] = ['kitchen', 'shelf']
export const toolsPlacements: readonly [ToolsPlacement, ...ToolsPlacement[]] = ['onTheTeaTable', 'apart']
export const clothCounts: readonly [number, ...number[]] = [1, 2]

const kitchenAndShelfByWindow: Readonly<Record<WindowPlace, Readonly<Record<BesideTheWindow, Pick<FurniturePlacements, 'counter' | 'shelf'>>>>> = {
  inTheBackWall: {
    kitchen: { counter: { x: -1.8, z: -2.65, facing: 'towardsTheFront' }, shelf: { x: -2.75, z: 0.4, facing: 'towardsTheRight' } },
    shelf: { shelf: { x: -1.8, z: -2.75, facing: 'towardsTheFront' }, counter: { x: -2.65, z: 0.4, facing: 'towardsTheRight' } },
  },
  alongTheLeftWall: {
    kitchen: { counter: { x: -1.45, z: -2.65, facing: 'towardsTheFront' }, shelf: { x: 1.8, z: -2.75, facing: 'towardsTheFront' } },
    shelf: { shelf: { x: -1.8, z: -2.75, facing: 'towardsTheFront' }, counter: { x: 1.45, z: -2.65, facing: 'towardsTheFront' } },
  },
}

const tablesByWindow: Readonly<Record<WindowPlace, readonly [readonly [TablePlace, TablePlacement], ...(readonly [TablePlace, TablePlacement])[]]>> = {
  inTheBackWall: [
    ['byTheWindow', { x: 1, z: -1.55, facing: 'towardsTheFront', alsoFacing: 'towardsTheBack' }],
    ['againstTheRightEdge', { x: 2.55, z: -1.3, facing: 'towardsTheLeft', alsoFacing: null }],
  ],
  alongTheLeftWall: [
    ['byTheWindow', { x: -2.1, z: 0, facing: 'towardsTheRight', alsoFacing: null }],
    ['againstTheFrontEdge', { x: -1.2, z: 2.55, facing: 'towardsTheBack', alsoFacing: null }],
    ['againstTheRightEdge', { x: 2.55, z: 1.2, facing: 'towardsTheLeft', alsoFacing: null }],
  ],
}

export const sinkOnTheCounter = { across: 0.35, forward: -0.05, y: 0.82 } as const

export const shelfBoards = { centreHeightsMetres: [0.05, 0.7, 1.2], thicknessMetres: 0.04 } as const

const [bottomBoardHeight, middleBoardHeight, upperBoardHeight] = shelfBoards.centreHeightsMetres
const onTheBottomBoard = bottomBoardHeight + shelfBoards.thicknessMetres / 2
const onTheMiddleBoard = middleBoardHeight + shelfBoards.thicknessMetres / 2
const onTheUpperBoard = upperBoardHeight + shelfBoards.thicknessMetres / 2

const onTheCounter = {
  heater: { across: -0.55, forward: 0, y: 0.95 },
  sink: sinkOnTheCounter,
  kettle: { across: -0.1, forward: 0.05, y: 0.9 },
  thermos: { across: 0.8, forward: -0.05, y: 0.9 },
  spoonApart: { across: -0.85, forward: 0.15, y: 0.9 },
  secondCloth: { across: 0.85, forward: 0.19, y: 0.9 },
} as const

const onTheShelf = {
  bowls: [
    { across: 0.3, forward: 0, y: onTheMiddleBoard },
    { across: -0.05, forward: 0, y: onTheMiddleBoard },
    { across: -0.4, forward: 0, y: onTheMiddleBoard },
    { across: 0.3, forward: 0, y: onTheBottomBoard },
    { across: -0.05, forward: 0, y: onTheBottomBoard },
    { across: -0.4, forward: 0, y: onTheBottomBoard },
    { across: -0.75, forward: 0, y: onTheMiddleBoard },
    { across: -0.75, forward: 0, y: onTheBottomBoard },
    { across: 0.65, forward: 0, y: onTheMiddleBoard },
    { across: 0.65, forward: 0, y: onTheBottomBoard },
  ],
  caddy: { across: 0.5, forward: 0, y: onTheUpperBoard },
  clothApart: { across: -0.5, forward: 0, y: onTheUpperBoard },
} as const

const onTheTeaTable = {
  spoon: { across: 0.45, forward: 0.25, y: 0.42 },
  cloth: { across: -0.5, forward: 0.3, y: 0.42 },
  caddyApart: { across: -0.25, forward: -0.2, y: 0.42 },
} as const

const clothIds = ['cloth', 'cloth2']

export const quietRoomArrangements: readonly QuietRoomArrangement[] = windowPlaces.flatMap((window) =>
  besideTheWindowChoices.flatMap((besideTheWindow) =>
    tablePlacesBy(window).flatMap((table) => toolsPlacements.flatMap((tools) => clothCounts.map((clothCount) => ({ window, besideTheWindow, table, tools, clothCount })))),
  ),
)

export function tablePlacesBy(window: WindowPlace): readonly [TablePlace, ...TablePlace[]] {
  const [first, ...rest] = tablesByWindow[window]
  return [first[0], ...rest.map(([place]) => place)]
}

export function furniturePlacementsFor(arrangement: FurnitureArrangement): FurniturePlacements {
  const tables = tablesByWindow[arrangement.window]
  const [, teaTable] = tables.find(([place]) => place === arrangement.table) ?? tables[0]
  return { ...kitchenAndShelfByWindow[arrangement.window][arrangement.besideTheWindow], teaTable }
}

export function facingDirection(facing: Facing): { readonly x: number; readonly z: number } {
  switch (facing) {
    case 'towardsTheFront':
      return { x: 0, z: 1 }
    case 'towardsTheBack':
      return { x: 0, z: -1 }
    case 'towardsTheRight':
      return { x: 1, z: 0 }
    case 'towardsTheLeft':
      return { x: -1, z: 0 }
  }
}

export function pointOn(placement: PiecePlacement, across: number, forward: number): { readonly x: number; readonly z: number } {
  const ahead = facingDirection(placement.facing)
  return { x: placement.x + ahead.z * across + ahead.x * forward, z: placement.z - ahead.x * across + ahead.z * forward }
}

export function quietRoomArrangedAs(arrangement: QuietRoomArrangement): RoomDefinition {
  const { counter, shelf, teaTable } = furniturePlacementsFor(arrangement)
  const areToolsApart = arrangement.tools === 'apart'
  const caddy = areToolsApart ? spotOn('teaTable', teaTable, onTheTeaTable.caddyApart) : spotOn('shelf', shelf, onTheShelf.caddy)
  const spoon = areToolsApart ? spotOn('counter', counter, onTheCounter.spoonApart) : spotOn('teaTable', teaTable, onTheTeaTable.spoon)
  const firstCloth = areToolsApart ? spotOn('shelf', shelf, onTheShelf.clothApart) : spotOn('teaTable', teaTable, onTheTeaTable.cloth)
  return {
    id: 'quietRoom',
    ambientTemperatureC: 22,
    timesOfDay: ['dawn', 'day', 'sunset'],
    weathers: ['rain'],
    places: ['counter', 'shelf', 'teaTable'],
    keeperStartsAt: null,
    ritualPlaceId: 'teaTable',
    heaterId: 'electricPlate',
    heaterSpot: spotOn('counter', counter, onTheCounter.heater),
    tap: { sinkSpot: spotOn('counter', counter, onTheCounter.sink), waterTemperatureC: 18, flowMlPerSecond: 50 },
    vessels: [
      { id: 'kettle', definitionId: 'clayKettle', initialWaterMl: 0, startsAt: spotOn('counter', counter, onTheCounter.kettle) },
      { id: 'thermos', definitionId: 'thermos', initialWaterMl: 0, startsAt: spotOn('counter', counter, onTheCounter.thermos) },
      ...onTheShelf.bowls.map((bowl, index) => ({ id: `bowl${index + 1}`, definitionId: 'teaBowl', initialWaterMl: 0, startsAt: spotOn('shelf', shelf, bowl) })),
      { id: 'caddy', definitionId: 'teaCaddy', initialWaterMl: 0, startsAt: caddy },
    ],
    figurineIds: ['dragon', 'toad'],
    caddyGrams: 60,
    spoonCapacityGrams: 3,
    spoonStartsAt: spoon,
    cloths: clothsOf(arrangement.clothCount, firstCloth, spotOn('counter', counter, onTheCounter.secondCloth)),
  }
}

export const quietRoom = quietRoomArrangedAs({ window: 'inTheBackWall', besideTheWindow: 'kitchen', table: 'byTheWindow', tools: 'onTheTeaTable', clothCount: 1 })

function spotOn(placeId: string, placement: PiecePlacement, spot: SpotOnAPiece): Spot {
  const { x, z } = pointOn(placement, spot.across, spot.forward)
  return { placeId, x: roundedToTheMillimetre(x), y: spot.y, z: roundedToTheMillimetre(z) }
}

function roundedToTheMillimetre(metres: number): number {
  return Math.round(metres * 1000) / 1000
}

function clothsOf(clothCount: number, firstCloth: Spot, secondCloth: Spot): RoomCloth[] {
  return clothIds.slice(0, clothCount).map((id, index) => ({ id, startsAt: index === 0 ? firstCloth : secondCloth }))
}
