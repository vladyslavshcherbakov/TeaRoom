import {
  besideTheWindowChoices,
  clothPlaces,
  tablePlacesBy,
  toolsPlacements,
  windowPlaces,
  type BesideTheWindow,
  type ClothPlace,
  type QuietRoomArrangement,
  type TablePlace,
  type ToolsPlacement,
  type WindowPlace,
} from '../../../Shared/Content/Rooms.ts'

export type CushionColour = 'terracotta' | 'softBlue'

export type ClothPattern = 'blueStripes' | 'redCheck'

export type RoomArrangement = {
  readonly window: WindowPlace
  readonly besideTheWindow: BesideTheWindow
  readonly table: TablePlace
  readonly tools: ToolsPlacement
  readonly cushionColour: CushionColour
  readonly cushionCount: number
  readonly clothPlace: ClothPlace
  readonly clothPattern: ClothPattern
}

export const cushionColours: readonly [CushionColour, ...CushionColour[]] = ['terracotta', 'softBlue']
export const clothPatterns: readonly [ClothPattern, ...ClothPattern[]] = ['blueStripes', 'redCheck']
export const cushionCounts: readonly [number, ...number[]] = [1, 2]

export function arrangementOfANewGame(random: () => number): RoomArrangement {
  const window = oneOf(windowPlaces, random)
  return {
    window,
    besideTheWindow: oneOf(besideTheWindowChoices, random),
    table: oneOf(tablePlacesBy(window), random),
    tools: oneOf(toolsPlacements, random),
    cushionColour: oneOf(cushionColours, random),
    cushionCount: oneOf(cushionCounts, random),
    clothPlace: oneOf(clothPlaces, random),
    clothPattern: oneOf(clothPatterns, random),
  }
}

export function quietRoomArrangementOf(arrangement: RoomArrangement): QuietRoomArrangement {
  return { window: arrangement.window, besideTheWindow: arrangement.besideTheWindow, table: arrangement.table, tools: arrangement.tools, clothPlace: arrangement.clothPlace }
}

export function describeArrangement(arrangement: RoomArrangement): string {
  const cushions = `${arrangement.cushionCount} ${arrangement.cushionColour} cushion${arrangement.cushionCount === 1 ? '' : 's'}`
  return `the window ${arrangement.window}, the ${arrangement.besideTheWindow} beside the window, the tea table ${arrangement.table}, the tools ${arrangement.tools}, ${cushions}, a cloth in ${arrangement.clothPattern} ${arrangement.clothPlace}`
}

export function problemWithArrangement(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return 'it is not an object'
  const arrangement = value as Partial<Record<keyof RoomArrangement, unknown>>
  if (!windowPlaces.includes(arrangement.window as WindowPlace)) return `its window ${String(arrangement.window)} is not one the room has`
  if (!besideTheWindowChoices.includes(arrangement.besideTheWindow as BesideTheWindow)) return `its ${String(arrangement.besideTheWindow)} beside the window is not one the room has`
  if (!tablePlacesBy(arrangement.window as WindowPlace).includes(arrangement.table as TablePlace)) return `its tea table ${String(arrangement.table)} has no place by that window`
  if (!toolsPlacements.includes(arrangement.tools as ToolsPlacement)) return `its tools ${String(arrangement.tools)} are not placed in a way the room has`
  if (!cushionColours.includes(arrangement.cushionColour as CushionColour)) return `its cushion colour ${String(arrangement.cushionColour)} is not one the room has`
  if (!cushionCounts.includes(arrangement.cushionCount as number)) return `its ${String(arrangement.cushionCount)} cushions are not a count the room has`
  if (!clothPlaces.includes(arrangement.clothPlace as ClothPlace)) return `its cloth ${String(arrangement.clothPlace)} is not in a place the room has`
  if (!clothPatterns.includes(arrangement.clothPattern as ClothPattern)) return `its cloth pattern ${String(arrangement.clothPattern)} is not one the room has`
  return null
}

function oneOf<Choice>(choices: readonly [Choice, ...Choice[]], random: () => number): Choice {
  return choices[Math.floor(random() * choices.length)] ?? choices[0]
}
