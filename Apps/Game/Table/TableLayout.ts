export const sceneWidth = 390
export const sceneHeight = 844

export type ScenePoint = {
  readonly x: number
  readonly y: number
}

export type Box = ScenePoint & {
  readonly width: number
  readonly height: number
}

export const vesselHomes: Readonly<Record<string, Box>> = {
  kettle: { x: 205, y: 520, width: 92, height: 78 },
  thermos: { x: 322, y: 500, width: 46, height: 108 },
  bowl1: { x: 110, y: 700, width: 64, height: 36 },
  bowl2: { x: 195, y: 700, width: 64, height: 36 },
  bowl3: { x: 280, y: 700, width: 64, height: 36 },
}

export type VesselShape = 'kettle' | 'thermos' | 'bowl'

export const vesselShapes: Readonly<Record<string, VesselShape>> = {
  kettle: 'kettle',
  thermos: 'thermos',
  bowl1: 'bowl',
  bowl2: 'bowl',
  bowl3: 'bowl',
}

export const windowFrame: Box = { x: 195, y: 190, width: 300, height: 230 }
export const tableTopY = 450

export const heaterPlate: Box = { x: 80, y: 548, width: 104, height: 22 }
export const kettleOnHeater: ScenePoint = { x: 80, y: 500 }
export const heaterSwitch: Box = { x: 80, y: 592, width: 64, height: 30 }
export const caddyHome: Box = { x: 330, y: 612, width: 56, height: 58 }
export const spoonHome: Box = { x: 300, y: 786, width: 76, height: 22 }
export const clothHome: Box = { x: 80, y: 786, width: 86, height: 34 }
export const puddleCentre: ScenePoint = { x: 200, y: 628 }
export const puddleRadius = 56
export const tasteZoneBottomY = 250

export const figurineHomes: Readonly<Record<string, Box>> = {
  dragon: { x: 62, y: 392, width: 54, height: 64 },
  toad: { x: 330, y: 392, width: 54, height: 50 },
}

export const saucerOffset = 44
export const godsPlaque: Box = { x: 78, y: 40, width: 128, height: 36 }
export const finishButton: Box = { x: 330, y: 40, width: 92, height: 36 }

export function problemsLayingOutTable(vesselIds: readonly string[], figurineIds: readonly string[]): string[] {
  return [
    ...vesselIds.filter((id) => vesselHomes[id] === undefined).map((id) => `the table layout has no place for vessel "${id}"`),
    ...figurineIds.filter((id) => figurineHomes[id] === undefined).map((id) => `the table layout has no place for figurine "${id}"`),
  ]
}

export function contains(box: Box, point: ScenePoint, margin = 0): boolean {
  return (
    Math.abs(point.x - box.x) <= box.width / 2 + margin && Math.abs(point.y - box.y) <= box.height / 2 + margin
  )
}

export function saucerOf(figurine: Box): Box {
  return { x: figurine.x, y: figurine.y + saucerOffset, width: figurine.width + 20, height: 26 }
}
