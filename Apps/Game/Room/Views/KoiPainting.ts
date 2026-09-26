import type { RoomLog } from '../RoomNavigator.ts'

const canvasWidth = 1024
const canvasHeight = 384
const midline = canvasHeight / 2
const noseX = 958
const peduncleX = 300
const peduncleHalfWidth = 20
const widestX = 730
const widestHalfWidth = 80
const scalesFromX = 330
const scalesToX = 850
const scaleSpacing = 15
const scaleRadius = 10
const skinCentre = '#fcfaf6'
const skinEdge = '#e2ddd6'
const finColour = 'rgba(250, 243, 234, 0.92)'
const finEdgeColour = 'rgba(150, 118, 96, 0.35)'
const finRayColour = 'rgba(176, 132, 104, 0.45)'
const scaleOnWhite = 'rgba(120, 108, 96, 0.16)'
const scaleOnRed = 'rgba(90, 16, 8, 0.28)'
const outlineColour = 'rgba(96, 74, 60, 0.35)'
const eyeColour = '#1a1210'

export type KoiMarkings = {
  readonly centreColour: string
  readonly edgeColour: string
  readonly patches: readonly RedPatch[]
}

type RedPatch = {
  readonly x: number
  readonly y: number
  readonly radiusX: number
  readonly radiusY: number
  readonly wobble: number
  readonly seed: number
}

export const redKoi: KoiMarkings = {
  centreColour: '#d8341c',
  edgeColour: '#b4261a',
  patches: [
    { x: 872, y: midline, radiusX: 40, radiusY: 32, wobble: 0.08, seed: 1 },
    { x: 715, y: midline - 8, radiusX: 92, radiusY: 72, wobble: 0.16, seed: 2 },
    { x: 530, y: midline + 12, radiusX: 78, radiusY: 50, wobble: 0.18, seed: 3 },
    { x: 395, y: midline - 4, radiusX: 44, radiusY: 22, wobble: 0.2, seed: 4 },
  ],
}

const secondKoiPatches: readonly RedPatch[] = [
  { x: 880, y: midline + 6, radiusX: 34, radiusY: 26, wobble: 0.1, seed: 5 },
  { x: 760, y: midline + 14, radiusX: 70, radiusY: 58, wobble: 0.2, seed: 6 },
  { x: 610, y: midline - 16, radiusX: 96, radiusY: 56, wobble: 0.15, seed: 7 },
  { x: 430, y: midline + 6, radiusX: 38, radiusY: 20, wobble: 0.22, seed: 8 },
]

export const orangeKoi: KoiMarkings = { centreColour: '#f58a24', edgeColour: '#dd6414', patches: secondKoiPatches }

export const secondRedKoi: KoiMarkings = { centreColour: '#c9281c', edgeColour: '#a31d14', patches: secondKoiPatches }

export function paintKoi(markings: KoiMarkings, log: RoomLog): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const context = canvas.getContext('2d')
  if (context === null) {
    log('a koi cannot be painted, because the browser gives no 2D canvas, so it is missing from the pond')
    return canvas
  }
  for (const side of [-1, 1]) {
    paintFin(context, 760, side, 1)
    paintFin(context, 548, side, 0.62)
  }
  paintBody(context, markings)
  paintDorsalFin(context)
  paintHead(context)
  paintTail(context)
  return canvas
}

function bodyHalfWidthAt(x: number): number {
  if (x >= widestX) {
    const share = Math.min(1, (x - widestX) / (noseX - widestX))
    return widestHalfWidth * Math.sqrt(1 - share * share * share)
  }
  const share = Math.max(0, (x - peduncleX) / (widestX - peduncleX))
  const smooth = share * share * (3 - 2 * share)
  return peduncleHalfWidth + (widestHalfWidth - peduncleHalfWidth) * smooth
}

