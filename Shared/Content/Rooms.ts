import type { RoomDefinition, Spot } from '../GameLogic/Definitions/RoomDefinition.ts'
import { pointOn, type Facing, type PiecePlacement } from './PiecePlacement.ts'

export type WindowPlace = 'inTheBackWall' | 'alongTheLeftWall'

export type BesideTheWindow = 'kitchen' | 'shelf'

export type TablePlace = 'byTheWindow' | 'againstTheFrontEdge' | 'againstTheRightEdge'

export type ToolsPlacement = 'onTheTeaTable' | 'apart'

export type ClothPlace = 'onTheTeaTable' | 'onTheShelf' | 'onTheCounter'

export type QuietRoomArrangement = {
  readonly window: WindowPlace
  readonly besideTheWindow: BesideTheWindow
  readonly table: TablePlace
  readonly tools: ToolsPlacement
  readonly clothPlace: ClothPlace
}

export type FurnitureArrangement = Pick<QuietRoomArrangement, 'window' | 'besideTheWindow' | 'table'>

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
export const clothPlaces: readonly [ClothPlace, ...ClothPlace[]] = ['onTheTeaTable', 'onTheShelf', 'onTheCounter']

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

export const teaBowlIds = ['bowl1', 'bowl2', 'bowl3', 'bowl4', 'bowl5', 'bowl6', 'bowl7', 'bowl8', 'bowl10', 'bowl11'] as const

export type TeaBowlId = (typeof teaBowlIds)[number]

export const figurineIds = ['dragon', 'toad'] as const

export type FigurineId = (typeof figurineIds)[number]

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
  cloth: { across: 0.85, forward: 0.19, y: 0.9 },
} as const

const onTheShelf = {
  bowls: {
    bowl1: { across: 0.3, forward: 0, y: onTheMiddleBoard },
    bowl2: { across: -0.05, forward: 0, y: onTheMiddleBoard },
    bowl3: { across: -0.4, forward: 0, y: onTheMiddleBoard },
    bowl4: { across: 0.3, forward: 0, y: onTheBottomBoard },
    bowl5: { across: -0.05, forward: 0, y: onTheBottomBoard },
    bowl6: { across: -0.4, forward: 0, y: onTheBottomBoard },
    bowl7: { across: -0.75, forward: 0, y: onTheMiddleBoard },
    bowl8: { across: -0.75, forward: 0, y: onTheBottomBoard },
    bowl10: { across: 0.65, forward: 0, y: onTheBottomBoard },
    bowl11: { across: 0.65, forward: 0, y: onTheMiddleBoard },
  } satisfies Readonly<Record<TeaBowlId, SpotOnAPiece>>,
  caddy: { across: 0.5, forward: 0, y: onTheUpperBoard },
  cloth: { across: -0.5, forward: 0, y: onTheUpperBoard },
} as const

const onTheTeaTable = {
  spoon: { across: 0.45, forward: 0.25, y: 0.42 },
  cloth: { across: -0.5, forward: 0.3, y: 0.42 },
  caddyApart: { across: -0.25, forward: -0.2, y: 0.42 },
} as const

export const quietRoomArrangements: readonly QuietRoomArrangement[] = windowPlaces.flatMap((window) =>
  besideTheWindowChoices.flatMap((besideTheWindow) =>
    tablePlacesBy(window).flatMap((table) => toolsPlacements.flatMap((tools) => clothPlaces.map((clothPlace) => ({ window, besideTheWindow, table, tools, clothPlace })))),
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

export function quietRoomArrangedAs(arrangement: QuietRoomArrangement): RoomDefinition {
  const { counter, shelf, teaTable } = furniturePlacementsFor(arrangement)
  const areToolsApart = arrangement.tools === 'apart'
  const caddy = areToolsApart ? spotOn('teaTable', teaTable, onTheTeaTable.caddyApart) : spotOn('shelf', shelf, onTheShelf.caddy)
  const spoon = areToolsApart ? spotOn('counter', counter, onTheCounter.spoonApart) : spotOn('teaTable', teaTable, onTheTeaTable.spoon)
  return {
    id: 'quietRoom',
    ambientTemperatureC: 22,
    timesOfDay: ['dawn', 'day', 'sunset'],
    weathers: ['rain'],
    places: ['counter', 'shelf', 'teaTable'],
    playerStartsAt: null,
    ritualPlaceId: 'teaTable',
    heaterId: 'electricPlate',
    heaterSpot: spotOn('counter', counter, onTheCounter.heater),
    tap: { sinkSpot: spotOn('counter', counter, onTheCounter.sink), waterTemperatureC: 18, flowMlPerSecond: 50 },
    vessels: [
      { id: 'kettle', definitionId: 'clayKettle', initialWaterMl: 0, teaStock: null, startsAt: spotOn('counter', counter, onTheCounter.kettle) },
      { id: 'thermos', definitionId: 'thermos', initialWaterMl: 0, teaStock: null, startsAt: spotOn('counter', counter, onTheCounter.thermos) },
      ...teaBowlIds.map((id) => ({ id, definitionId: 'teaBowl', initialWaterMl: 0, teaStock: null, startsAt: spotOn('shelf', shelf, onTheShelf.bowls[id]) })),
      { id: 'caddy', definitionId: 'teaCaddy', initialWaterMl: 0, teaStock: { teaId: 'sencha', grams: 60 }, startsAt: caddy },
    ],
    figurineIds,
    spoonCapacityGrams: 3,
    spoonStartsAt: spoon,
    cloths: [{ id: 'cloth', startsAt: clothSpotFor(arrangement.clothPlace, { counter, shelf, teaTable }) }],
  }
}

export const quietRoom = quietRoomArrangedAs({ window: 'inTheBackWall', besideTheWindow: 'kitchen', table: 'byTheWindow', tools: 'onTheTeaTable', clothPlace: 'onTheTeaTable' })

function spotOn(placeId: string, placement: PiecePlacement, spot: SpotOnAPiece): Spot {
  const { x, z } = pointOn(placement, spot.across, spot.forward)
  return { placeId, x: roundedToTheMillimetre(x), y: spot.y, z: roundedToTheMillimetre(z) }
}

function roundedToTheMillimetre(metres: number): number {
  return Math.round(metres * 1000) / 1000
}

function clothSpotFor(clothPlace: ClothPlace, { counter, shelf, teaTable }: FurniturePlacements): Spot {
  switch (clothPlace) {
    case 'onTheTeaTable':
      return spotOn('teaTable', teaTable, onTheTeaTable.cloth)
    case 'onTheShelf':
      return spotOn('shelf', shelf, onTheShelf.cloth)
    case 'onTheCounter':
      return spotOn('counter', counter, onTheCounter.cloth)
  }
}
