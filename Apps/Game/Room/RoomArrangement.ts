import {
  besideTheWindowChoices,
  clothCounts,
  tablePlacesBy,
  toolsPlacements,
  windowPlaces,
  type BesideTheWindow,
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
  readonly clothPatterns: readonly ClothPattern[]
}

export const cushionColours: readonly [CushionColour, ...CushionColour[]] = ['terracotta', 'softBlue']
export const clothPatterns: readonly [ClothPattern, ...ClothPattern[]] = ['blueStripes', 'redCheck']
export const cushionCounts: readonly [number, ...number[]] = [1, 2]

export const arrangementBeforeRoomsVaried: RoomArrangement = { window: 'inTheBackWall', besideTheWindow: 'kitchen', table: 'byTheWindow', tools: 'onTheTeaTable', cushionColour: 'terracotta', cushionCount: 1, clothPatterns: ['blueStripes'] }

export function arrangementOfANewGame(random: () => number): RoomArrangement {
  const clothCount = oneOf(clothCounts, random)
  const window = oneOf(windowPlaces, random)
  return {
    window,
    besideTheWindow: oneOf(besideTheWindowChoices, random),
    table: oneOf(tablePlacesBy(window), random),
    tools: oneOf(toolsPlacements, random),
    cushionColour: oneOf(cushionColours, random),
    cushionCount: oneOf(cushionCounts, random),
    clothPatterns: Array.from({ length: clothCount }, () => oneOf(clothPatterns, random)),
  }
}

export function quietRoomArrangementOf(arrangement: RoomArrangement): QuietRoomArrangement {
  return { window: arrangement.window, besideTheWindow: arrangement.besideTheWindow, table: arrangement.table, tools: arrangement.tools, clothCount: arrangement.clothPatterns.length }
}

export function describeArrangement(arrangement: RoomArrangement): string {
  const cushions = `${arrangement.cushionCount} ${arrangement.cushionColour} cushion${arrangement.cushionCount === 1 ? '' : 's'}`
  return `the window ${arrangement.window}, the ${arrangement.besideTheWindow} beside the window, the tea table ${arrangement.table}, the tools ${arrangement.tools}, ${cushions}, cloths in ${arrangement.clothPatterns.join(' and ')}`
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
  const patterns = arrangement.clothPatterns
  if (!Array.isArray(patterns) || !clothCounts.includes(patterns.length)) return 'its cloths are not a count the room has'
  if (!patterns.every((pattern) => clothPatterns.includes(pattern as ClothPattern))) return `its cloth patterns ${patterns.join(', ')} are not ones the room has`
  return null
}

export function arrangementOfAnEarlierSave(saved: unknown): unknown {
  if (typeof saved !== 'object' || saved === null || !('kitchen' in saved)) return saved
  const { kitchen, ...rest } = saved as { readonly kitchen: unknown }
  const window = kitchen === 'facingTheWindow' ? 'alongTheLeftWall' : 'inTheBackWall'
  return { ...rest, window, besideTheWindow: 'kitchen', table: 'byTheWindow' }
}

function oneOf<Choice>(choices: readonly [Choice, ...Choice[]], random: () => number): Choice {
  return choices[Math.floor(random() * choices.length)] ?? choices[0]
}
