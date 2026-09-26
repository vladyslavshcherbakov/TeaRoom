import { bowlProfile } from './Carried/BowlProfile.ts'
import { clampedToShare } from '../../../../Shared/Simulation/Physics/ClampedToShare.ts'
import { pseudoRandom } from './PseudoRandom.ts'
import type { RoomLog } from '../RoomNavigator.ts'

const noisePhase = 4.1414
const canvasWidth = 1024
const canvasHeight = 512
const lapisBlue: Rgb = [2, 6, 38]
const paleRunBlue: Rgb = [20, 42, 100]
const bareClay: Rgb = [82, 50, 27]
const darkClay: Rgb = [40, 23, 13]
const glazeRoughness = 0.38
const clayRoughness = 0.9
const bareClayUpToProfileIndex = 3.2
const bareClayEdgeWobblePx = 6
const bareClayEdgeWavelengthPx = 30
const glazeCloudsAcross = 8
const glazeCloudShare = 0.2
const runWavelengthPx = 9
const runLengthWavelengthPx = 23
const shortestRunPx = 20
const runLengthSpreadPx = 120
const runsFromShare = 0.5
const runFullStrengthShare = 0.75
const thinGlazeAtTheRimPx = 10
const lapisShowingThroughShare = 0.15
const paleRunShare = 0.5
const goldEdge = '#b9892c'
const goldMiddle = '#f2cf73'
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
type Rgb = readonly [number, number, number]

type GlazeColumn = {
  readonly bareClayBelowY: number
  readonly run: number
  readonly runLength: number
}

type NoiseLattice = {
  readonly period: number
  readonly valuesByRow: readonly Float64Array[]
}

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
const rimY = canvasPointAt(0, rimLength).y
const footY = (1 - bareClayUpToProfileIndex / (bowlProfile.length - 1)) * canvasHeight
const cloudLatticesByFrequency = new Map<number, NoiseLattice>()

export function paintKintsugi(log: RoomLog): KintsugiGlaze {
  const cracks = cracksOfTheBreak()
  const patch = lostChip(cracks)
  const columns = Array.from({ length: canvasWidth }, (_, x) => glazeColumnAt(x))
  return { colours: paintColours(cracks, patch, columns, log), surface: paintSurface(cracks, patch, columns, log) }
}

function paintColours(cracks: readonly (readonly DiscPoint[])[], patch: readonly DiscPoint[], columns: readonly GlazeColumn[], log: RoomLog): HTMLCanvasElement {
  const { canvas, context } = newCanvas()
  if (context === null) {
    log('the kintsugi glaze cannot be painted, because the browser gives no 2D canvas, so the dark blue bowl is blank')
    return canvas
  }
  paintEveryPixel(context, columns, (x, y, column) => (isBareClayAt(y, column) ? mixed(bareClay, darkClay, clouds(x, y, glazeCloudsAcross * 3)) : ruriGlazeAt(x, y, column)))
  fillSeams(context, cracks, seamWidthMetres, goldEdge)
  fillPatch(context, patch, goldMiddle, goldEdge)
  fillSeams(context, cracks, seamHighlightWidthMetres, goldMiddle)
  return canvas
}

function paintSurface(cracks: readonly (readonly DiscPoint[])[], patch: readonly DiscPoint[], columns: readonly GlazeColumn[], log: RoomLog): HTMLCanvasElement {
  const { canvas, context } = newCanvas()
  if (context === null) {
    log('the shine of the kintsugi gold cannot be painted, because the browser gives no 2D canvas, so the dark blue bowl shines evenly')
    return canvas
  }
  paintEveryPixel(context, columns, (_, y, column) => (isBareClayAt(y, column) ? [0, Math.round(255 * clayRoughness), 0] : [255, Math.round(255 * glazeRoughness), 0]))
  fillSeams(context, cracks, seamWidthMetres, goldSurface)
  fillPatch(context, patch, goldSurface, goldSurface)
  return canvas
}

function glazeColumnAt(x: number): GlazeColumn {
  const wobble = bareClayEdgeWobblePx * valueNoise(x / bareClayEdgeWavelengthPx, 3, canvasWidth / bareClayEdgeWavelengthPx)
  const run = valueNoise(x / runWavelengthPx, 0.5, canvasWidth / runWavelengthPx)
  const runLength = shortestRunPx + runLengthSpreadPx * valueNoise(x / runLengthWavelengthPx, 7.5, canvasWidth / runLengthWavelengthPx) ** 2
  return { bareClayBelowY: footY - wobble, run, runLength }
}

