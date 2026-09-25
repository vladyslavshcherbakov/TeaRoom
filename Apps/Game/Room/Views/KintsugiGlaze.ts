import { bowlProfile } from './Carried/BowlProfile.ts'

const canvasWidth = 1024
const canvasHeight = 512
const glazeBlue = '#2b54a0'
const deepGlazeBlue = '#1d3b78'
const goldEdge = '#b9892c'
const goldMiddle = '#f2cf73'
const glazeSurface = 'rgb(0, 90, 0)'
const goldSurface = 'rgb(0, 35, 255)'
const seamWidthMetres = 0.0022
const seamHighlightWidthMetres = 0.0008
const patchEdgeWidthPx = 2
const crackDetailLevels = 6
const crackRoughnessShare = 0.09
const crackRoughnessFallPerLevel = 0.55
const pastTheRimShare = 0.05
const impact = { turn: 1.2, shareToTheCentre: 0.72 }
const turnsWhereCracksReachTheRim = [0.2, 2.3, 3.9, 5.3]
const chippedShard = { crackIndex: 2, shareAlong: 0.55, turnAtTheRim: 3.15 }
const splitWideShard = { crackIndex: 3, shareAlong: 0.6, turnAtTheRim: 4.55 }
const innerShard = { fromCrackIndex: 3, fromShareAlong: 0.4, toCrackIndex: 0, toShareAlong: 0.45 }
const patchCorners = 7
const patchSmallestReachMetres = 0.005
const patchReachSpreadMetres = 0.003
const patchWidthToHeight = 1.3

type DiscPoint = { readonly x: number; readonly y: number }
type SurfacePoint = { readonly turn: number; readonly shareToTheCentre: number }
type Side = 'inside' | 'outside'
type CanvasPoint = { readonly x: number; readonly y: number }

export type KintsugiGlaze = {
  readonly colours: HTMLCanvasElement
  readonly surface: HTMLCanvasElement
}

const profileLengths = cumulativeLengths()
const profileLength = profileLengths.at(-1) ?? 0
const rimIndex = bowlProfile.reduce((highest, point, index) => (point.y > (bowlProfile[highest]?.y ?? 0) ? index : highest), 0)
const rimLength = profileLengths[rimIndex] ?? 0
const insideLength = profileLength - rimLength
const discRadius = insideLength

export function paintKintsugi(): KintsugiGlaze {
  const cracks = cracksOfTheBreak()
  const patch = lostChip(cracks)
  return { colours: paintColours(cracks, patch), surface: paintSurface(cracks, patch) }
}

function paintColours(cracks: readonly (readonly DiscPoint[])[], patch: readonly DiscPoint[]): HTMLCanvasElement {
  const { canvas, context } = newCanvas()
  if (context === null) return canvas
  const glaze = context.createLinearGradient(0, 0, 0, canvasHeight)
  glaze.addColorStop(0, deepGlazeBlue)
  glaze.addColorStop(0.5, glazeBlue)
  glaze.addColorStop(1, deepGlazeBlue)
  context.fillStyle = glaze
  context.fillRect(0, 0, canvasWidth, canvasHeight)
  fillSeams(context, cracks, seamWidthMetres, goldEdge)
  fillPatch(context, patch, goldMiddle, goldEdge)
  fillSeams(context, cracks, seamHighlightWidthMetres, goldMiddle)
  return canvas
}

function paintSurface(cracks: readonly (readonly DiscPoint[])[], patch: readonly DiscPoint[]): HTMLCanvasElement {
  const { canvas, context } = newCanvas()
  if (context === null) return canvas
  context.fillStyle = glazeSurface
  context.fillRect(0, 0, canvasWidth, canvasHeight)
  fillSeams(context, cracks, seamWidthMetres, goldSurface)
  fillPatch(context, patch, goldSurface, goldSurface)
  return canvas
}

function newCanvas(): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  return { canvas, context: canvas.getContext('2d') }
}

function cracksOfTheBreak(): DiscPoint[][] {
  const impactPoint = discPointOf(impact)
  const fromTheImpact = turnsWhereCracksReachTheRim.map((turn, index) => jaggedCrack(impactPoint, discPointOf({ turn, shareToTheCentre: -pastTheRimShare }), index * 97))
  const chipped = crackToTheRim(fromTheImpact, chippedShard, 701)
  const split = crackToTheRim(fromTheImpact, splitWideShard, 907)
  const innerFrom = pointAlong(fromTheImpact[innerShard.fromCrackIndex], innerShard.fromShareAlong)
  const innerTo = pointAlong(fromTheImpact[innerShard.toCrackIndex], innerShard.toShareAlong)
  return [...fromTheImpact, chipped, split, jaggedCrack(innerFrom, innerTo, 809)]
}

