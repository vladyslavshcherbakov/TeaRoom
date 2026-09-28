import type { HandIndex } from '../../../Shared/GameLogic/GameLogic.ts'
import { distanceShareAfterPinch, distanceShareAfterWheel } from './Camera/CameraPoses.ts'
import type { CameraZoom } from './Camera/CameraZoom.ts'
import { magnificationAfterPinch, magnificationAfterWheel } from './ItemInspection.ts'
import type { FloorPoint } from '../../Engine/Points.ts'
import type { AppLog } from '../../Engine/AppLog.ts'
import type { PlayerController } from './PlayerController.ts'
import type { TapReach } from './TapTargetAmong.ts'
import type { ScreenPoint } from '../../Engine/ScreenPoint.ts'
import { screenDistanceBetween } from '../../Engine/Arithmetic.ts'
import { Fingers, isBeyondTheTapSlop, tapSlopPixels, type Finger } from '../../Engine/Fingers.ts'

export type ScreenReader = {
  readonly tapTargetAt: (point: ScreenPoint) => TapReach
  readonly aimPointAt: (point: ScreenPoint) => FloorPoint | null
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

export const holdSecondsThatInspectAnItem = 1

export class TouchInput {
  private readonly playerController: PlayerController
  private readonly zoom: CameraZoom
  private readonly screen: ScreenReader
  private readonly log: AppLog
  private readonly fingersOnTheRoom = new Fingers()
  private readonly fingersOnTheInspectedItem = new Fingers()
  private touch: Touch = noTouch

  constructor(playerController: PlayerController, zoom: CameraZoom, screen: ScreenReader, log: AppLog) {
    this.playerController = playerController
    this.zoom = zoom
    this.screen = screen
    this.log = log
  }

  fingerDown(pointerId: number, point: ScreenPoint): void {
    if (this.playerController.aimedPourView !== null) return this.aimingFingerDown(pointerId, point)
    if (this.playerController.inspectionView !== null) return this.inspectingFingerDown(pointerId, point)
    this.fingersOnTheRoom.put(pointerId, point, true)
    if (this.fingersOnTheRoom.count === 2) return this.startPinching()
    if (this.fingersOnTheRoom.count > 2) return
    const press = { kind: 'pressing', start: point, hold: null, pixelsSweptByTheCrosshair: 0 } satisfies Touch
    this.touch = press
    const reach = this.screen.tapTargetAt(point)
    const target = reach.target
    this.playerController.pressStarted(target, { point, touched: reach.touched, areasHoldingTheFinger: reach.areasHoldingTheFinger, areasSetAside: reach.areasSetAside })
    const heldHandIndex = this.playerController.handHoldingWhatIsPressed(target)
    if (heldHandIndex !== null) this.startHolding(press, pointerId, heldHandIndex)
  }

  fingerMoved(pointerId: number, point: ScreenPoint): void {
    const touch = this.touch
    if (touch.kind === 'aiming' && pointerId === touch.finger.pointerId) return this.aimingFingerMoved(touch.finger, point)
    const fingerOnTheInspectedItem = this.fingersOnTheInspectedItem.fingerOf(pointerId)
    if (fingerOnTheInspectedItem !== undefined) return this.inspectingFingerMoved(fingerOnTheInspectedItem, point)
    const fingerOnTheRoom = this.fingersOnTheRoom.fingerOf(pointerId)
    if (fingerOnTheRoom !== undefined) this.fingersOnTheRoom.move(fingerOnTheRoom, point)
    if (touch.kind === 'pinching') return this.keepPinching(touch.pinch)
    if (touch.kind !== 'pressing' || !isBeyondTheTapSlop(touch.start, point)) return
    const distanceFromTheStart = screenDistanceBetween(touch.start, point)
    this.cancelTheHold(touch, `the finger moved ${Math.round(distanceFromTheStart)} px`)
    this.playerController.pressMovedAway()
    this.playerController.pressMovedOver(this.screen.tapTargetAt(point).touched)
  }

  fingerUp(pointerId: number): void {
    const touch = this.touch
    if (touch.kind === 'aiming' && pointerId === touch.finger.pointerId) return this.aimingFingerUp(touch.finger)
    if (this.fingersOnTheInspectedItem.has(pointerId)) return this.inspectingFingerUp(pointerId)
    this.fingersOnTheRoom.lift(pointerId)
    if (touch.kind === 'pinching' && this.fingersOnTheRoom.count < 2) this.stopPinching()
    if (touch.kind === 'pressing') this.cancelTheHold(touch, `the finger lifted before ${holdSecondsThatInspectAnItem} s, so the press is a tap`)
    if (touch.kind === 'pressing' || touch.kind === 'pinching') this.touch = noTouch
    this.playerController.pressEnded()
  }

  fingerCancelled(pointerId: number): void {
    const touch = this.touch
    if (touch.kind === 'aiming' && pointerId === touch.finger.pointerId) return this.aimingFingerCancelled()
    if (this.fingersOnTheInspectedItem.has(pointerId)) return this.inspectingFingerCancelled(pointerId)
    if (this.fingersOnTheRoom.lift(pointerId) === undefined) return this.log(`finger ${pointerId} was cancelled by the browser, and no gesture followed it`)
    this.log(`finger ${pointerId} was cancelled by the browser, so it is forgotten and does not tap`)
    if (touch.kind === 'pinching' && this.fingersOnTheRoom.count < 2) this.stopPinching()
    if (touch.kind === 'pressing') this.cancelTheHold(touch, 'the browser cancelled the finger')
    if (touch.kind === 'pressing' || touch.kind === 'pinching') this.touch = noTouch
    this.playerController.pressCancelled()
  }

  crosshairSwept(pixels: number): void {
    const touch = this.touch
    if (touch.kind !== 'pressing' || pixels === 0) return
    touch.pixelsSweptByTheCrosshair += pixels
    if (touch.pixelsSweptByTheCrosshair <= tapSlopPixels) return
    this.cancelTheHold(touch, `the look turned the crosshair ${Math.round(touch.pixelsSweptByTheCrosshair)} px`)
    this.playerController.pressMovedAway()
    this.playerController.pressMovedOver(this.screen.tapTargetAt(touch.start).touched)
  }

  wheelTurned(deltaY: number): void {
    const inspection = this.playerController.inspectionView
    if (inspection !== null) return this.playerController.inspectionZoomedTo(magnificationAfterWheel(inspection.magnification, deltaY))
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
    const finger = this.fingersOnTheRoom.lift(hold.pointerId)
    if (finger === undefined) return this.log(`hold on hand ${hold.handIndex} ended with no finger of it on the screen, nothing is inspected`)
    this.playerController.handPressHeld(hold.handIndex, hold.heldSeconds)
    if (this.playerController.inspectionView === null) return
    this.fingersOnTheInspectedItem.put(hold.pointerId, finger.last, false)
  }

  private inspectingFingerDown(pointerId: number, point: ScreenPoint): void {
    const isTheOnlyFinger = this.fingersOnTheInspectedItem.count === 0
    this.fingersOnTheInspectedItem.put(pointerId, point, isTheOnlyFinger)
    if (this.fingersOnTheInspectedItem.count === 2) this.startPinchingTheInspectedItem()
  }

  private inspectingFingerMoved(finger: Finger, point: ScreenPoint): void {
    const previous = finger.last
    this.fingersOnTheInspectedItem.move(finger, point)
    if (this.touch.kind === 'pinchingTheInspectedItem') return this.keepPinchingTheInspectedItem(this.touch.pinch)
    if (this.fingersOnTheInspectedItem.count > 1) return
    this.playerController.inspectionTurnedBy({ x: point.x - previous.x, y: point.y - previous.y })
  }

  private inspectingFingerUp(pointerId: number): void {
    const finger = this.fingersOnTheInspectedItem.lift(pointerId)
    if (this.touch.kind === 'pinchingTheInspectedItem' && this.fingersOnTheInspectedItem.count < 2) this.stopPinchingTheInspectedItem()
    if (finger === undefined || !finger.mayBeATap) return
    this.playerController.inspectionTapped(this.screen.tapTargetAt(finger.start).target)
  }

  private inspectingFingerCancelled(pointerId: number): void {
    this.fingersOnTheInspectedItem.lift(pointerId)
    this.log(`finger ${pointerId} on the inspected item was cancelled by the browser, so it does not tap`)
    if (this.touch.kind === 'pinchingTheInspectedItem' && this.fingersOnTheInspectedItem.count < 2) this.stopPinchingTheInspectedItem()
  }

  private startPinchingTheInspectedItem(): void {
    this.fingersOnTheInspectedItem.forbidTaps()
    const magnificationAtStart = this.playerController.inspectionView?.magnification ?? 1
    this.touch = { kind: 'pinchingTheInspectedItem', pinch: { fingerGapAtStart: this.fingersOnTheInspectedItem.gapBetweenTheFirstTwo(), magnificationAtStart } }
  }

  private keepPinchingTheInspectedItem(pinch: InspectionPinch): void {
    this.playerController.inspectionZoomedTo(magnificationAfterPinch(pinch.magnificationAtStart, pinch.fingerGapAtStart, this.fingersOnTheInspectedItem.gapBetweenTheFirstTwo()))
  }

  private stopPinchingTheInspectedItem(): void {
    this.touch = noTouch
    this.playerController.inspectionPinchEnded()
  }

  private startPinching(): void {
    if (this.touch.kind === 'pressing') this.cancelTheHold(this.touch, 'a second finger touched the screen')
    this.touch = { kind: 'pinching', pinch: { fingerGapAtStart: this.fingersOnTheRoom.gapBetweenTheFirstTwo(), distanceShareAtStart: this.zoom.distanceShare } }
    this.playerController.pressMovedAway()
  }

  private keepPinching(pinch: Pinch): void {
    this.zoom.zoomTo(distanceShareAfterPinch(pinch.distanceShareAtStart, pinch.fingerGapAtStart, this.fingersOnTheRoom.gapBetweenTheFirstTwo()))
  }

  private stopPinching(): void {
    this.touch = noTouch
    this.log(`pinched the camera to ${this.zoom.distanceShare.toFixed(2)} of its distance in the ${this.playerController.view.kind} view`)
  }

  private aimingFingerDown(pointerId: number, point: ScreenPoint): void {
    if (this.touch.kind === 'aiming') return this.log(`finger ${pointerId} ignored: another finger already aims the pour`)
    this.touch = { kind: 'aiming', finger: { pointerId, start: point, hasMoved: false } }
    this.playerController.pourFingerDown(this.screen.aimPointAt(point))
  }

  private aimingFingerMoved(finger: AimingFinger, point: ScreenPoint): void {
    if (isBeyondTheTapSlop(finger.start, point)) finger.hasMoved = true
    this.playerController.pourFingerMoved(this.screen.aimPointAt(point))
  }

  private aimingFingerCancelled(): void {
    this.touch = noTouch
    this.log('the finger aiming the pour was cancelled by the browser, so the vessel returns to its hand')
    this.playerController.pourDone()
  }

  private aimingFingerUp(finger: AimingFinger): void {
    this.touch = noTouch
    if (finger.hasMoved) return this.playerController.pourFingerUp()
    this.playerController.aimingTapped(this.screen.tapTargetAt(finger.start).target)
  }
}