function bodyPath(context: CanvasRenderingContext2D): void {
  context.beginPath()
  context.moveTo(peduncleX, midline - peduncleHalfWidth)
  for (let x = peduncleX; x <= noseX; x += 2) context.lineTo(x, midline - bodyHalfWidthAt(x))
  for (let x = noseX; x >= peduncleX; x -= 2) context.lineTo(x, midline + bodyHalfWidthAt(x))
  context.closePath()
}

function paintBody(context: CanvasRenderingContext2D, markings: KoiMarkings): void {
  context.save()
  bodyPath(context)
  const across = context.createLinearGradient(0, midline - widestHalfWidth, 0, midline + widestHalfWidth)
  across.addColorStop(0, skinEdge)
  across.addColorStop(0.5, skinCentre)
  across.addColorStop(1, skinEdge)
  context.fillStyle = across
  context.fill()
  context.clip()
  for (const patch of markings.patches) paintRedPatch(context, patch, markings)
  paintScales(context, markings.patches)
  paintRoundness(context)
  context.restore()
  bodyPath(context)
  context.strokeStyle = outlineColour
  context.lineWidth = 2
  context.stroke()
}

function paintRedPatch(context: CanvasRenderingContext2D, patch: RedPatch, markings: KoiMarkings): void {
  context.beginPath()
  const points = 48
  for (let index = 0; index <= points; index += 1) {
    const angle = (index / points) * Math.PI * 2
    const wobble = 1 + patch.wobble * (Math.sin(angle * 3 + patch.seed) * 0.6 + Math.sin(angle * 5 + patch.seed * 2) * 0.4)
    const x = patch.x + Math.cos(angle) * patch.radiusX * wobble
    const y = patch.y + Math.sin(angle) * patch.radiusY * wobble
    if (index === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  }
  const glow = context.createRadialGradient(patch.x, patch.y, 0, patch.x, patch.y, Math.max(patch.radiusX, patch.radiusY))
  glow.addColorStop(0, markings.centreColour)
  glow.addColorStop(1, markings.edgeColour)
  context.fillStyle = glow
  context.fill()
}

function paintScales(context: CanvasRenderingContext2D, patches: readonly RedPatch[]): void {
  context.lineWidth = 1.6
  for (let x = scalesFromX; x < scalesToX; x += scaleSpacing) {
    const rowShift = Math.round((x - peduncleX) / scaleSpacing) % 2 === 0 ? 0 : scaleSpacing / 2
    for (let y = midline - widestHalfWidth + rowShift; y < midline + widestHalfWidth; y += scaleSpacing) {
      context.strokeStyle = isOnARedPatch(x, y, patches) ? scaleOnRed : scaleOnWhite
      context.beginPath()
      context.arc(x, y, scaleRadius, Math.PI * 0.55, Math.PI * 1.45)
      context.stroke()
    }
  }
}

function isOnARedPatch(x: number, y: number, patches: readonly RedPatch[]): boolean {
  return patches.some((patch) => ((x - patch.x) / patch.radiusX) ** 2 + ((y - patch.y) / patch.radiusY) ** 2 < 1)
}

function paintRoundness(context: CanvasRenderingContext2D): void {
  const shade = context.createLinearGradient(0, midline - widestHalfWidth, 0, midline + widestHalfWidth)
  shade.addColorStop(0, 'rgba(60, 40, 30, 0.22)')
  shade.addColorStop(0.3, 'rgba(60, 40, 30, 0)')
  shade.addColorStop(0.7, 'rgba(60, 40, 30, 0)')
  shade.addColorStop(1, 'rgba(60, 40, 30, 0.22)')
  context.fillStyle = shade
  context.fillRect(0, 0, canvasWidth, canvasHeight)
}

function paintTail(context: CanvasRenderingContext2D): void {
  const top = midline - 142
  const bottom = midline + 142
  context.beginPath()
  context.moveTo(peduncleX + 14, midline - peduncleHalfWidth + 3)
  context.bezierCurveTo(250, midline - 34, 160, top + 36, 84, top)
  context.bezierCurveTo(104, top + 52, 128, midline - 62, 176, midline - 16)
  context.quadraticCurveTo(190, midline, 176, midline + 16)
  context.bezierCurveTo(128, midline + 62, 104, bottom - 52, 84, bottom)
  context.bezierCurveTo(160, bottom - 36, 250, midline + 34, peduncleX + 14, midline + peduncleHalfWidth - 3)
  context.closePath()
  paintFinSurface(context, (ray) => {
    context.moveTo(peduncleX + 6, midline + ray * 1.6)
    context.quadraticCurveTo(210, midline + ray * 9, 84, midline + ray * 16)
  }, 9)
}

function paintFin(context: CanvasRenderingContext2D, rootX: number, side: number, size: number): void {
  const rootY = midline + side * (bodyHalfWidthAt(rootX) - 12 * size)
  const tipX = rootX - 90 * size
  const tipY = rootY + side * 92 * size
  context.beginPath()
  context.moveTo(rootX + 6 * size, rootY)
  context.bezierCurveTo(rootX + 18 * size, rootY + side * 62 * size, tipX + 46 * size, tipY + side * 18 * size, tipX, tipY)
  context.bezierCurveTo(tipX - 26 * size, tipY - side * 8 * size, rootX - 64 * size, rootY + side * 34 * size, rootX - 30 * size, rootY)
  context.closePath()
  paintFinSurface(context, (ray) => {
    const share = (ray + 7) / 14
    context.moveTo(rootX - 12 * size * share, rootY)
    context.lineTo(rootX + 12 * size - share * 118 * size, rootY + side * (100 - share * 20) * size)
  }, 7)
}

function paintFinSurface(context: CanvasRenderingContext2D, drawRay: (ray: number) => void, raysEachSide: number): void {
  context.fillStyle = finColour
  context.fill()
  context.strokeStyle = finEdgeColour
  context.lineWidth = 1.5
  context.stroke()
  context.save()
  context.clip()
  context.strokeStyle = finRayColour
  context.lineWidth = 1.4
  for (let ray = -raysEachSide; ray <= raysEachSide; ray += 1) {
    context.beginPath()
    drawRay(ray)
    context.stroke()
  }
  context.restore()
}

function paintDorsalFin(context: CanvasRenderingContext2D): void {
  context.beginPath()
  context.ellipse(590, midline, 130, 3, 0, 0, Math.PI * 2)
  context.fillStyle = 'rgba(244, 238, 230, 0.3)'
  context.fill()
  context.strokeStyle = 'rgba(150, 110, 90, 0.25)'
  context.lineWidth = 1
  for (let x = 470; x <= 710; x += 10) {
    context.beginPath()
    context.moveTo(x, midline - 3)
    context.lineTo(x - 5, midline + 3)
    context.stroke()
  }
}

function paintHead(context: CanvasRenderingContext2D): void {
  for (const side of [-1, 1]) {
    context.strokeStyle = 'rgba(110, 70, 55, 0.38)'
    context.lineWidth = 2.2
    context.beginPath()
    context.moveTo(842, midline + side * (bodyHalfWidthAt(842) - 4))
    context.quadraticCurveTo(812, midline + side * 30, 836, midline + side * 4)
    context.stroke()
    const eyeY = midline + side * (bodyHalfWidthAt(906) - 13)
    context.fillStyle = 'rgba(230, 214, 196, 0.9)'
    context.beginPath()
    context.arc(906, eyeY, 8.5, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = eyeColour
    context.beginPath()
    context.arc(907, eyeY, 5.5, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = 'rgba(255, 255, 255, 0.85)'
    context.beginPath()
    context.arc(909, eyeY - 1.8, 1.8, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = 'rgba(70, 40, 32, 0.55)'
    context.beginPath()
    context.ellipse(938, midline + side * 15, 3.2, 2, 0, 0, Math.PI * 2)
    context.fill()
    context.strokeStyle = 'rgba(222, 204, 184, 0.95)'
    context.lineWidth = 2.6
    context.beginPath()
    context.moveTo(953, midline + side * 9)
    context.quadraticCurveTo(968, midline + side * 14, 974, midline + side * 26)
    context.stroke()
  }
}
