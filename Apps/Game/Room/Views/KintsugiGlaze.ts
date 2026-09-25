const canvasWidth = 1024
const canvasHeight = 512
const glazeBlue = '#2b54a0'
const deepGlazeBlue = '#1d3b78'
const goldEdge = '#b9892c'
const goldMiddle = '#f2cf73'
const seamWidthPx = 5
const seamHighlightWidthPx = 2
const branchWidthPx = 3
const crackCount = 5
const stepsPerCrack = 48
const stepLengthPx = 9
const branchesPerCrack = 2
const stepsPerBranch = 14
const seamMarginPx = 12
const glazeSurface = 'rgb(0, 90, 0)'
const goldSurface = 'rgb(0, 35, 255)'

type Point = { readonly x: number; readonly y: number }

export type KintsugiGlaze = {
  readonly colours: HTMLCanvasElement
  readonly surface: HTMLCanvasElement
}

export function paintKintsugi(): KintsugiGlaze {
  const seams = seamPaths()
  const patch = goldPatch()
  return { colours: paintColours(seams, patch), surface: paintSurface(seams, patch) }
}

function paintColours(seams: readonly Point[][], patch: readonly Point[]): HTMLCanvasElement {
  const { canvas, context } = newCanvas()
  if (context === null) return canvas
  const glaze = context.createLinearGradient(0, 0, 0, canvasHeight)
  glaze.addColorStop(0, deepGlazeBlue)
  glaze.addColorStop(0.5, glazeBlue)
  glaze.addColorStop(1, deepGlazeBlue)
  context.fillStyle = glaze
  context.fillRect(0, 0, canvasWidth, canvasHeight)
  fillAroundTheSeam(context, patch, goldMiddle)
  strokeAroundTheSeam(context, [patch], goldEdge, seamHighlightWidthPx)
  strokeAroundTheSeam(context, seams, goldEdge, seamWidthPx)
  strokeAroundTheSeam(context, seams, goldMiddle, seamHighlightWidthPx)
  return canvas
}

function paintSurface(seams: readonly Point[][], patch: readonly Point[]): HTMLCanvasElement {
  const { canvas, context } = newCanvas()
  if (context === null) return canvas
  context.fillStyle = glazeSurface
  context.fillRect(0, 0, canvasWidth, canvasHeight)
  fillAroundTheSeam(context, patch, goldSurface)
  strokeAroundTheSeam(context, seams, goldSurface, seamWidthPx)
  return canvas
}

function newCanvas(): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  return { canvas, context: canvas.getContext('2d') }
}

function seamPaths(): Point[][] {
  const seams: Point[][] = []
  for (let crack = 0; crack < crackCount; crack += 1) {
    const start = { x: ((crack + 0.3 + 0.4 * pseudoRandom(crack * 7 + 1)) / crackCount) * canvasWidth, y: canvasHeight * (0.08 + 0.2 * pseudoRandom(crack * 7 + 2)) }
    const heading = Math.PI / 2 + (pseudoRandom(crack * 7 + 3) - 0.5) * 1.2
    const main = wanderingPath(start, heading, stepsPerCrack, crack * 101)
    seams.push(main)
    for (let branch = 0; branch < branchesPerCrack; branch += 1) {
      const from = main[Math.floor(pseudoRandom(crack * 13 + branch) * main.length)] ?? start
      seams.push(wanderingPath(from, heading + (branch === 0 ? 1 : -1) * 0.9, stepsPerBranch, crack * 211 + branch))
    }
  }
  return seams
}

function wanderingPath(start: Point, heading: number, steps: number, salt: number): Point[] {
  const points = [start]
  let direction = heading
  let point = start
  for (let step = 0; step < steps; step += 1) {
    direction += (pseudoRandom(salt + step) - 0.5) * 0.9
    const nextY = point.y + Math.sin(direction) * stepLengthPx
    if (nextY < seamMarginPx || nextY > canvasHeight - seamMarginPx) direction = -direction
    point = { x: point.x + Math.cos(direction) * stepLengthPx, y: point.y + Math.sin(direction) * stepLengthPx }
    points.push(point)
  }
  return points
}

function goldPatch(): Point[] {
  const centre = { x: canvasWidth * 0.62, y: canvasHeight * 0.3 }
  return Array.from({ length: 7 }, (_, corner) => {
    const angle = (corner / 7) * Math.PI * 2
    const reach = 14 + 10 * pseudoRandom(corner + 900)
    return { x: centre.x + Math.cos(angle) * reach * 1.6, y: centre.y + Math.sin(angle) * reach }
  })
}

function strokeAroundTheSeam(context: CanvasRenderingContext2D, seams: readonly (readonly Point[])[], colour: string, widthPx: number): void {
  context.strokeStyle = colour
  context.lineWidth = widthPx
  context.lineCap = 'round'
  context.lineJoin = 'round'
  for (const shift of [-canvasWidth, 0, canvasWidth]) {
    seams.forEach((seam, index) => {
      context.lineWidth = index % (branchesPerCrack + 1) === 0 ? widthPx : Math.min(widthPx, branchWidthPx)
      tracePath(context, seam, shift)
      context.stroke()
    })
  }
}

function fillAroundTheSeam(context: CanvasRenderingContext2D, patch: readonly Point[], colour: string): void {
  context.fillStyle = colour
  tracePath(context, patch, 0)
  context.closePath()
  context.fill()
}

function tracePath(context: CanvasRenderingContext2D, points: readonly Point[], shiftX: number): void {
  context.beginPath()
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x + shiftX, point.y)
    else context.lineTo(point.x + shiftX, point.y)
  })
}

function pseudoRandom(seed: number): number {
  const wave = Math.sin(seed * 12.9898 + 4.1414) * 43758.5453
  return wave - Math.floor(wave)
}
