import { carriedItemIdsIn, itemIdInTheSink, itemLocationIn, standingSpotOf, type DeepReadonly, type SessionState, type Spot } from '../../../Shared/GameLogic/GameLogic.ts'
import { footprintCirclesOf, isTheLidOpen, layoutOf } from './CarriedShapes.ts'
import { heaterPlate, turnedBy, turnOfItemAt, type RoomLayout, type SinkBasin } from './RoomLayout.ts'
import type { FloorPoint } from '../../Engine/Points.ts'
import type { AppLog } from '../../Engine/AppLog.ts'
import { floorDistanceBetween } from '../../Engine/Arithmetic.ts'
import { doesACircleTouch, isACircleInside } from '../../Engine/Footprints.ts'

export const sameBoardWithinMetres = 0.15
const openLidGapMetres = 0.01
const openLidDirectionsRadians = [Math.PI, 0, Math.PI / 2, -Math.PI / 2, (3 * Math.PI) / 4, Math.PI / 4, (-3 * Math.PI) / 4, -Math.PI / 4]
export const nearestSpotSearchedWithinMetres = 0.3
const nearestSpotSearchStepMetres = 0.01
const snugSpotsWithinMetresOfTheNearest = 0.03
const touchingWithinMetres = 0.01

type Circle = { readonly spot: Spot; readonly radius: number; readonly restsOnTheSurface: boolean }

export type Surroundings = {
  readonly layout: RoomLayout
  readonly heaterSpot: Spot
}

export type PlacementRefusal = 'offTheEdge' | 'theTopTakesNoItems' | 'somethingIsThere' | 'theHeaterIsThere' | 'theSinkIsThere'

export type LyingLid = {
  readonly itemId: string
  readonly offset: FloorPoint
  readonly spot: Spot
  readonly radius: number
}

export class LyingLids {
  private readonly log: AppLog
  private readonly itemIdsReportedWithNoRoomForTheLid = new Set<string>()
  private itemIdsOpenedOldestFirst: readonly string[] = []

  constructor(log: AppLog) {
    this.log = log
  }

  layOpenLids(state: DeepReadonly<SessionState>, surroundings: Surroundings): readonly LyingLid[] {
    const itemsWithALidToLay = itemsOnSurfaces(state).filter(({ itemId }) => hasALidToLay(state, itemId))
    this.rememberTheOrderOfOpening(itemsWithALidToLay.map(({ itemId }) => itemId))
    const openedOldestFirst = [...itemsWithALidToLay].sort((first, second) => this.itemIdsOpenedOldestFirst.indexOf(first.itemId) - this.itemIdsOpenedOldestFirst.indexOf(second.itemId))
    return openedOldestFirst.reduce<readonly LyingLid[]>((lidsLaidBefore, { itemId, spot }) => {
      const lid = openLidBeside(itemId, spot, lidsLaidBefore, state, surroundings)
      if (lid === null) this.reportNoRoomForTheLidOf(itemId, spot)
      return lid === null ? lidsLaidBefore : [...lidsLaidBefore, lid]
    }, [])
  }

  private reportNoRoomForTheLidOf(itemId: string, spot: Spot): void {
    if (this.itemIdsReportedWithNoRoomForTheLid.has(itemId)) return
    this.itemIdsReportedWithNoRoomForTheLid.add(itemId)
    this.log(`the open lid of ${itemId} finds no room beside it on the ${spot.placeId}, so it stands open on its hinge at the rim`)
  }

  private rememberTheOrderOfOpening(itemIdsWithALidToLay: readonly string[]): void {
    const itemIdsStillOpen = this.itemIdsOpenedOldestFirst.filter((itemId) => itemIdsWithALidToLay.includes(itemId))
    const itemIdsNewlyOpen = itemIdsWithALidToLay.filter((itemId) => !itemIdsStillOpen.includes(itemId))
    this.itemIdsOpenedOldestFirst = [...itemIdsStillOpen, ...itemIdsNewlyOpen]
  }
}

export function whyThereIsNoRoomFor(itemId: string, spot: Spot, state: DeepReadonly<SessionState>, surroundings: Surroundings, lyingLids: LyingLids): PlacementRefusal | null {
  const circles = footprintOf(state, itemId, spot, surroundings.layout)
  const refusal = whyThereIsNoRoomForCircles(circles, itemId, state, surroundings)
  if (refusal !== null) return refusal
  return doesTouchALidOfAnotherItem(circles, itemId, state, surroundings, lyingLids) ? 'somethingIsThere' : null
}

