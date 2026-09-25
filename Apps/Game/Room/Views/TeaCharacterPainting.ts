import { pseudoRandom } from './PseudoRandom.ts'

const noisePhase = 3.3
const canvasSize = 512
const character = '茶'
const brushFont = "600 400px 'Hiragino Mincho ProN', 'Yu Mincho', 'Songti SC', 'Noto Serif CJK JP', 'Noto Serif CJK SC', 'Noto Serif JP', serif"
const inkColour = 'rgba(28, 16, 10, 0.88)'
const inkBleed = 'rgba(28, 16, 10, 0.18)'
const bleedOffsetsPx = [
  [2, 1],
  [-1, 2],
  [1, -2],
] as const
const clayShowingThroughCount = 900

export const teaCharacterPaintingAspect = 1

export function paintTeaCharacter(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasSize
  canvas.height = canvasSize
  const context = canvas.getContext('2d')
  if (context === null) return canvas
  context.font = brushFont
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = inkBleed
  for (const [x, y] of bleedOffsetsPx) context.fillText(character, canvasSize / 2 + x, canvasSize / 2 + y)
  context.fillStyle = inkColour
  context.fillText(character, canvasSize / 2, canvasSize / 2)
  letTheClayShowThrough(context)
  return canvas
}

function letTheClayShowThrough(context: CanvasRenderingContext2D): void {
  context.globalCompositeOperation = 'destination-out'
  context.fillStyle = 'rgba(0, 0, 0, 0.6)'
  for (let pore = 0; pore < clayShowingThroughCount; pore += 1) {
    context.beginPath()
    context.arc(pseudoRandom(pore * 2, noisePhase) * canvasSize, pseudoRandom(pore * 2 + 1, noisePhase) * canvasSize, 0.6 + pseudoRandom(pore + 500, noisePhase) * 1.6, 0, Math.PI * 2)
    context.fill()
  }
  context.globalCompositeOperation = 'source-over'
}
