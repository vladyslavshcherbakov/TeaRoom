import type { HandIndex } from '../../../Shared/Simulation/State/SessionState.ts'
import { distanceShareAfterPinch, distanceShareAfterWheel } from './Camera/CameraPoses.ts'
import type { CameraZoom } from './Camera/CameraZoom.ts'
import { magnificationAfterPinch, magnificationAfterWheel } from './ItemInspection.ts'
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

type Hold = {
  readonly pointerId: number
  readonly handIndex: HandIndex
  heldSeconds: number
}

type FingerOnTheInspectedItem = {
  readonly start: ScreenPoint
  last: ScreenPoint
  mayBeATap: boolean
}

type InspectionPinch = {
  readonly fingerGapAtStart: number
  readonly magnificationAtStart: number
}

type Touch =
  | { readonly kind: 'none' }
  | { readonly kind: 'pressing'; readonly start: ScreenPoint; hold: Hold | null; pixelsSweptByTheCrosshair: number }
  | { readonly kind: 'pinching'; readonly pinch: Pinch }
  | { readonly kind: 'aiming'; readonly finger: AimingFinger }
  | { readonly kind: 'pinchingTheInspectedItem'; readonly pinch: InspectionPinch }

const noTouch: Touch = { kind: 'none' }

const tapSlopPixels = 12
export const holdSecondsThatInspectAnItem = 1

export class RoomGestures {
  private readonly play: RoomPlay
  private readonly zoom: CameraZoom
  private readonly screen: ScreenReader
  private readonly log: RoomLog
  private readonly fingersOnTheRoom = new Map<number, ScreenPoint>()
  private readonly fingersOnTheInspectedItem = new Map<number, FingerOnTheInspectedItem>()
  private touch: Touch = noTouch

  constructor(play: RoomPlay, zoom: CameraZoom, screen: ScreenReader, log: RoomLog) {
    this.play = play
    this.zoom = zoom
    this.screen = screen
    this.log = log
  }

  fingerDown(pointerId: number, point: ScreenPoint): void {
    if (this.play.aimedPourView !== null) return this.aimingFingerDown(pointerId, point)
    if (this.play.inspectionView !== null) return this.inspectingFingerDown(pointerId, point)
    this.fingersOnTheRoom.set(pointerId, point)
    if (this.fingersOnTheRoom.size === 2) return this.startPinching()
    if (this.fingersOnTheRoom.size > 2) return
    const press = { kind: 'pressing', start: point, hold: null, pixelsSweptByTheCrosshair: 0 } satisfies Touch
    this.touch = press
    const target = this.screen.tapTargetAt(point)
    this.play.pressStarted(target)
    const heldHandIndex = this.play.handHoldingWhatIsPressed(target)
    if (heldHandIndex !== null) this.startHolding(press, pointerId, heldHandIndex)
  }

  fingerMoved(pointerId: number, point: ScreenPoint): void {
    const touch = this.touch
    if (touch.kind === 'aiming' && pointerId === touch.finger.pointerId) return this.aimingFingerMoved(touch.finger, point)
    const fingerOnTheInspectedItem = this.fingersOnTheInspectedItem.get(pointerId)
    if (fingerOnTheInspectedItem !== undefined) return this.inspectingFingerMoved(fingerOnTheInspectedItem, point)
    if (this.fingersOnTheRoom.has(pointerId)) this.fingersOnTheRoom.set(pointerId, point)
    if (touch.kind === 'pinching') return this.keepPinching(touch.pinch)
    if (touch.kind !== 'pressing') return
    const distanceFromTheStart = distanceBetween(touch.start, point)
    if (distanceFromTheStart <= tapSlopPixels) return
    this.cancelTheHold(touch, `the finger moved ${Math.round(distanceFromTheStart)} px`)
    this.play.pressMovedAway()
    this.play.pressMovedOver(this.screen.tapTargetAt(point))
  }