function crackToTheRim(fromTheImpact: readonly (readonly DiscPoint[])[], shard: typeof chippedShard, salt: number): DiscPoint[] {
  const from = pointAlong(fromTheImpact[shard.crackIndex], shard.shareAlong)
  return jaggedCrack(from, discPointOf({ turn: shard.turnAtTheRim, shareToTheCentre: -pastTheRimShare }), salt)
}

function lostChip(cracks: readonly (readonly DiscPoint[])[]): DiscPoint[] {
  const centre = pointAlong(cracks[chippedShard.crackIndex], chippedShard.shareAlong)
  const turn = Math.atan2(centre.y, centre.x)
  const across = { x: -Math.sin(turn), y: Math.cos(turn) }
  const along = { x: Math.cos(turn), y: Math.sin(turn) }
  return Array.from({ length: patchCorners }, (_, corner) => {
    const angle = (corner / patchCorners) * Math.PI * 2
    const reach = patchSmallestReachMetres + patchReachSpreadMetres * pseudoRandom(corner + 900)
    const acrossMetres = Math.cos(angle) * reach * patchWidthToHeight
    const alongMetres = Math.sin(angle) * reach
    return { x: centre.x + across.x * acrossMetres + along.x * alongMetres, y: centre.y + across.y * acrossMetres + along.y * alongMetres }
  })
}

function jaggedCrack(from: DiscPoint, to: DiscPoint, salt: number): DiscPoint[] {
  let points = [from, to]
  let roughness = Math.hypot(to.x - from.x, to.y - from.y) * crackRoughnessShare
  for (let level = 0; level < crackDetailLevels; level += 1) {
    const finer: DiscPoint[] = [from]
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1] ?? from
      const end = points[index] ?? to
      const length = Math.hypot(end.x - start.x, end.y - start.y)
      const push = (pseudoRandom(salt + level * 131 + index) - 0.5) * 2 * roughness
      const middle = { x: (start.x + end.x) / 2 - ((end.y - start.y) / length) * push, y: (start.y + end.y) / 2 + ((end.x - start.x) / length) * push }
      finer.push(middle, end)
    }
    points = finer
    roughness *= crackRoughnessFallPerLevel
  }
  return points
}

function pointAlong(crack: readonly DiscPoint[] | undefined, share: number): DiscPoint {
  return crack?.[Math.round(share * (crack.length - 1))] ?? { x: 0, y: 0 }
}

function fillSeams(context: CanvasRenderingContext2D, cracks: readonly (readonly DiscPoint[])[], widthMetres: number, colour: string): void {
  context.fillStyle = colour
  for (const side of ['inside', 'outside'] as const) {
    context.save()
    clipToTheSide(context, side)
    for (const crack of cracks) fillOutline(context, seamOutline(crack, side, widthMetres))
    context.restore()
  }
}

function clipToTheSide(context: CanvasRenderingContext2D, side: Side): void {
  const rimY = canvasPointAt(0, rimLength).y
  context.beginPath()
  if (side === 'inside') context.rect(0, 0, canvasWidth, rimY)
  else context.rect(0, rimY, canvasWidth, canvasHeight - rimY)
  context.clip()
}

function fillPatch(context: CanvasRenderingContext2D, patch: readonly DiscPoint[], fill: string, edge: string): void {
  context.fillStyle = fill
  context.strokeStyle = edge
  context.lineWidth = patchEdgeWidthPx
  context.lineJoin = 'round'
  for (const side of ['inside', 'outside'] as const) {
    const outline = unwrapped(patch.map((point) => surfacePointOf(point))).map((point) => canvasPointOf(point, side))
    fillOutline(context, outline, true)
  }
}

