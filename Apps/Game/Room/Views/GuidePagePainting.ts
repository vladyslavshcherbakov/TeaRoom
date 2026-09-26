const canvasWidth = 256
const canvasHeight = 352
const paperColour = '#f6ecd6'
const inkColour = 'rgba(90, 58, 38, 0.55)'
const headingColour = 'rgba(90, 58, 38, 0.8)'
const marginPx = 30
const lineGapPx = 22
const lineHeightPx = 5
const lineLengthsShare: readonly number[] = [1, 0.92, 0.97, 0.7, 1, 0.88, 0.95, 0.6, 1, 0.9, 0.85, 0.98, 0.5]

export const guidePageAspect = canvasWidth / canvasHeight

export function paintGuidePage(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const context = canvas.getContext('2d')
  if (context === null) return canvas
  context.fillStyle = paperColour
  context.fillRect(0, 0, canvasWidth, canvasHeight)
  context.fillStyle = headingColour
  context.fillRect(marginPx, marginPx, (canvasWidth - 2 * marginPx) * 0.55, lineHeightPx * 2)
  const writingWidth = canvasWidth - 2 * marginPx
  context.fillStyle = inkColour
  lineLengthsShare.forEach((lengthShare, index) => {
    context.fillRect(marginPx, marginPx + 3 * lineGapPx / 2 + index * lineGapPx, writingWidth * lengthShare, lineHeightPx)
  })
  return canvas
}