  fingerUp(pointerId: number): void {
    const touch = this.touch
    if (touch.kind === 'aiming' && pointerId === touch.finger.pointerId) return this.aimingFingerUp(touch.finger)
    if (this.fingersOnTheInspectedItem.has(pointerId)) return this.inspectingFingerUp(pointerId)
    this.fingersOnTheRoom.delete(pointerId)
    if (touch.kind === 'pinching' && this.fingersOnTheRoom.size < 2) this.stopPinching()
    if (touch.kind === 'pressing') this.cancelTheHold(touch, `the finger lifted before ${holdSecondsThatInspectAnItem} s, so the press is a tap`)
    if (touch.kind === 'pressing' || touch.kind === 'pinching') this.touch = noTouch
    this.play.pressEnded()
  }

  crosshairSwept(pixels: number): void {
    const touch = this.touch
    if (touch.kind !== 'pressing' || pixels === 0) return
    touch.pixelsSweptByTheCrosshair += pixels
    if (touch.pixelsSweptByTheCrosshair <= tapSlopPixels) return
    this.cancelTheHold(touch, `the look turned the crosshair ${Math.round(touch.pixelsSweptByTheCrosshair)} px`)
    this.play.pressMovedAway()
    this.play.pressMovedOver(this.screen.tapTargetAt(touch.start))
  }

  wheelTurned(deltaY: number): void {
    const inspection = this.play.inspectionView
    if (inspection !== null) return this.play.inspectionZoomedTo(magnificationAfterWheel(inspection.magnification, deltaY))
    this.zoom.zoomTo(distanceShareAfterWheel(this.zoom.distanceShare, deltaY))
  }

  advance(seconds: number): void {
    const touch = this.touch
    const hold = touch.kind === 'pressing' ? touch.hold : null
    if (hold === null) return
    hold.heldSeconds += seconds
    if (hold.heldSeconds < holdSecondsThatInspectAnItem) return
    this.inspectFromTheHold(hold)
  }

  private startHolding(press: Extract<Touch, { kind: 'pressing' }>, pointerId: number, handIndex: HandIndex): void {
    press.hold = { pointerId, handIndex, heldSeconds: 0 }
    this.log(`hold on hand ${handIndex} started: ${holdSecondsThatInspectAnItem} s held still inspects its item`)
  }

  private cancelTheHold(press: Extract<Touch, { kind: 'pressing' }>, reason: string): void {
    const hold = press.hold
    if (hold === null) return
    press.hold = null
    this.log(`hold on hand ${hold.handIndex} cancelled after ${hold.heldSeconds.toFixed(1)} s: ${reason}`)
  }

  private inspectFromTheHold(hold: Hold): void {
    this.touch = noTouch
    const fingerPoint = this.fingersOnTheRoom.get(hold.pointerId)
    if (fingerPoint === undefined) return this.log(`hold on hand ${hold.handIndex} ended with no finger of it on the screen, nothing is inspected`)
    this.fingersOnTheRoom.delete(hold.pointerId)
    this.play.handPressHeld(hold.handIndex, hold.heldSeconds)
    if (this.play.inspectionView === null) return
    this.fingersOnTheInspectedItem.set(hold.pointerId, { start: fingerPoint, last: fingerPoint, mayBeATap: false })
  }

  private inspectingFingerDown(pointerId: number, point: ScreenPoint): void {
    const isTheOnlyFinger = this.fingersOnTheInspectedItem.size === 0
    this.fingersOnTheInspectedItem.set(pointerId, { start: point, last: point, mayBeATap: isTheOnlyFinger })
    if (this.fingersOnTheInspectedItem.size === 2) this.startPinchingTheInspectedItem()
  }