export function nearestSpotWithRoomFor(itemId: string, spot: Spot, state: DeepReadonly<SessionState>, surroundings: Surroundings, lyingLids: LyingLids): Spot | null {
  const lidsOfOtherItems = lyingLids.layOpenLids(state, surroundings).filter((lid) => lid.itemId !== itemId)
  const hasRoomAt = (candidate: Spot): boolean => {
    const circles = footprintOf(state, itemId, candidate, surroundings.layout)
    return whyThereIsNoRoomForCircles(circles, itemId, state, surroundings) === null && !doesTouchALid(circles, lidsOfOtherItems)
  }
  if (hasRoomAt(spot)) return spot
  const spotsWithRoom = nearestSpotsWithRoom(spot, hasRoomAt)
  return snuggestOf(spotsWithRoom, (candidate) => contactsOf(footprintOf(state, itemId, candidate, surroundings.layout), itemId, state, surroundings, lidsOfOtherItems))
}

export function isUnderAnotherItem(itemId: string, spot: Spot, state: DeepReadonly<SessionState>, surroundings: Surroundings, lyingLids: LyingLids): boolean {
  const circles = footprintOf(state, itemId, spot, surroundings.layout)
  return doesTouchANeighbour(circles, itemId, state, surroundings.layout) || doesTouchALidOfAnotherItem(circles, itemId, state, surroundings, lyingLids)
}

function whyThereIsNoRoomForCircles(circles: readonly Circle[], movingItemId: string | null, state: DeepReadonly<SessionState>, surroundings: Surroundings): PlacementRefusal | null {
  const { layout, heaterSpot } = surroundings
  for (const { spot, radius } of circles.filter((circle) => circle.restsOnTheSurface)) {
    const piece = layout.furniture.find((candidate) => candidate.id === spot.placeId)
    if (piece === undefined) return 'offTheEdge'
    if (!piece.takesItemsOnItsTop && spot.y > piece.height - sameBoardWithinMetres) return 'theTopTakesNoItems'
    if (!isACircleInside(piece.footprint, spot, radius)) return 'offTheEdge'
    if (overlapsTheHeater(heaterSpot, spot, radius)) return 'theHeaterIsThere'
    if (spot.placeId === layout.sinkBasin.placeId && overlapsTheSink(layout.sinkBasin, spot, radius)) return 'theSinkIsThere'
  }
  return doesTouchANeighbour(circles, movingItemId, state, layout) ? 'somethingIsThere' : null
}

function doesTouchANeighbour(circles: readonly Circle[], movingItemId: string | null, state: DeepReadonly<SessionState>, layout: RoomLayout): boolean {
  const neighbourCircles = itemsOnSurfaces(state).filter((item) => item.itemId !== movingItemId).flatMap((item) => footprintOf(state, item.itemId, item.spot, layout))
  return doesTouchACircle(circles, neighbourCircles)
}

function doesTouchALidOfAnotherItem(circles: readonly Circle[], itemId: string, state: DeepReadonly<SessionState>, surroundings: Surroundings, lyingLids: LyingLids): boolean {
  return doesTouchALid(circles, lyingLids.layOpenLids(state, surroundings).filter((lid) => lid.itemId !== itemId))
}

function doesTouchALid(circles: readonly Circle[], lids: readonly LyingLid[]): boolean {
  return lids.some((lid) => circles.some((circle) => isNear(circle.spot, lid.spot, circle.radius + lid.radius)))
}

function nearestSpotsWithRoom(spot: Spot, hasRoomAt: (candidate: Spot) => boolean): Spot[] {
  const spotsWithRoom: Spot[] = []
  let nearestDistance = Number.POSITIVE_INFINITY
  for (let distance = nearestSpotSearchStepMetres; distance <= Math.min(nearestSpotSearchedWithinMetres, nearestDistance + snugSpotsWithinMetresOfTheNearest); distance += nearestSpotSearchStepMetres) {
    const ringWithRoom = spotsOnARing(spot, distance).filter(hasRoomAt)
    if (ringWithRoom.length > 0) nearestDistance = Math.min(nearestDistance, distance)
    spotsWithRoom.push(...ringWithRoom)
  }
  return spotsWithRoom
}

function snuggestOf(spots: readonly Spot[], contactsAt: (spot: Spot) => number): Spot | null {
  let snuggest: { readonly spot: Spot; readonly contacts: number } | null = null
  for (const candidate of spots) {
    const contacts = contactsAt(candidate)
    if (snuggest === null || contacts > snuggest.contacts) snuggest = { spot: candidate, contacts }
  }
  return snuggest?.spot ?? null
}

function contactsOf(circles: readonly Circle[], movingItemId: string, state: DeepReadonly<SessionState>, surroundings: Surroundings, lidsOfOtherItems: readonly LyingLid[]): number {
  const { layout, heaterSpot } = surroundings
  const reachingCircles = circles.map((circle) => ({ ...circle, radius: circle.radius + touchingWithinMetres }))
  const restingCircles = reachingCircles.filter((circle) => circle.restsOnTheSurface)
  const touchesAnEdge = restingCircles.some(({ spot, radius }) => {
    const piece = layout.furniture.find((candidate) => candidate.id === spot.placeId)
    return piece !== undefined && !isACircleInside(piece.footprint, spot, radius)
  })
  const touchesTheHeater = restingCircles.some(({ spot, radius }) => overlapsTheHeater(heaterSpot, spot, radius))
  const touchesTheSink = restingCircles.some(({ spot, radius }) => spot.placeId === layout.sinkBasin.placeId && overlapsTheSink(layout.sinkBasin, spot, radius))
  const neighboursTouched = itemsOnSurfaces(state).filter((item) => item.itemId !== movingItemId && doesTouchACircle(reachingCircles, footprintOf(state, item.itemId, item.spot, layout))).length
  const lidsTouched = lidsOfOtherItems.filter((lid) => doesTouchALid(reachingCircles, [lid])).length
  return [touchesAnEdge, touchesTheHeater, touchesTheSink].filter((touches) => touches).length + neighboursTouched + lidsTouched
}

