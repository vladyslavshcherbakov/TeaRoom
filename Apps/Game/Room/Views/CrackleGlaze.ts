import { pseudoRandom } from './PseudoRandom.ts'

const canvasWidth = 1024
const canvasHeight = 512
const skyBlue = [159, 208, 234] as const
const paleSkyBlue = [186, 224, 242] as const
const crackColour = [74, 104, 120] as const
const largeCells = 70
const smallCells = 260
const largeCrackWidth = 0.0024
const smallCrackWidth = 0.0013
const largeCrackDarkness = 0.8
const smallCrackDarkness = 0.35
const cellsStretchAlong = 2

type Seed = { readonly around: number; readonly along: number }

type Rgb = readonly [number, number, number]

export function paintCrackle(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const context = canvas.getContext('2d')
  if (context === null) return canvas
  const largeSeeds = seedsFor(largeCells, 11)
  const smallSeeds = seedsFor(smallCells, 23)
  const image = context.createImageData(canvasWidth, canvasHeight)
  for (let row = 0; row < canvasHeight; row += 1) {
    for (let column = 0; column < canvasWidth; column += 1) {
      const around = column / canvasWidth
      const along = row / canvasHeight
      const glaze = mix(skyBlue, paleSkyBlue, 0.5 + 0.5 * Math.sin(Math.PI * 2 * around * 6 + along * 23) * Math.sin(along * 31 - Math.PI * 2 * around * 3))
      const largeCrack = crackAt(around, along, largeSeeds, largeCrackWidth) * largeCrackDarkness
      const smallCrack = crackAt(around, along, smallSeeds, smallCrackWidth) * smallCrackDarkness
      const colour = mix(glaze, crackColour, Math.max(largeCrack, smallCrack))
      image.data.set([colour[0], colour[1], colour[2], 255], (row * canvasWidth + column) * 4)
    }
  }
  context.putImageData(image, 0, 0)
  return canvas
}

function seedsFor(count: number, salt: number): Seed[] {
  return Array.from({ length: count }, (_, index) => ({ around: pseudoRandom(index * 2 + salt), along: pseudoRandom(index * 2 + 1 + salt * 7) }))
}

function crackAt(around: number, along: number, seeds: readonly Seed[], width: number): number {
  let nearest: Seed | undefined
  let secondNearest: Seed | undefined
  let nearestDistance = Infinity
  let secondDistance = Infinity
  for (const seed of seeds) {
    const distance = distanceBetween(around, along, seed.around, seed.along)
    if (distance < nearestDistance) {
      secondNearest = nearest
      secondDistance = nearestDistance
      nearest = seed
      nearestDistance = distance
    } else if (distance < secondDistance) {
      secondNearest = seed
      secondDistance = distance
    }
  }
  if (nearest === undefined || secondNearest === undefined) return 0
  const seedsApart = distanceBetween(nearest.around, nearest.along, secondNearest.around, secondNearest.along)
  const distanceToTheBorder = (secondDistance ** 2 - nearestDistance ** 2) / (2 * seedsApart)
  return Math.max(0, 1 - distanceToTheBorder / width)
}

function distanceBetween(around: number, along: number, otherAround: number, otherAlong: number): number {
  const acrossTheSeam = Math.abs(around - otherAround)
  return Math.hypot(Math.min(acrossTheSeam, 1 - acrossTheSeam), (along - otherAlong) / cellsStretchAlong)
}

function mix(from: Rgb, to: Rgb, share: number): Rgb {
  return [channelBetween(from[0], to[0], share), channelBetween(from[1], to[1], share), channelBetween(from[2], to[2], share)]
}

function channelBetween(from: number, to: number, share: number): number {
  return Math.round(from + (to - from) * share)
}
