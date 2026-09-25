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

const tapSlopPixels = 12
const holdSecondsThatInspectAnItem = 1

export class RoomGestures {
  private readonly play: RoomPlay
  private readonly zoom: CameraZoom
  private readonly screen: ScreenReader
  private readonly log: RoomLog
  private readonly fingersOnTheRoom = new Map<number, ScreenPoint>()
  private readonly fingersOnTheInspectedItem = new Map<number, FingerOnTheInspectedItem>()
  private pressStart: ScreenPoint | null = null
  private pinch: Pinch | null = null
  private aimingFinger: AimingFinger | null = null
  private hold: Hold | null = null
  private inspectionPinch: InspectionPinch | null = null

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
    this.pressStart = point
    const target = this.screen.tapTargetAt(point)
    this.play.pressStarted(target)
    if (target.kind === 'hand') this.startHolding(pointerId, target.handIndex)
  }

  fingerMoved(pointerId: number, point: ScreenPoint): void {
    if (pointerId === this.aimingFinger?.pointerId) return this.aimingFingerMoved(this.aimingFinger, point)
    const fingerOnTheInspectedItem = this.fingersOnTheInspectedItem.get(pointerId)
    if (fingerOnTheInspectedItem !== undefined) return this.inspectingFingerMoved(fingerOnTheInspectedItem, point)
    if (this.fingersOnTheRoom.has(pointerId)) this.fingersOnTheRoom.set(pointerId, point)
    if (this.pinch !== null) return this.keepPinching(this.pinch)
    const start = this.pressStart
    if (start === null) return
    const distanceFromTheStart = distanceBetween(start, point)
    if (distanceFromTheStart <= tapSlopPixels) return
    this.cancelTheHold(`the finger moved ${Math.round(distanceFromTheStart)} px`)
    this.play.pressMovedAway()
    this.play.pressMovedOver(this.screen.tapTargetAt(point))
  }

  fingerUp(pointerId: number): void {
    if (pointerId === this.aimingFinger?.pointerId) return this.aimingFingerUp(this.aimingFinger)
    if (this.fingersOnTheInspectedItem.has(pointerId)) return this.inspectingFingerUp(pointerId)
    this.fingersOnTheRoom.delete(pointerId)
    if (this.pinch !== null && this.fingersOnTheRoom.size < 2) this.stopPinching()
    this.cancelTheHold(`the finger lifted before ${holdSecondsThatInspectAnItem} s, so the press is a tap`)
    this.pressStart = null
    this.play.pressEnded()
  }

  wheelTurned(deltaY: number): void {
    const inspection = this.play.inspectionView
    if (inspection !== null) return this.play.inspectionZoomedTo(magnificationAfterWheel(inspection.magnification, deltaY))
    this.zoom.zoomTo(distanceShareAfterWheel(this.zoom.distanceShare, deltaY))
  }

  advance(seconds: number): void {
    const hold = this.hold
    if (hold === null) return
    hold.heldSeconds += seconds
    if (hold.heldSeconds < holdSecondsThatInspectAnItem) return
    this.hold = null
    this.inspectFromTheHold(hold)
  }

  private startHolding(pointerId: number, handIndex: HandIndex): void {
    this.hold = { pointerId, handIndex, heldSeconds: 0 }
    this.log(`hold on hand ${handIndex} started: ${holdSecondsThatInspectAnItem} s held still inspects its item`)
  }

  private cancelTheHold(reason: string): void {
    const hold = this.hold
    if (hold === null) return
    this.hold = null
    this.log(`hold on hand ${hold.handIndex} cancelled after ${hold.heldSeconds.toFixed(1)} s: ${reason}`)
  }

  private inspectFromTheHold(hold: Hold): void {
    const fingerPoint = this.fingersOnTheRoom.get(hold.pointerId)
    if (fingerPoint === undefined) return this.log(`hold on hand ${hold.handIndex} ended with no finger of it on the screen, nothing is inspected`)
    this.fingersOnTheRoom.delete(hold.pointerId)
    this.pressStart = null
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
    if (this.inspectionPinch !== null) return this.keepPinchingTheInspectedItem(this.inspectionPinch)
    if (this.fingersOnTheInspectedItem.size > 1) return
    this.play.inspectionTurnedBy({ x: point.x - previous.x, y: point.y - previous.y })
  }

  private inspectingFingerUp(pointerId: number): void {
    const finger = this.fingersOnTheInspectedItem.get(pointerId)
    this.fingersOnTheInspectedItem.delete(pointerId)
    if (this.inspectionPinch !== null && this.fingersOnTheInspectedItem.size < 2) this.stopPinchingTheInspectedItem()
    if (finger === undefined || !finger.mayBeATap) return
    this.play.inspectionTapped(this.screen.tapTargetAt(finger.start))
  }

  private startPinchingTheInspectedItem(): void {
    for (const finger of this.fingersOnTheInspectedItem.values()) finger.mayBeATap = false
    const magnificationAtStart = this.play.inspectionView?.magnification ?? 1
    this.inspectionPinch = { fingerGapAtStart: this.gapBetweenFingersOnTheInspectedItem(), magnificationAtStart }
  }

  private keepPinchingTheInspectedItem(pinch: InspectionPinch): void {
    this.play.inspectionZoomedTo(magnificationAfterPinch(pinch.magnificationAtStart, pinch.fingerGapAtStart, this.gapBetweenFingersOnTheInspectedItem()))
  }

  private stopPinchingTheInspectedItem(): void {
    this.inspectionPinch = null
    this.play.inspectionPinchEnded()
  }

  private gapBetweenFingersOnTheInspectedItem(): number {
    return gapBetweenTheFirstTwoOf([...this.fingersOnTheInspectedItem.values()].map((finger) => finger.last))
  }

  private startPinching(): void {
    this.cancelTheHold('a second finger touched the screen')
    this.pinch = { fingerGapAtStart: gapBetweenTheFirstTwoOf([...this.fingersOnTheRoom.values()]), distanceShareAtStart: this.zoom.distanceShare }
    this.play.pressMovedAway()
  }

  private keepPinching(pinch: Pinch): void {
    this.zoom.zoomTo(distanceShareAfterPinch(pinch.distanceShareAtStart, pinch.fingerGapAtStart, gapBetweenTheFirstTwoOf([...this.fingersOnTheRoom.values()])))
  }

  private stopPinching(): void {
    this.pinch = null
    this.log(`pinched the camera to ${this.zoom.distanceShare.toFixed(2)} of its distance in the ${this.play.view.kind} view`)
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

function gapBetweenTheFirstTwoOf(points: readonly ScreenPoint[]): number {
  const [first, second] = points
  return first === undefined || second === undefined ? 1 : distanceBetween(first, second)
}
