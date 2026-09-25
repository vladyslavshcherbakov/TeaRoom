import { furnitureWithId, sideStoodAt, walkerStart, type CloseUp, type FloorPoint, type FurnitureId, type RoomLayout } from './RoomLayout.ts'
import { FloorGrid } from './Walking/FloorGrid.ts'
import { isWalking, standingAt, walkFurther, type Walk } from './Walking/Walk.ts'

export type TapTarget =
  | { readonly kind: 'floor'; readonly point: FloorPoint }
  | { readonly kind: 'furniture'; readonly furnitureId: FurnitureId }
  | { readonly kind: 'nothing' }

export type RoomView =
  | { readonly kind: 'overview' }
  | { readonly kind: 'approaching'; readonly furnitureId: FurnitureId }
  | { readonly kind: 'closeUp'; readonly furnitureId: FurnitureId }

export type RoomPlace = {
  readonly position: FloorPoint
  readonly headingRadians: number
  readonly closeUpOf: FurnitureId | null
}

export const roomEntrance: RoomPlace = { position: walkerStart, headingRadians: Math.PI, closeUpOf: null }

export type RoomLog = (message: string) => void

export type KeeperMoved = (furnitureId: FurnitureId | null) => void

export class RoomNavigator {
  private readonly layout: RoomLayout
  private readonly floor: FloorGrid
  private readonly log: RoomLog
  private readonly keeperMoved: KeeperMoved
  private currentWalk: Walk
  private currentView: RoomView
  private furnitureStoodAt: FurnitureId | null
  private isWalkingFreely = false

  constructor(layout: RoomLayout, log: RoomLog, keeperMoved: KeeperMoved = () => {}, startsAt: RoomPlace = roomEntrance) {
    this.layout = layout
    this.floor = new FloorGrid(layout.furniture.map((piece) => piece.footprint))
    this.log = log
    this.keeperMoved = keeperMoved
    const place = this.placeToStartAt(startsAt)
    this.currentWalk = standingAt(place.position, place.headingRadians)
    this.currentView = place.closeUpOf === null ? { kind: 'overview' } : { kind: 'closeUp', furnitureId: place.closeUpOf }
    this.furnitureStoodAt = place.closeUpOf
    log(`room opened, walker at ${coordinatesOf(place.position)}${place.closeUpOf === null ? '' : `, showing ${place.closeUpOf} close up`}`)
  }

  get walk(): Walk {
    return this.currentWalk
  }

  get view(): RoomView {
    return this.currentView
  }

  get place(): RoomPlace {
    const view = this.currentView
    return { position: this.currentWalk.position, headingRadians: this.currentWalk.headingRadians, closeUpOf: view.kind === 'closeUp' ? view.furnitureId : null }
  }

  get closeUpInView(): CloseUp | null {
    const view = this.currentView
    if (view.kind !== 'closeUp') return null
    return sideStoodAt(furnitureWithId(this.layout, view.furnitureId), this.currentWalk.position).closeUp
  }

  tapped(target: TapTarget): void {
    switch (target.kind) {
      case 'floor':
        return this.walkToFloor(target.point)
      case 'furniture':
        return this.approach(target.furnitureId)
      case 'nothing':
        return this.leaveCloseUp('tap on nothing')
    }
  }

  advance(seconds: number): void {
    if (!isWalking(this.currentWalk)) return
    this.currentWalk = walkFurther(this.currentWalk, seconds)
    if (isWalking(this.currentWalk) || this.currentView.kind !== 'approaching') return
    const { furnitureId } = this.currentView
    this.currentView = { kind: 'closeUp', furnitureId }
    this.furnitureStoodAt = furnitureId
    this.log(`arrived at ${furnitureId}, showing it close up`)
    this.keeperMoved(furnitureId)
  }

  walkFreely(step: FloorPoint, headingRadians: number): void {
    const from = this.currentWalk.position
    const reachable = [
      { x: from.x + step.x, z: from.z + step.z },
      { x: from.x + step.x, z: from.z },
      { x: from.x, z: from.z + step.z },
    ].find((point) => this.floor.isWalkable(point))
    if (!this.isWalkingFreely) this.startWalkingFreely()
    this.currentWalk = { position: reachable ?? from, headingRadians, waypoints: [] }
  }

