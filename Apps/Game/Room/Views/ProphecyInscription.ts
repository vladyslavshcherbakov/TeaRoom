const canvasWidth = 1600
const canvasHeight = 300
const largestFontPixels = 104
const sideMarginPixels = 40
const inkColour = 'rgba(88, 52, 34, 0.9)'
const playfulFonts = '"Chalkboard SE", "Marker Felt", "Comic Sans MS", "Comic Neue", cursive'
const tiltRadians = -0.025

export const prophecyInscriptionAspect = canvasWidth / canvasHeight

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
  return canvas
}

function largestFontThatFits(context: CanvasRenderingContext2D, lines: readonly string[]): number {
  context.font = `${largestFontPixels}px ${playfulFonts}`
  const widestLine = Math.max(...lines.map((line) => context.measureText(line).width))
  return Math.floor(largestFontPixels * Math.min(1, (canvasWidth - sideMarginPixels * 2) / widestLine))
}
