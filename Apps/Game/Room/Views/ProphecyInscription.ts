const canvasWidth = 1600
const canvasHeight = 300
const largestFontPixels = 104
const sideMarginPixels = 40
const marginAroundTheInkPixels = 6
const inkedAlpha = 8
const inkColour = 'rgba(88, 52, 34, 0.9)'
const playfulFonts = '"Chalkboard SE", "Marker Felt", "Comic Sans MS", "Comic Neue", cursive'
const tiltRadians = -0.025

export const prophecyInscriptionPixelsPerMetre = canvasWidth / 0.95

export function paintProphecyInscription(lines: readonly string[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const context = canvas.getContext('2d')
  if (context === null) return canvas
  const fontPixels = largestFontThatFits(context, lines)
  context.font = `${fontPixels}px ${playfulFonts}`
  context.fillStyle = inkColour
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.translate(canvasWidth / 2, canvasHeight / 2)
  context.rotate(tiltRadians)
  const lineHeight = canvasHeight / lines.length
  lines.forEach((line, index) => context.fillText(line, 0, (index + 0.5) * lineHeight - canvasHeight / 2))
  return croppedToTheInk(canvas, context)
}

function largestFontThatFits(context: CanvasRenderingContext2D, lines: readonly string[]): number {
  context.font = `${largestFontPixels}px ${playfulFonts}`
  const widestLine = Math.max(...lines.map((line) => context.measureText(line).width))
  return Math.floor(largestFontPixels * Math.min(1, (canvasWidth - sideMarginPixels * 2) / widestLine))
}

function croppedToTheInk(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): HTMLCanvasElement {
  const ink = inkedBoxOf(context.getImageData(0, 0, canvas.width, canvas.height))
  if (ink === null) return canvas
  const left = Math.max(0, ink.left - marginAroundTheInkPixels)
  const top = Math.max(0, ink.top - marginAroundTheInkPixels)
  const right = Math.min(canvas.width, ink.right + marginAroundTheInkPixels)
  const bottom = Math.min(canvas.height, ink.bottom + marginAroundTheInkPixels)
  const cropped = document.createElement('canvas')
  cropped.width = right - left
  cropped.height = bottom - top
  cropped.getContext('2d')?.drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height)
  return cropped
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