  stopWalkingFreely(): void {
    if (!this.isWalkingFreely) return
    this.isWalkingFreely = false
    this.log(`stopped walking freely at ${coordinatesOf(this.currentWalk.position)}`)
  }

  private placeToStartAt(place: RoomPlace): RoomPlace {
    if (!this.floor.isWalkable(place.position)) {
      this.log(`the walker cannot stand at ${coordinatesOf(place.position)}, so they start at the entrance`)
      return roomEntrance
    }
    if (place.closeUpOf !== null && !this.layout.furniture.some((piece) => piece.id === place.closeUpOf)) {
      this.log(`the room has no ${place.closeUpOf} to show close up, so the walker starts with the whole room in view`)
      return { ...place, closeUpOf: null }
    }
    return place
  }

  private startWalkingFreely(): void {
    this.isWalkingFreely = true
    this.log(`walking freely from ${coordinatesOf(this.currentWalk.position)}`)
    if (this.currentView.kind === 'approaching') {
      this.log(`gave up walking to ${this.currentView.furnitureId}`)
      this.currentView = { kind: 'overview' }
    }
    if (this.furnitureStoodAt === null) return
    this.log(`left ${this.furnitureStoodAt}`)
    this.furnitureStoodAt = null
    this.keeperMoved(null)
  }

  private walkToFloor(point: FloorPoint): void {
    if (this.currentView.kind === 'closeUp') return this.leaveCloseUp(`tap on the floor at ${coordinatesOf(point)}`)
    if (!this.startWalkingTo(point)) return
    this.currentView = { kind: 'overview' }
    this.log(`walking to the floor at ${coordinatesOf(point)}`)
  }

  private approach(furnitureId: FurnitureId): void {
    if (this.furnitureStoodAt === furnitureId && !isWalking(this.currentWalk)) {
      this.currentView = { kind: 'closeUp', furnitureId }
      return this.log(`already at ${furnitureId}, showing it close up`)
    }
    const from = this.currentWalk.position
    const ways = furnitureWithId(this.layout, furnitureId).sides.flatMap((side) => {
      const waypoints = this.floor.pathBetween(from, side.standingPoint)
      return waypoints === null ? [] : [{ side, waypoints }]
    })
    const shortestWay = ways.reduce<(typeof ways)[number] | null>((shortest, way) => (shortest === null || lengthOf(way.waypoints) < lengthOf(shortest.waypoints) ? way : shortest), null)
    if (shortestWay === null) return this.log(`no way to any side of ${furnitureId} from ${coordinatesOf(from)}, staying put`)
    this.followTheWay(shortestWay.waypoints)
    this.currentView = { kind: 'approaching', furnitureId }
    this.log(`walking to the ${shortestWay.side.name} of ${furnitureId}, the shortest way of ${ways.length}`)
  }

  private startWalkingTo(point: FloorPoint): boolean {
    const waypoints = this.floor.pathBetween(this.currentWalk.position, point)
    if (waypoints === null) {
      this.log(`no way to ${coordinatesOf(point)} from ${coordinatesOf(this.currentWalk.position)}, staying put`)
      return false
    }
    this.followTheWay(waypoints)
    return true
  }

  private followTheWay(waypoints: readonly FloorPoint[]): void {
    this.currentWalk = { ...this.currentWalk, waypoints: waypoints.slice(1) }
    if (this.furnitureStoodAt === null) return
    this.log(`left ${this.furnitureStoodAt}`)
    this.furnitureStoodAt = null
    this.keeperMoved(null)
  }

  private leaveCloseUp(reason: string): void {
    if (this.currentView.kind !== 'closeUp') return this.log(`${reason} ignored, nothing to leave`)
    this.log(`left the close-up of ${this.currentView.furnitureId}: ${reason}`)
    this.currentView = { kind: 'overview' }
  }
}

function lengthOf(waypoints: readonly FloorPoint[]): number {
  return waypoints.slice(1).reduce((length, point, index) => {
    const previous = waypoints[index] ?? point
    return length + Math.hypot(point.x - previous.x, point.z - previous.z)
  }, 0)
}

function coordinatesOf(point: FloorPoint): string {
  return `(${point.x.toFixed(2)}, ${point.z.toFixed(2)})`
}
