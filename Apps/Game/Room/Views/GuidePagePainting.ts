import { seededRandom } from '../SeededRandom.ts'

const canvasWidth = 256
const canvasHeight = 352
const parchmentMiddle = '#f3e4c2'
const parchmentEdge = '#cfae78'
const inkColour = 'rgba(70, 42, 24, 0.55)'
const headingColour = 'rgba(70, 42, 24, 0.8)'
const initialRed = '#8a2e1c'
const initialGold = '#c9a24a'
const foxingColour = 'rgba(150, 100, 50, 0.12)'
const foxingSpots = 14
const foxingSeed = 1605
const marginPx = 28
const lineGapPx = 21
const lineHeightPx = 4
const initialSizePx = 42
const linesBesideTheInitial = 2
const lineLengthsShare: readonly number[] = [1, 0.92, 0.97, 0.7, 1, 0.88, 0.95, 0.6, 1, 0.9, 0.85, 0.98, 0.5]

export function paintGuidePage(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const context = canvas.getContext('2d')
  if (context === null) return canvas
  paintParchment(context)
  paintHeading(context)
  paintInitial(context)
  paintLines(context)
  return canvas
}

function paintParchment(context: CanvasRenderingContext2D): void {
  const aged = context.createRadialGradient(canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.2, canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.7)
  aged.addColorStop(0, parchmentMiddle)
  aged.addColorStop(1, parchmentEdge)
  context.fillStyle = aged
  context.fillRect(0, 0, canvasWidth, canvasHeight)
  const nextRandom = seededRandom(foxingSeed)
  context.fillStyle = foxingColour
  for (let spot = 0; spot < foxingSpots; spot += 1) {
    context.beginPath()
    context.arc(nextRandom() * canvasWidth, nextRandom() * canvasHeight, 2 + nextRandom() * 7, 0, Math.PI * 2)
    context.fill()
  }
}

function paintHeading(context: CanvasRenderingContext2D): void {
  const writingWidth = canvasWidth - 2 * marginPx
  context.fillStyle = headingColour
  context.fillRect(marginPx + writingWidth * 0.2, marginPx, writingWidth * 0.6, lineHeightPx * 2)
  context.fillRect(marginPx + writingWidth * 0.35, marginPx + lineHeightPx * 4, writingWidth * 0.3, 1.5)
}

function paintInitial(context: CanvasRenderingContext2D): void {
  const top = marginPx + lineGapPx * 1.6
  context.fillStyle = initialGold
  context.fillRect(marginPx, top, initialSizePx, initialSizePx)
  context.fillStyle = initialRed
  context.fillRect(marginPx + 3, top + 3, initialSizePx - 6, initialSizePx - 6)
  context.fillStyle = initialGold
  context.font = `bold ${initialSizePx * 0.7}px Georgia, serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('T', marginPx + initialSizePx / 2, top + initialSizePx / 2 + 2)
}

function paintLines(context: CanvasRenderingContext2D): void {
  const writingWidth = canvasWidth - 2 * marginPx
  const firstLineTop = marginPx + lineGapPx * 1.6 + 6
  context.fillStyle = inkColour
  lineLengthsShare.forEach((lengthShare, index) => {
    const indent = index < linesBesideTheInitial ? initialSizePx + 8 : 0
    context.fillRect(marginPx + indent, firstLineTop + index * lineGapPx, (writingWidth - indent) * lengthShare, lineHeightPx)
  })
}
