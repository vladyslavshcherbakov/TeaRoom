import type { AppLog } from '../../../../Engine/AppLog.ts'
import { paintedCanvas } from '../../../../Engine/Rendering/Painting/CanvasPainting.ts'

const canvasWidth = 1600
const canvasHeight = 300
const largestFontPixels = 104
const sideMarginPixels = 40
const marginAroundTheInkPixels = 6
const inkedAlpha = 8
const inkColour = 'rgba(88, 52, 34, 0.9)'
const playfulFonts = '"Chalkboard SE", "Marker Felt", "Comic Sans MS", "Comic Neue", cursive'
const tiltRadians = -0.025
const whenThereIsNoCanvas = 'the prophecy on the beam cannot be painted, because the browser gives no 2D canvas, so the beam shows none'

export const prophecyInscriptionPixelsPerMetre = canvasWidth / 0.95

export function paintProphecyInscription(lines: readonly string[], log: AppLog): HTMLCanvasElement {
  let cropped: HTMLCanvasElement | null = null
  const canvas = paintedCanvas({ width: canvasWidth, height: canvasHeight }, whenThereIsNoCanvas, log, (context, painted) => {
    const fontPixels = largestFontThatFits(context, lines)
    context.font = `${fontPixels}px ${playfulFonts}`
    context.fillStyle = inkColour
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.translate(canvasWidth / 2, canvasHeight / 2)
    context.rotate(tiltRadians)
    const lineHeight = canvasHeight / lines.length
    lines.forEach((line, index) => context.fillText(line, 0, (index + 0.5) * lineHeight - canvasHeight / 2))
    cropped = croppedToTheInk(painted, context, log)
  })
  return cropped ?? canvas
}

function largestFontThatFits(context: CanvasRenderingContext2D, lines: readonly string[]): number {
  context.font = `${largestFontPixels}px ${playfulFonts}`
  const widestLine = Math.max(...lines.map((line) => context.measureText(line).width))
  return Math.floor(largestFontPixels * Math.min(1, (canvasWidth - sideMarginPixels * 2) / widestLine))
}

function croppedToTheInk(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, log: AppLog): HTMLCanvasElement {
  const ink = inkedBoxOf(context.getImageData(0, 0, canvas.width, canvas.height))
  if (ink === null) return canvas
  const left = Math.max(0, ink.left - marginAroundTheInkPixels)
  const top = Math.max(0, ink.top - marginAroundTheInkPixels)
  const right = Math.min(canvas.width, ink.right + marginAroundTheInkPixels)
  const bottom = Math.min(canvas.height, ink.bottom + marginAroundTheInkPixels)
  const size = { width: right - left, height: bottom - top }
  return paintedCanvas(size, whenThereIsNoCanvas, log, (croppedContext) => croppedContext.drawImage(canvas, left, top, size.width, size.height, 0, 0, size.width, size.height))
}

function inkedBoxOf(image: ImageData): { left: number; top: number; right: number; bottom: number } | null {
  let left = image.width
  let top = image.height
  let right = 0
  let bottom = 0
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) < inkedAlpha) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x + 1)
      bottom = Math.max(bottom, y + 1)
    }
  }
  return right === 0 ? null : { left, top, right, bottom }
}