function ruriGlazeAt(x: number, y: number, { run, runLength }: GlazeColumn): Rgb {
  const fromTheRim = Math.abs(y - rimY)
  const runStrength = run > runsFromShare ? Math.min(1, (run - runsFromShare) / (runFullStrengthShare - runsFromShare)) : 0
  const runShare = runStrength * Math.sqrt(Math.max(0, 1 - fromTheRim / runLength))
  const thinAtTheRim = Math.exp(-fromTheRim / thinGlazeAtTheRimPx)
  return mixed(lapisBlue, paleRunBlue, lapisShowingThroughShare + glazeCloudShare * clouds(x, y, glazeCloudsAcross) + paleRunShare * Math.max(runShare, thinAtTheRim))
}

function isBareClayAt(y: number, column: GlazeColumn): boolean {
  return y > column.bareClayBelowY
}

function paintEveryPixel(context: CanvasRenderingContext2D, columns: readonly GlazeColumn[], colourAt: (x: number, y: number, column: GlazeColumn) => Rgb): void {
  const image = context.createImageData(canvasWidth, canvasHeight)
  for (let y = 0; y < canvasHeight; y += 1) {
    for (let x = 0; x < canvasWidth; x += 1) {
      const column = columns[x]
      if (column === undefined) continue
      const [red, green, blue] = colourAt(x, y, column)
      const index = (y * canvasWidth + x) * 4
      image.data[index] = red
      image.data[index + 1] = green
      image.data[index + 2] = blue
      image.data[index + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
}

function mixed(from: Rgb, to: Rgb, share: number): Rgb {
  const boundedShare = clampedToShare(share)
  return [from[0] + (to[0] - from[0]) * boundedShare, from[1] + (to[1] - from[1]) * boundedShare, from[2] + (to[2] - from[2]) * boundedShare]
}

function clouds(x: number, y: number, across: number): number {
  let sum = 0
  let weight = 0.5
  let frequency = across
  for (let octave = 0; octave < 4; octave += 1) {
    sum += weight * latticeNoise((x / canvasWidth) * frequency, (y / canvasHeight) * frequency, cloudLatticeFor(frequency))
    weight /= 2
    frequency *= 2
  }
  return sum / 0.9375
}

function valueNoise(x: number, y: number, period: number): number {
  const cellX = Math.floor(x)
  const cellY = Math.floor(y)
  const left = wrapped(cellX, period)
  const right = wrapped(cellX + 1, period)
  const corners = [latticeValue(left, cellY), latticeValue(right, cellY), latticeValue(left, cellY + 1), latticeValue(right, cellY + 1)] as const
  return smoothlyBetween(x - cellX, y - cellY, corners)
}

function latticeNoise(x: number, y: number, lattice: NoiseLattice): number {
  const cellX = Math.floor(x)
  const cellY = Math.floor(y)
  const left = wrapped(cellX, lattice.period)
  const right = wrapped(cellX + 1, lattice.period)
  const row = lattice.valuesByRow[cellY]
  const nextRow = lattice.valuesByRow[cellY + 1]
  if (row === undefined || nextRow === undefined) return 0
  return smoothlyBetween(x - cellX, y - cellY, [row[left] ?? 0, row[right] ?? 0, nextRow[left] ?? 0, nextRow[right] ?? 0])
}

function cloudLatticeFor(frequency: number): NoiseLattice {
  const known = cloudLatticesByFrequency.get(frequency)
  if (known !== undefined) return known
  const valuesByRow = Array.from({ length: frequency + 2 }, (_, row) => Float64Array.from({ length: frequency }, (_, column) => latticeValue(column, row)))
  const lattice = { period: frequency, valuesByRow }
  cloudLatticesByFrequency.set(frequency, lattice)
  return lattice
}

function latticeValue(column: number, row: number): number {
  return pseudoRandom(column * 157 + row * 311, noisePhase)
}

function wrapped(cell: number, period: number): number {
  return ((cell % period) + period) % period
}

function smoothlyBetween(shareAcross: number, shareDown: number, [topLeft, topRight, bottomLeft, bottomRight]: readonly [number, number, number, number]): number {
  const alongX = smoothed(shareAcross)
  const alongY = smoothed(shareDown)
  const top = topLeft + (topRight - topLeft) * alongX
  const bottom = bottomLeft + (bottomRight - bottomLeft) * alongX
  return top + (bottom - top) * alongY
}

function smoothed(share: number): number {
  return share * share * (3 - 2 * share)
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
    const reach = patchSmallestReachMetres + patchReachSpreadMetres * pseudoRandom(corner + 900, noisePhase)
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
      const push = (pseudoRandom(salt + level * 131 + index, noisePhase) - 0.5) * 2 * roughness
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
