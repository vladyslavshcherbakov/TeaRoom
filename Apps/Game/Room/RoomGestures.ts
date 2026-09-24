import { distanceShareAfterPinch, distanceShareAfterWheel } from './Camera/CameraPoses.ts'
import type { CameraZoom } from './Camera/CameraZoom.ts'
import type { FloorPoint } from './RoomLayout.ts'
import type { RoomLog } from './RoomNavigator.ts'
import type { RoomPlay, RoomTapTarget } from './RoomPlay.ts'

export type ScreenPoint = {
  readonly x: number
  readonly y: number
}

export type ScreenReader = {
  readonly tapTargetAt: (point: ScreenPoint) => RoomTapTarget
  readonly aimPointAt: (point: ScreenPoint) => FloorPoint
}

type Pinch = {
  readonly fingerGapAtStart: number
  readonly distanceShareAtStart: number
}

type AimingFinger = {
  readonly pointerId: number
  readonly start: ScreenPoint
  hasMoved: boolean
}

const tapSlopPixels = 12

export class RoomGestures {
  private readonly play: RoomPlay
  private readonly zoom: CameraZoom
  private readonly screen: ScreenReader
  private readonly log: RoomLog
  private readonly fingersOnTheRoom = new Map<number, ScreenPoint>()
  private pressStart: ScreenPoint | null = null
  private pinch: Pinch | null = null
  private aimingFinger: AimingFinger | null = null

  constructor(play: RoomPlay, zoom: CameraZoom, screen: ScreenReader, log: RoomLog) {
    this.play = play
    this.zoom = zoom
    this.screen = screen
    this.log = log
  }

  fingerDown(pointerId: number, point: ScreenPoint): void {
    if (this.play.aimedPourView !== null) return this.aimingFingerDown(pointerId, point)
    this.fingersOnTheRoom.set(pointerId, point)
    if (this.fingersOnTheRoom.size === 2) return this.startPinching()
    if (this.fingersOnTheRoom.size > 2) return
    this.pressStart = point
    this.play.pressStarted(this.screen.tapTargetAt(point))
  }

  fingerMoved(pointerId: number, point: ScreenPoint): void {
    if (pointerId === this.aimingFinger?.pointerId) return this.aimingFingerMoved(this.aimingFinger, point)
    if (this.fingersOnTheRoom.has(pointerId)) this.fingersOnTheRoom.set(pointerId, point)
    if (this.pinch !== null) return this.keepPinching(this.pinch)
    const start = this.pressStart
    if (start === null || distanceBetween(start, point) <= tapSlopPixels) return
    this.play.pressMovedAway()
    this.play.pressMovedOver(this.screen.tapTargetAt(point))
  }

  fingerUp(pointerId: number): void {
    if (pointerId === this.aimingFinger?.pointerId) return this.aimingFingerUp(this.aimingFinger)
    this.fingersOnTheRoom.delete(pointerId)
    if (this.pinch !== null && this.fingersOnTheRoom.size < 2) this.stopPinching()
    this.pressStart = null
    this.play.pressEnded()
  }

  wheelTurned(deltaY: number): void {
    this.zoom.zoomTo(distanceShareAfterWheel(this.zoom.distanceShare, deltaY))
  }

  private startPinching(): void {
    this.pinch = { fingerGapAtStart: this.fingerGap(), distanceShareAtStart: this.zoom.distanceShare }
    this.play.pressMovedAway()
  }

  private keepPinching(pinch: Pinch): void {
    this.zoom.zoomTo(distanceShareAfterPinch(pinch.distanceShareAtStart, pinch.fingerGapAtStart, this.fingerGap()))
  }

  private stopPinching(): void {
    this.pinch = null
    this.log(`pinched the camera to ${this.zoom.distanceShare.toFixed(2)} of its distance in the ${this.play.view.kind} view`)
  }

  private fingerGap(): number {
    const [first, second] = [...this.fingersOnTheRoom.values()]
    return first === undefined || second === undefined ? 1 : distanceBetween(first, second)
  }

  private aimingFingerDown(pointerId: number, point: ScreenPoint): void {
    if (this.aimingFinger !== null) return this.log(`finger ${pointerId} ignored: another finger already aims the pour`)
    this.aimingFinger = { pointerId, start: point, hasMoved: false }
    this.play.pourFingerDown(this.screen.aimPointAt(point))
  }

  private aimingFingerMoved(finger: AimingFinger, point: ScreenPoint): void {
    if (distanceBetween(finger.start, point) > tapSlopPixels) finger.hasMoved = true
    this.play.pourFingerMoved(this.screen.aimPointAt(point))
  }

  private aimingFingerUp(finger: AimingFinger): void {
    this.aimingFinger = null
    if (finger.hasMoved) return this.play.pourFingerUp()
    this.play.aimingTapped(this.screen.tapTargetAt(finger.start))
  }
}

function distanceBetween(first: ScreenPoint, second: ScreenPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y)
}
