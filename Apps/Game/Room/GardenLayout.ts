import { roomHalfSize } from './RoomLayout.ts'
import { seededRandom } from './SeededRandom.ts'

export type PlantKind = 'grassTuft' | 'marigold' | 'daisy' | 'poppy' | 'tulip' | 'sunflower' | 'roseBush' | 'rose'

export type Plant = {
  readonly kind: PlantKind
  readonly x: number
  readonly y: number
  readonly z: number
  readonly turnRadians: number
  readonly scale: number
  readonly bloomColour: string
}

type Scatter = {
  readonly kinds: readonly PlantKind[]
  readonly count: number
  readonly footprintRadiusMetres: number
}

type TakenCircle = {
  readonly x: number
  readonly z: number
  readonly radius: number
}

const clearOfTheWallsMetres = 0.35
const gardenReachMetres = 12
const grassTufts = 2670
const crowdingCellMetres = 0.8
const bloomsOnARoseBush = 7
export const roseBushRadiusMetres = 0.28
export const roseBushCentreHeightMetres = 0.22
export const roseBushSquash = 0.8
const lowestRoseOnTheBushRadians = 0.25
const roseHeightSpreadRadians = 1
const sunflowersFaceTheCameraRadians = (3 * Math.PI) / 4
const triesForEachPlant = 30
const layoutSeed = 20260925
const outside = roomHalfSize + clearOfTheWallsMetres

const scatters: readonly Scatter[] = [
  { kinds: ['roseBush'], count: 11, footprintRadiusMetres: 0.4 },
  { kinds: ['tulip', 'daisy', 'marigold', 'poppy'], count: 1230, footprintRadiusMetres: 0.08 },
]


const bloomColoursByKind: Readonly<Record<PlantKind, readonly string[]>> = {
  grassTuft: ['#5f9a3e', '#6fae47', '#4f8a36'],
  marigold: ['#f08a1a', '#f6b21e', '#e5641b'],
  daisy: ['#ffffff'],
  poppy: ['#d7261e', '#e8401f'],
  tulip: ['#d8232a', '#f4c430', '#ef7aa4', '#ffffff'],
  sunflower: ['#f7c21a'],
  roseBush: ['#35602c'],
  rose: ['#c8102e', '#e75480', '#fff4f2'],
}

export function gardenPlants(): Plant[] {
  const nextRandom = seededRandom(layoutSeed)
  const plants: Plant[] = []
  const takenCircles = new Map<string, TakenCircle[]>()
  for (const scatter of scatters) {
    for (let index = 0; index < scatter.count; index += 1) {
      const spot = freeSpotFor(scatter, takenCircles, nextRandom)
      if (spot === null) continue
      const cellKey = crowdingCellKey(spot.x, spot.z)
      takenCircles.set(cellKey, [...(takenCircles.get(cellKey) ?? []), { ...spot, radius: scatter.footprintRadiusMetres }])
      const kind = scatter.kinds[Math.floor(nextRandom() * scatter.kinds.length)] ?? 'daisy'
      const plant = plantAt(kind, spot.x, spot.z, nextRandom)
      plants.push(plant)
      if (kind === 'roseBush') plants.push(...rosesOn(plant, nextRandom))
    }
  }
  let tuftsPlanted = 0
  while (tuftsPlanted < grassTufts) {
    const spot = spotWithin(gardenReachMetres, nextRandom)
    if (!isOutsideTheRoom(spot.x, spot.z)) continue
    plants.push(plantAt('grassTuft', spot.x, spot.z, nextRandom))
    tuftsPlanted += 1
  }
  return plants
}

function freeSpotFor(scatter: Scatter, takenCircles: ReadonlyMap<string, readonly TakenCircle[]>, nextRandom: () => number): { x: number; z: number } | null {
  for (let attempt = 0; attempt < triesForEachPlant; attempt += 1) {
    const spot = spotWithin(gardenReachMetres, nextRandom)
    if (!isOutsideTheRoom(spot.x, spot.z)) continue
    const isCrowded = circlesAround(takenCircles, spot.x, spot.z).some((circle) => Math.hypot(circle.x - spot.x, circle.z - spot.z) < circle.radius + scatter.footprintRadiusMetres)
    if (!isCrowded) return spot
  }
  return null
}

function circlesAround(takenCircles: ReadonlyMap<string, readonly TakenCircle[]>, x: number, z: number): TakenCircle[] {
  const column = Math.floor(x / crowdingCellMetres)
  const row = Math.floor(z / crowdingCellMetres)
  return [-1, 0, 1].flatMap((columnStep) => [-1, 0, 1].flatMap((rowStep) => takenCircles.get(`${column + columnStep},${row + rowStep}`) ?? []))
}

function crowdingCellKey(x: number, z: number): string {
  return `${Math.floor(x / crowdingCellMetres)},${Math.floor(z / crowdingCellMetres)}`
}

function spotWithin(reachMetres: number, nextRandom: () => number): { x: number; z: number } {
  return { x: (nextRandom() * 2 - 1) * reachMetres, z: (nextRandom() * 2 - 1) * reachMetres }
}

function isOutsideTheRoom(x: number, z: number): boolean {
  return Math.abs(x) > outside || Math.abs(z) > outside
}

function plantAt(kind: PlantKind, x: number, z: number, nextRandom: () => number): Plant {
  const colours = bloomColoursByKind[kind]
  const turnRadians = kind === 'sunflower' ? sunflowersFaceTheCameraRadians + (nextRandom() - 0.5) * 0.4 : nextRandom() * Math.PI * 2
  return { kind, x, y: 0, z, turnRadians, scale: 0.8 + nextRandom() * 0.4, bloomColour: colours[Math.floor(nextRandom() * colours.length)] ?? '#ffffff' }
}

function rosesOn(bush: Plant, nextRandom: () => number): Plant[] {
  return Array.from({ length: bloomsOnARoseBush }, () => {
    const around = nextRandom() * Math.PI * 2
    const upwards = lowestRoseOnTheBushRadians + nextRandom() * roseHeightSpreadRadians
    const reach = roseBushRadiusMetres * bush.scale * Math.cos(upwards)
    const rose = plantAt('rose', bush.x + Math.cos(around) * reach, bush.z + Math.sin(around) * reach, nextRandom)
    return { ...rose, y: bush.scale * (roseBushCentreHeightMetres + roseBushRadiusMetres * roseBushSquash * Math.sin(upwards)) }
  })
}