function doesTouchACircle(circles: readonly Circle[], others: readonly Circle[]): boolean {
  return circles.some((circle) => others.some((other) => isNear(circle.spot, other.spot, circle.radius + other.radius)))
}

function spotsOnARing(spot: Spot, distance: number): Spot[] {
  const count = Math.ceil((2 * Math.PI * distance) / nearestSpotSearchStepMetres)
  return Array.from({ length: count }, (_, index) => offsetSpot(spot, { x: Math.cos((2 * Math.PI * index) / count) * distance, z: Math.sin((2 * Math.PI * index) / count) * distance }))
}

function footprintOf(state: DeepReadonly<SessionState>, itemId: string, spot: Spot, roomLayout: RoomLayout): Circle[] {
  const shapeLayout = layoutOf(state, itemId)
  if (shapeLayout === undefined) return []
  const turn = turnOfItemAt(roomLayout, spot)
  return footprintCirclesOf(shapeLayout).map((circle) => ({ spot: offsetSpot(spot, turnedBy(circle, turn)), radius: circle.radius, restsOnTheSurface: circle.restsOnTheSurface }))
}

function hasALidToLay(state: DeepReadonly<SessionState>, itemId: string): boolean {
  const hasALid = (layoutOf(state, itemId)?.lid ?? null) !== null
  return hasALid && isTheLidOpen(state, itemId) && itemIdInTheSink(state) !== itemId
}

function openLidBeside(itemId: string, spot: Spot, lidsLaidBefore: readonly LyingLid[], state: DeepReadonly<SessionState>, surroundings: Surroundings): LyingLid | null {
  const layout = layoutOf(state, itemId)
  if (layout === undefined || layout.lid === null) return null
  const radius = layout.lid.lyingRadiusMetres
  const distance = layout.footprintRadiusMetres + radius + openLidGapMetres
  const turn = turnOfItemAt(surroundings.layout, spot)
  const lidsInEveryDirection = openLidDirectionsRadians.map((direction) => {
    const offset = turnedBy({ x: Math.cos(direction) * distance, z: Math.sin(direction) * distance }, turn)
    return { itemId, offset, spot: offsetSpot(spot, offset), radius }
  })
  return lidsInEveryDirection.find((lid) => hasRoomForTheLid(lid, lidsLaidBefore, state, surroundings)) ?? null
}

function hasRoomForTheLid(lid: LyingLid, lidsLaidBefore: readonly LyingLid[], state: DeepReadonly<SessionState>, surroundings: Surroundings): boolean {
  const isClearOfTheRoom = whyThereIsNoRoomForCircles([{ spot: lid.spot, radius: lid.radius, restsOnTheSurface: true }], null, state, surroundings) === null
  return isClearOfTheRoom && !lidsLaidBefore.some((laid) => isNear(lid.spot, laid.spot, lid.radius + laid.radius))
}

function offsetSpot(spot: Spot, offset: FloorPoint): Spot {
  return { ...spot, x: spot.x + offset.x, z: spot.z + offset.z }
}

function overlapsTheHeater(heaterSpot: Spot, spot: Spot, radius: number): boolean {
  if (!isNear(spot, heaterSpot, Number.POSITIVE_INFINITY)) return false
  return doesACircleTouch({ x: heaterSpot.x, z: heaterSpot.z, width: heaterPlate.width, depth: heaterPlate.depth }, spot, radius)
}

function overlapsTheSink(sinkBasin: SinkBasin, spot: Spot, radius: number): boolean {
  return Math.abs(spot.x - sinkBasin.x) < sinkBasin.width / 2 + radius && Math.abs(spot.z - sinkBasin.z) < sinkBasin.depth / 2 + radius
}

function itemsOnSurfaces(state: DeepReadonly<SessionState>): { itemId: string; spot: Spot }[] {
  return carriedItemIdsIn(state).flatMap((itemId) => {
    const spot = standingSpotOf(itemLocationIn(state, itemId))
    return spot === null ? [] : [{ itemId, spot }]
  })
}

function isNear(spot: Spot, other: Spot, distance: number): boolean {
  if (spot.placeId !== other.placeId || Math.abs(spot.y - other.y) > sameBoardWithinMetres) return false
  return floorDistanceBetween(spot, other) < distance
}
