import { roomHalfSize } from './RoomLayout.ts'

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

type Bed = {
  readonly kinds: readonly PlantKind[]
  readonly fromX: number
  readonly toX: number
  readonly fromZ: number
  readonly toZ: number
  readonly count: number
}

const clearOfTheWallsMetres = 0.35
const gardenReachMetres = 9
const grassTufts = 1400
const bloomsOnARoseBush = 7
export const roseBushRadiusMetres = 0.28
export const roseBushCentreHeightMetres = 0.22
export const roseBushSquash = 0.8
const lowestRoseOnTheBushRadians = 0.25
const roseHeightSpreadRadians = 1
const sunflowersFaceTheCameraRadians = (3 * Math.PI) / 4
const layoutSeed = 20260925
const outside = roomHalfSize + clearOfTheWallsMetres

const flowerBeds: readonly Bed[] = [
  { kinds: ['tulip', 'daisy', 'marigold', 'poppy'], fromX: -3.2, toX: 3.4, fromZ: outside, toZ: outside + 0.9, count: 150 },
  { kinds: ['roseBush'], fromX: outside + 0.1, toX: outside + 0.8, fromZ: -2.8, toZ: 2.8, count: 7 },
  { kinds: ['marigold', 'daisy', 'tulip'], fromX: outside, toX: outside + 0.5, fromZ: -3.2, toZ: 3.2, count: 60 },
  { kinds: ['sunflower'], fromX: outside + 0.3, toX: outside + 1.2, fromZ: -outside - 1.5, toZ: -outside, count: 5 },
  { kinds: ['sunflower'], fromX: -outside - 1.5, toX: -outside, fromZ: outside + 0.3, toZ: outside + 1.2, count: 5 },
  { kinds: ['poppy', 'daisy'], fromX: -gardenReachMetres + 2, toX: gardenReachMetres - 2, fromZ: outside + 1.4, toZ: gardenReachMetres - 1, count: 90 },
  { kinds: ['poppy', 'daisy'], fromX: outside + 1.4, toX: gardenReachMetres - 1, fromZ: -gardenReachMetres + 2, toZ: gardenReachMetres - 2, count: 90 },
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
  for (const bed of flowerBeds) {
    for (let index = 0; index < bed.count; index += 1) {
      const kind = bed.kinds[Math.floor(nextRandom() * bed.kinds.length)] ?? 'daisy'
      const plant = plantAt(kind, bed.fromX + nextRandom() * (bed.toX - bed.fromX), bed.fromZ + nextRandom() * (bed.toZ - bed.fromZ), nextRandom)
      plants.push(plant)
      if (kind === 'roseBush') plants.push(...rosesOn(plant, nextRandom))
    }
  }
  while (plants.filter((plant) => plant.kind === 'grassTuft').length < grassTufts) {
    const x = (nextRandom() * 2 - 1) * gardenReachMetres
    const z = (nextRandom() * 2 - 1) * gardenReachMetres
    if (isOutsideTheRoom(x, z)) plants.push(plantAt('grassTuft', x, z, nextRandom))
  }
  return plants
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

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}