function seamOutline(crack: readonly DiscPoint[], side: Side, widthMetres: number): CanvasPoint[] {
  const surfacePoints = unwrapped(crack.map((point) => surfacePointOf(point)))
  const left: CanvasPoint[] = []
  const right: CanvasPoint[] = []
  surfacePoints.forEach((point, index) => {
    const before = surfacePoints[Math.max(0, index - 1)] ?? point
    const after = surfacePoints[Math.min(surfacePoints.length - 1, index + 1)] ?? point
    const radius = Math.max(radiusAt(lengthAlongTheProfile(point, side)), 0.001)
    const acrossMetres = (after.turn - before.turn) * radius
    const downMetres = lengthAlongTheProfile(after, side) - lengthAlongTheProfile(before, side)
    const stepMetres = Math.hypot(acrossMetres, downMetres) || 1
    const halfWidth = widthMetres / 2
    const turnShift = ((-downMetres / stepMetres) * halfWidth) / radius
    const lengthShift = (acrossMetres / stepMetres) * halfWidth
    left.push(canvasPointAt(point.turn + turnShift, lengthAlongTheProfile(point, side) + lengthShift))
    right.push(canvasPointAt(point.turn - turnShift, lengthAlongTheProfile(point, side) - lengthShift))
  })
  return [...left, ...right.reverse()]
}

function fillOutline(context: CanvasRenderingContext2D, outline: readonly CanvasPoint[], isStroked = false): void {
  for (const shift of [-canvasWidth, 0, canvasWidth]) {
    context.beginPath()
    outline.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x + shift, point.y)
      else context.lineTo(point.x + shift, point.y)
    })
    context.closePath()
    context.fill()
    if (isStroked) context.stroke()
  }
}

function discPointOf(point: SurfacePoint): DiscPoint {
  const distanceFromTheCentre = (1 - point.shareToTheCentre) * discRadius
  return { x: Math.cos(point.turn) * distanceFromTheCentre, y: Math.sin(point.turn) * distanceFromTheCentre }
}

function surfacePointOf(point: DiscPoint): SurfacePoint {
  return { turn: Math.atan2(point.y, point.x), shareToTheCentre: 1 - Math.hypot(point.x, point.y) / discRadius }
}

function unwrapped(points: readonly SurfacePoint[]): SurfacePoint[] {
  const continuous: SurfacePoint[] = []
  for (const point of points) {
    const previous = continuous.at(-1)
    if (previous === undefined) {
      continuous.push(point)
      continue
    }
    const fullTurns = Math.round((previous.turn - point.turn) / (Math.PI * 2))
    continuous.push({ ...point, turn: point.turn + fullTurns * Math.PI * 2 })
  }
  return continuous
}

function lengthAlongTheProfile(point: SurfacePoint, side: Side): number {
  return side === 'inside' ? rimLength + point.shareToTheCentre * insideLength : rimLength - point.shareToTheCentre * rimLength
}

function canvasPointOf(point: SurfacePoint, side: Side): CanvasPoint {
  return canvasPointAt(point.turn, lengthAlongTheProfile(point, side))
}

function canvasPointAt(turn: number, length: number): CanvasPoint {
  const profileIndex = profileIndexAt(length)
  return { x: (turn / (Math.PI * 2)) * canvasWidth, y: (1 - profileIndex / (bowlProfile.length - 1)) * canvasHeight }
}

function profileIndexAt(length: number): number {
  const clamped = Math.min(Math.max(length, 0), profileLength)
  const after = profileLengths.findIndex((lengthSoFar) => lengthSoFar >= clamped)
  if (after <= 0) return 0
  const before = profileLengths[after - 1] ?? 0
  const next = profileLengths[after] ?? before
  return after - 1 + (next === before ? 0 : (clamped - before) / (next - before))
}

function radiusAt(length: number): number {
  const profileIndex = profileIndexAt(length)
  const before = bowlProfile[Math.floor(profileIndex)]
  const after = bowlProfile[Math.ceil(profileIndex)] ?? before
  if (before === undefined || after === undefined) return 0
  return before.x + (after.x - before.x) * (profileIndex - Math.floor(profileIndex))
}

function cumulativeLengths(): number[] {
  const lengths = [0]
  for (let index = 1; index < bowlProfile.length; index += 1) {
    const before = bowlProfile[index - 1]
    const point = bowlProfile[index]
    const soFar = lengths.at(-1) ?? 0
    lengths.push(before === undefined || point === undefined ? soFar : soFar + before.distanceTo(point))
  }
  return lengths
}

function pseudoRandom(seed: number): number {
  const wave = Math.sin(seed * 12.9898 + 4.1414) * 43758.5453
  return wave - Math.floor(wave)
}
