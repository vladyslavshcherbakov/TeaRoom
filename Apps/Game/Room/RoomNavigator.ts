import { furniture, furnitureWithId, walkerStart, type FloorPoint, type FurnitureId } from './RoomLayout.ts'
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

export type RoomLog = (message: string) => void

export type KeeperMoved = (furnitureId: FurnitureId | null) => void

export class RoomNavigator {
  private readonly floor = new FloorGrid(furniture.map((piece) => piece.footprint))
  private readonly log: RoomLog
  private readonly keeperMoved: KeeperMoved
  private currentWalk: Walk = standingAt(walkerStart, Math.PI)
  private currentView: RoomView = { kind: 'overview' }
  private furnitureStoodAt: FurnitureId | null = null
  private isWalkingFreely = false

  constructor(log: RoomLog, keeperMoved: KeeperMoved = () => {}) {
    this.log = log
    this.keeperMoved = keeperMoved
    log(`room opened, walker at ${coordinatesOf(walkerStart)}`)
  }

  get walk(): Walk {
    return this.currentWalk
  }

  get view(): RoomView {
    return this.currentView
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
    const { standingPoint } = furnitureWithId(furnitureId)
    if (!this.startWalkingTo(standingPoint)) return
    this.currentView = { kind: 'approaching', furnitureId }
    this.log(`walking to ${furnitureId}`)
  }

  private startWalkingTo(point: FloorPoint): boolean {
    const waypoints = this.floor.pathBetween(this.currentWalk.position, point)
    if (waypoints === null) {
      this.log(`no way to ${coordinatesOf(point)} from ${coordinatesOf(this.currentWalk.position)}, staying put`)
      return false
    }
    this.currentWalk = { ...this.currentWalk, waypoints: waypoints.slice(1) }
    if (this.furnitureStoodAt !== null) {
      this.log(`left ${this.furnitureStoodAt}`)
      this.furnitureStoodAt = null
      this.keeperMoved(null)
    }
    return true
  }

  private leaveCloseUp(reason: string): void {
    if (this.currentView.kind !== 'closeUp') return this.log(`${reason} ignored, nothing to leave`)
    this.log(`left the close-up of ${this.currentView.furnitureId}: ${reason}`)
    this.currentView = { kind: 'overview' }
  }
}

function coordinatesOf(point: FloorPoint): string {
  return `(${point.x.toFixed(2)}, ${point.z.toFixed(2)})`
}