  private inspectingFingerMoved(finger: FingerOnTheInspectedItem, point: ScreenPoint): void {
    const previous = finger.last
    finger.last = point
    if (distanceBetween(finger.start, point) > tapSlopPixels) finger.mayBeATap = false
    if (this.touch.kind === 'pinchingTheInspectedItem') return this.keepPinchingTheInspectedItem(this.touch.pinch)
    if (this.fingersOnTheInspectedItem.size > 1) return
    this.play.inspectionTurnedBy({ x: point.x - previous.x, y: point.y - previous.y })
  }

  private inspectingFingerUp(pointerId: number): void {
    const finger = this.fingersOnTheInspectedItem.get(pointerId)
    this.fingersOnTheInspectedItem.delete(pointerId)
    if (this.touch.kind === 'pinchingTheInspectedItem' && this.fingersOnTheInspectedItem.size < 2) this.stopPinchingTheInspectedItem()
    if (finger === undefined || !finger.mayBeATap) return
    this.play.inspectionTapped(this.screen.tapTargetAt(finger.start))
  }

  private startPinchingTheInspectedItem(): void {
    for (const finger of this.fingersOnTheInspectedItem.values()) finger.mayBeATap = false
    const magnificationAtStart = this.play.inspectionView?.magnification ?? 1
    this.touch = { kind: 'pinchingTheInspectedItem', pinch: { fingerGapAtStart: this.gapBetweenFingersOnTheInspectedItem(), magnificationAtStart } }
  }

  private keepPinchingTheInspectedItem(pinch: InspectionPinch): void {
    this.play.inspectionZoomedTo(magnificationAfterPinch(pinch.magnificationAtStart, pinch.fingerGapAtStart, this.gapBetweenFingersOnTheInspectedItem()))
  }

  private stopPinchingTheInspectedItem(): void {
    this.touch = noTouch
    this.play.inspectionPinchEnded()
  }

  private gapBetweenFingersOnTheInspectedItem(): number {
    return gapBetweenTheFirstTwoOf([...this.fingersOnTheInspectedItem.values()].map((finger) => finger.last))
  }

  private startPinching(): void {
    if (this.touch.kind === 'pressing') this.cancelTheHold(this.touch, 'a second finger touched the screen')
    this.touch = { kind: 'pinching', pinch: { fingerGapAtStart: gapBetweenTheFirstTwoOf([...this.fingersOnTheRoom.values()]), distanceShareAtStart: this.zoom.distanceShare } }
    this.play.pressMovedAway()
  }

  private keepPinching(pinch: Pinch): void {
    this.zoom.zoomTo(distanceShareAfterPinch(pinch.distanceShareAtStart, pinch.fingerGapAtStart, gapBetweenTheFirstTwoOf([...this.fingersOnTheRoom.values()])))
  }

  private stopPinching(): void {
    this.touch = noTouch
    this.log(`pinched the camera to ${this.zoom.distanceShare.toFixed(2)} of its distance in the ${this.play.view.kind} view`)
  }

  private aimingFingerDown(pointerId: number, point: ScreenPoint): void {
    if (this.touch.kind === 'aiming') return this.log(`finger ${pointerId} ignored: another finger already aims the pour`)
    this.touch = { kind: 'aiming', finger: { pointerId, start: point, hasMoved: false } }
    this.play.pourFingerDown(this.screen.aimPointAt(point))
  }

  private aimingFingerMoved(finger: AimingFinger, point: ScreenPoint): void {
    if (distanceBetween(finger.start, point) > tapSlopPixels) finger.hasMoved = true
    this.play.pourFingerMoved(this.screen.aimPointAt(point))
  }

  private aimingFingerUp(finger: AimingFinger): void {
    this.touch = noTouch
    if (finger.hasMoved) return this.play.pourFingerUp()
    this.play.aimingTapped(this.screen.tapTargetAt(finger.start))
  }
}

function distanceBetween(first: ScreenPoint, second: ScreenPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

function gapBetweenTheFirstTwoOf(points: readonly ScreenPoint[]): number {
  const [first, second] = points
  return first === undefined || second === undefined ? 1 : distanceBetween(first, second)
}
