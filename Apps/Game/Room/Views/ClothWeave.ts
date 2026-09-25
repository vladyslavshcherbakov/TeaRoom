import type { ClothPattern } from '../RoomArrangement.ts'
import { pseudoRandom } from './PseudoRandom.ts'

const canvasWidth = 560
const canvasHeight = 400
const threadSpacing = 4
const threadWidth = 2.4
const linenColour = '#ece3cf'
const stripeColour = '#56698a'
const redCheckGroundColour = '#b8434a'
const redCheckBandColour = 'rgba(255, 250, 240, 0.5)'
const redCheckRepeat = 40
const redCheckBandWidth = 20
const hemWidth = 10
const hemColour = 'rgba(120, 100, 76, 0.28)'
const stitchColour = 'rgba(96, 80, 62, 0.45)'
const stitchLength = 7
const stitchGap = 5
const stitchInset = 5
const crossingShadow = 'rgba(70, 55, 40, 0.1)'

type Stripe = { readonly fromShare: number; readonly toShare: number }

const stripesNearOneEnd: readonly Stripe[] = [
  { fromShare: 0.1, toShare: 0.145 },
  { fromShare: 0.175, toShare: 0.195 },
]

export function weaveCloth(pattern: ClothPattern): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const context = canvas.getContext('2d')
  if (context === null) return canvas
  if (pattern === 'blueStripes') paintBlueStripes(context)
  else paintRedCheck(context)
  paintThreads(context)
  paintHem(context)
  return canvas
}

function paintBlueStripes(context: CanvasRenderingContext2D): void {
  context.fillStyle = linenColour
  context.fillRect(0, 0, canvasWidth, canvasHeight)
  context.fillStyle = stripeColour
  for (const stripe of stripesNearOneEnd) {
    const from = stripe.fromShare * canvasWidth
    context.fillRect(from, 0, stripe.toShare * canvasWidth - from, canvasHeight)
  }
}

function paintRedCheck(context: CanvasRenderingContext2D): void {
  context.fillStyle = redCheckGroundColour
  context.fillRect(0, 0, canvasWidth, canvasHeight)
  context.fillStyle = redCheckBandColour
  for (let x = 0; x < canvasWidth; x += redCheckRepeat) context.fillRect(x, 0, redCheckBandWidth, canvasHeight)
  for (let y = 0; y < canvasHeight; y += redCheckRepeat) context.fillRect(0, y, canvasWidth, redCheckBandWidth)
}

function paintThreads(context: CanvasRenderingContext2D): void {
  context.lineWidth = threadWidth
  for (let x = threadSpacing / 2; x < canvasWidth; x += threadSpacing) {
    context.strokeStyle = threadShade(x, 0.1)
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, canvasHeight)
    context.stroke()
  }
  for (let y = threadSpacing / 2; y < canvasHeight; y += threadSpacing) {
    context.strokeStyle = threadShade(y + canvasWidth, 0.14)
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(canvasWidth, y)
    context.stroke()
  }
  paintCrossings(context)
}

function paintCrossings(context: CanvasRenderingContext2D): void {
  context.fillStyle = crossingShadow
  for (let x = 0; x < canvasWidth; x += threadSpacing) {
    for (let y = 0; y < canvasHeight; y += threadSpacing) {
      if ((x / threadSpacing + y / threadSpacing) % 2 === 0) context.fillRect(x, y, threadSpacing / 2, threadSpacing / 2)
    }
  }
}

function threadShade(seed: number, strongest: number): string {
  const shade = pseudoRandom(seed)
  return shade < 0.5 ? `rgba(255, 252, 244, ${(strongest * (0.5 - shade) * 2).toFixed(3)})` : `rgba(90, 72, 52, ${(strongest * (shade - 0.5) * 2).toFixed(3)})`
}

function paintHem(context: CanvasRenderingContext2D): void {
  context.strokeStyle = hemColour
  context.lineWidth = hemWidth
  context.strokeRect(hemWidth / 2, hemWidth / 2, canvasWidth - hemWidth, canvasHeight - hemWidth)
  context.strokeStyle = stitchColour
  context.lineWidth = 1.4
  context.setLineDash([stitchLength, stitchGap])
  context.strokeRect(hemWidth + stitchInset, hemWidth + stitchInset, canvasWidth - 2 * (hemWidth + stitchInset), canvasHeight - 2 * (hemWidth + stitchInset))
  context.setLineDash([])
}
