import { seededRandom } from '../SeededRandom.ts'

type GinkgoLeaf = {
  readonly baseX: number
  readonly baseY: number
  readonly facingRadians: number
  readonly radiusPx: number
  readonly spreadRadians: number
  readonly stalkEndX: number
  readonly stalkEndY: number
  readonly stalkBend: number
}

const canvasSize = 768
const edgePointCount = 90
const veinCount = 44
const veinsForkAtShare = 0.55
const veinsForkApartRadians = 0.018
const notchHalfWidthShare = 0.03
const notchDepthShare = 0.16
const shouldersShare = 0.32
const scallopDepthShare = 0.012
const scallopsAcross = 26
const speckleCount = 70
const speckleSeed = 20260926
const leafRoot = '#a8680f'
const leafMiddle = '#e3a42a'
const leafEdge = '#f8d766'
const leafOutline = 'rgba(120, 70, 8, 0.7)'
const veinColour = 'rgba(125, 72, 10, 0.5)'
const veinShine = 'rgba(255, 238, 170, 0.35)'
const stalkColour = '#d59a2e'
const stalkShade = 'rgba(110, 62, 8, 0.8)'
const speckleColour = 'rgba(240, 196, 80, 0.75)'

const leavesBackToFront: readonly GinkgoLeaf[] = [
  { baseX: 505, baseY: 520, facingRadians: 0.3, radiusPx: 175, spreadRadians: 1.2, stalkEndX: 300, stalkEndY: 585, stalkBend: 30 },
  { baseX: 330, baseY: 420, facingRadians: -1.75, radiusPx: 255, spreadRadians: 1.25, stalkEndX: 345, stalkEndY: 700, stalkBend: -25 },
]

export const ginkgoPaintingAspect = 1

export function paintGinkgoLeaves(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasSize
  canvas.height = canvasSize
  const context = canvas.getContext('2d')
  if (context === null) return canvas
  paintSpeckles(context)
  for (const leaf of leavesBackToFront) {
    paintStalk(context, leaf)
    paintLeafBlade(context, leaf)
  }
  return canvas
}

function paintSpeckles(context: CanvasRenderingContext2D): void {
  const nextRandom = seededRandom(speckleSeed)
  context.fillStyle = speckleColour
  for (let index = 0; index < speckleCount; index += 1) {
    const angle = nextRandom() * Math.PI * 2
    const distance = Math.sqrt(nextRandom()) * canvasSize * 0.42
    context.beginPath()
    context.arc(canvasSize / 2 + Math.cos(angle) * distance, canvasSize / 2 + Math.sin(angle) * distance, 1 + nextRandom() * 2.2, 0, Math.PI * 2)
    context.fill()
  }
}

function paintStalk(context: CanvasRenderingContext2D, leaf: GinkgoLeaf): void {
  const bendX = (leaf.baseX + leaf.stalkEndX) / 2 + leaf.stalkBend
  const bendY = (leaf.baseY + leaf.stalkEndY) / 2
  context.lineCap = 'round'
  for (const [colour, width] of [[stalkShade, 9], [stalkColour, 5.5]] as const) {
    context.strokeStyle = colour
    context.lineWidth = width
    context.beginPath()
    context.moveTo(leaf.baseX, leaf.baseY)
    context.quadraticCurveTo(bendX, bendY, leaf.stalkEndX, leaf.stalkEndY)
    context.stroke()
  }
}

function paintLeafBlade(context: CanvasRenderingContext2D, leaf: GinkgoLeaf): void {
  const outline = bladeOutline(leaf)
  context.save()
  const gold = context.createRadialGradient(leaf.baseX, leaf.baseY, 0, leaf.baseX, leaf.baseY, leaf.radiusPx)
  gold.addColorStop(0, leafRoot)
  gold.addColorStop(0.45, leafMiddle)
  gold.addColorStop(1, leafEdge)
  context.fillStyle = gold
  context.fill(outline)
  context.clip(outline)
  paintVeins(context, leaf)
  context.restore()
  context.strokeStyle = leafOutline
  context.lineWidth = 2
  context.stroke(outline)
}

function bladeOutline(leaf: GinkgoLeaf): Path2D {
  const outline = new Path2D()
  outline.moveTo(leaf.baseX, leaf.baseY)
  for (let index = 0; index <= edgePointCount; index += 1) {
    const acrossShare = index / edgePointCount
    const angle = leaf.facingRadians - leaf.spreadRadians + acrossShare * 2 * leaf.spreadRadians
    const radius = leaf.radiusPx * edgeReachAt(acrossShare)
    outline.lineTo(leaf.baseX + Math.cos(angle) * radius, leaf.baseY + Math.sin(angle) * radius)
  }
  outline.closePath()
  return outline
}

function edgeReachAt(acrossShare: number): number {
  const shoulder = shouldersShare + (1 - shouldersShare) * Math.pow(Math.sin(acrossShare * Math.PI), 0.3)
  const notch = 1 - notchDepthShare * Math.max(0, 1 - Math.abs(acrossShare - 0.5) / notchHalfWidthShare)
  const scallop = 1 + scallopDepthShare * Math.sin(acrossShare * scallopsAcross * Math.PI)
  return shoulder * notch * scallop
}

function paintVeins(context: CanvasRenderingContext2D, leaf: GinkgoLeaf): void {
  for (let index = 0; index < veinCount; index += 1) {
    const acrossShare = (index + 0.5) / veinCount
    const angle = leaf.facingRadians - leaf.spreadRadians + acrossShare * 2 * leaf.spreadRadians
    const reach = leaf.radiusPx * edgeReachAt(acrossShare)
    paintVein(context, leaf, angle, reach, veinColour, 1.4)
    paintVein(context, leaf, angle + 0.01, reach, veinShine, 0.8)
  }
}

function paintVein(context: CanvasRenderingContext2D, leaf: GinkgoLeaf, angle: number, reach: number, colour: string, width: number): void {
  const forkX = leaf.baseX + Math.cos(angle) * reach * veinsForkAtShare
  const forkY = leaf.baseY + Math.sin(angle) * reach * veinsForkAtShare
  context.strokeStyle = colour
  context.lineWidth = width
  context.beginPath()
  context.moveTo(leaf.baseX, leaf.baseY)
  context.lineTo(forkX, forkY)
  for (const side of [-1, 1]) {
    const branchAngle = angle + side * veinsForkApartRadians
    context.moveTo(forkX, forkY)
    context.lineTo(leaf.baseX + Math.cos(branchAngle) * reach, leaf.baseY + Math.sin(branchAngle) * reach)
  }
  context.stroke()
}
