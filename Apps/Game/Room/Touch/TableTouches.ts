import type { Command } from '../../../../Shared/Simulation/Ritual/Command.ts'
import type { RitualEvent } from '../../../../Shared/Simulation/Ritual/RitualEvent.ts'
import type { DeepReadonly } from '../../../../Shared/Simulation/State/DeepReadonly.ts'
import type { SessionState } from '../../../../Shared/Simulation/State/SessionState.ts'
import {
  caddyHome,
  clothHome,
  contains,
  figurineHomes,
  heaterPlate,
  heaterSwitch,
  kettleOnHeater,
  puddleCentre,
  puddleRadius,
  saucerOf,
  spoonHome,
  tasteZoneBottomY,
  vesselHomes,
  type Box,
  type ScenePoint,
} from '../RoomLayout.ts'
import { isInPourZone, hoverLineAbove, streamOnTargetFraction, tiltForPress } from './PourAim.ts'
import { coveredFraction, extendStroke, startStroke, strokeSpeedCmPerSecond, type WipeStroke } from './WipeStroke.ts'

export type RitualPort = {
  readonly state: DeepReadonly<SessionState>
  dispatch(command: Command): readonly RitualEvent[]
}

export type ObjectPose = ScenePoint & {
  readonly tiltDegrees: number
  readonly isHeld: boolean
}

type Touchable =
  | { readonly kind: 'vessel'; readonly vesselId: string }
  | { readonly kind: 'spoon' }
  | { readonly kind: 'cloth' }
  | { readonly kind: 'caddy' }
  | { readonly kind: 'heaterSwitch' }

type PourContact = {
  readonly targetId: string
  isPouring: boolean
  wasRefused: boolean
}

type Held =
  | {
      readonly kind: 'vessel'
      readonly vesselId: string
      readonly grabOffset: ScenePoint
      lastPoint: ScenePoint
      pour: PourContact | null
    }
  | { readonly kind: 'spoon'; readonly grabOffset: ScenePoint; lastPoint: ScenePoint; deepestDip: number | null }
  | { readonly kind: 'cloth'; readonly grabOffset: ScenePoint; stroke: WipeStroke | null }

type Touch = {
  readonly startPoint: ScenePoint
  readonly touched: Touchable
  held: Held | null
}

const dragThresholdPx = 8
const kettleDropMarginPx = 40
const caddyMouthHeightPx = 40
const kettleMouthMarginPx = 30
const shallowestScoopDepth = 0.05

export class TableTouches {
  private readonly ritual: RitualPort
  private readonly poses = new Map<string, ObjectPose>()
  private touch: Touch | null = null

  constructor(ritual: RitualPort) {
    this.ritual = ritual
  }

  poseOf(objectId: string): ObjectPose {
    return this.poses.get(objectId) ?? this.restingPoseOf(objectId)
  }

  touchStarted(point: ScenePoint): void {
    const touched = this.touchableAt(point)
    this.touch = touched === null ? null : { startPoint: point, touched, held: null }
  }

  touchMoved(point: ScenePoint, atMs: number): void {
    const touch = this.touch
    if (touch === null) return
    if (touch.held === null && distance(point, touch.startPoint) >= dragThresholdPx) touch.held = this.pickUp(touch.touched, touch.startPoint)
    if (touch.held !== null) this.moveHeld(touch.held, point, atMs)
  }

  touchEnded(point: ScenePoint, atMs: number): void {
    const touch = this.touch
    this.touch = null
    if (touch === null) return
    if (touch.held === null) return this.tap(touch.touched)
    this.moveHeld(touch.held, point, atMs)
    this.release(touch.held, point, atMs)
  }

  private touchableAt(point: ScenePoint): Touchable | null {
    if (contains(this.boxAtPose('spoon', spoonHome), point)) return { kind: 'spoon' }
    if (contains(this.boxAtPose('cloth', clothHome), point)) return { kind: 'cloth' }
    for (const vesselId of Object.keys(vesselHomes)) {
      if (contains(this.vesselBox(vesselId), point)) return { kind: 'vessel', vesselId }
    }
    if (contains(caddyHome, point)) return { kind: 'caddy' }
    if (contains(heaterSwitch, point)) return { kind: 'heaterSwitch' }
    return null
  }

  private tap(touched: Touchable): void {
    switch (touched.kind) {
      case 'vessel':
        return this.toggleLid(touched.vesselId)
      case 'caddy':
        this.ritual.dispatch({ type: this.ritual.state.caddy.isOpen ? 'closeCaddy' : 'openCaddy' })
        return
      case 'heaterSwitch':
        this.ritual.dispatch({ type: this.ritual.state.heater.isOn ? 'switchHeaterOff' : 'switchHeaterOn' })
        return
      case 'spoon':
      case 'cloth':
        return
    }
  }

  private toggleLid(vesselId: string): void {
    const vessel = this.ritual.state.vessels[vesselId]
    if (vessel === undefined) return
    this.ritual.dispatch({ type: vessel.isLidOpen ? 'closeVesselLid' : 'openVesselLid', vesselId })
  }

  private pickUp(touched: Touchable, fingerPoint: ScenePoint): Held | null {
    switch (touched.kind) {
      case 'vessel': {
        const pose = this.poseOf(touched.vesselId)
        if (this.ritual.state.heater.vesselIdOnTop === touched.vesselId) this.ritual.dispatch({ type: 'takeOffHeater' })
        return { kind: 'vessel', vesselId: touched.vesselId, grabOffset: offsetFrom(pose, fingerPoint), lastPoint: pose, pour: null }
      }
      case 'spoon': {
        const pose = this.poseOf('spoon')
        return { kind: 'spoon', grabOffset: offsetFrom(pose, fingerPoint), lastPoint: pose, deepestDip: null }
      }
      case 'cloth':
        return { kind: 'cloth', grabOffset: offsetFrom(this.poseOf('cloth'), fingerPoint), stroke: null }
      case 'caddy':
      case 'heaterSwitch':
        return null
    }
  }

  private moveHeld(held: Held, fingerPoint: ScenePoint, atMs: number): void {
    switch (held.kind) {
      case 'vessel':
        return this.moveVessel(held, fingerPoint)
      case 'spoon':
        return this.moveSpoon(held, fingerPoint)
      case 'cloth':
        return this.moveCloth(held, fingerPoint, atMs)
    }
  }

  private moveVessel(held: Extract<Held, { kind: 'vessel' }>, fingerPoint: ScenePoint): void {
    const point = shifted(fingerPoint, held.grabOffset)
    const targetId = this.pourTargetReachedFromAbove(held, point)
    held.lastPoint = point
    if (held.pour !== null && held.pour.targetId !== targetId) this.endPourContact(held)
    if (targetId === null) {
      this.poses.set(held.vesselId, { ...point, tiltDegrees: 0, isHeld: true })
      return
    }
    const target = this.vesselBox(targetId)
    const tiltDegrees = tiltForPress(point.y, target)
    this.poses.set(held.vesselId, { x: point.x, y: Math.min(point.y, hoverLineAbove(target)), tiltDegrees, isHeld: true })
    held.pour ??= { targetId, isPouring: false, wasRefused: false }
    this.pour(held.vesselId, held.pour, tiltDegrees, streamOnTargetFraction(point.x, target))
  }

  private pour(sourceId: string, contact: PourContact, tiltDegrees: number, onTargetFraction: number): void {
    if (!contact.isPouring && !contact.wasRefused && tiltDegrees > 0) {
      const events = this.ritual.dispatch({ type: 'startPouring', sourceId, targetId: contact.targetId })
      contact.wasRefused = events.some((event) => event.type === 'actionRefused')
      contact.isPouring = !contact.wasRefused
    }
    if (contact.isPouring) this.ritual.dispatch({ type: 'adjustPour', tiltDegrees, streamOnTargetFraction: onTargetFraction })
  }

  private endPourContact(held: Extract<Held, { kind: 'vessel' }>): void {
    if (held.pour?.isPouring === true) this.ritual.dispatch({ type: 'stopPouring' })
    held.pour = null
  }

  private pourTargetReachedFromAbove(held: Extract<Held, { kind: 'vessel' }>, point: ScenePoint): string | null {
    const targetIds = Object.keys(vesselHomes).filter((vesselId) => vesselId !== held.vesselId)
    const targetId = targetIds.find((vesselId) => isInPourZone(this.vesselBox(vesselId), point)) ?? null
    if (targetId === null || held.pour?.targetId === targetId) return targetId
    return held.lastPoint.y <= hoverLineAbove(this.vesselBox(targetId)) ? targetId : null
  }

  private moveSpoon(held: Extract<Held, { kind: 'spoon' }>, fingerPoint: ScenePoint): void {
    const point = shifted(fingerPoint, held.grabOffset)
    const cameFromAbove = held.deepestDip !== null || held.lastPoint.y < caddyHome.y - caddyHome.height / 2
    held.lastPoint = point
    this.poses.set('spoon', { ...point, tiltDegrees: 0, isHeld: true })
    const mouthTopY = caddyHome.y - caddyHome.height / 2
    const isInCaddyMouth = Math.abs(point.x - caddyHome.x) <= caddyHome.width / 2 && point.y >= mouthTopY && point.y <= mouthTopY + caddyMouthHeightPx
    if (isInCaddyMouth && cameFromAbove) {
      held.deepestDip = Math.max(held.deepestDip ?? 0, (point.y - mouthTopY) / caddyMouthHeightPx)
      return
    }
    this.scoopIfDipped(held)
  }

  private scoopIfDipped(held: Extract<Held, { kind: 'spoon' }>): void {
    if (held.deepestDip !== null && held.deepestDip >= shallowestScoopDepth) {
      this.ritual.dispatch({ type: 'scoopTea', depth: held.deepestDip })
    }
    held.deepestDip = null
  }

  private moveCloth(held: Extract<Held, { kind: 'cloth' }>, fingerPoint: ScenePoint, atMs: number): void {
    const point = shifted(fingerPoint, held.grabOffset)
    this.poses.set('cloth', { ...point, tiltDegrees: 0, isHeld: true })
    const isOverPuddle = distance(point, puddleCentre) <= puddleRadius
    if (isOverPuddle) {
      held.stroke = held.stroke === null ? startStroke(point, atMs) : extendStroke(held.stroke, point)
      return
    }
    this.wipeIfStroked(held, atMs)
  }

  private wipeIfStroked(held: Extract<Held, { kind: 'cloth' }>, atMs: number): void {
    if (held.stroke !== null && held.stroke.lengthPx > 0) {
      this.ritual.dispatch({
        type: 'wipeTable',
        strokeSpeedCmPerSecond: strokeSpeedCmPerSecond(held.stroke, atMs),
        coveredFraction: coveredFraction(held.stroke, puddleRadius),
      })
    }
    held.stroke = null
  }

  private release(held: Held, fingerPoint: ScenePoint, atMs: number): void {
    switch (held.kind) {
      case 'vessel':
        this.releaseVessel(held, shifted(fingerPoint, held.grabOffset))
        break
      case 'spoon':
        this.releaseSpoon(held, shifted(fingerPoint, held.grabOffset))
        break
      case 'cloth':
        this.wipeIfStroked(held, atMs)
        break
    }
    this.poses.delete(held.kind === 'vessel' ? held.vesselId : held.kind)
  }

  private releaseVessel(held: Extract<Held, { kind: 'vessel' }>, point: ScenePoint): void {
    this.endPourContact(held)
    if (held.vesselId === 'kettle' && contains(heaterPlate, point, kettleDropMarginPx)) {
      this.ritual.dispatch({ type: 'placeOnHeater', vesselId: held.vesselId })
      return
    }
    if (point.y < tasteZoneBottomY) {
      this.ritual.dispatch({ type: 'tasteCup', cupId: held.vesselId })
      return
    }
    const figurineId = Object.keys(figurineHomes).find((id) => {
      const figurine = figurineHomes[id]
      return figurine !== undefined && contains(saucerOf(figurine), point, 12)
    })
    if (figurineId !== undefined) this.ritual.dispatch({ type: 'offerCup', cupId: held.vesselId, figurineId })
  }

  private releaseSpoon(held: Extract<Held, { kind: 'spoon' }>, point: ScenePoint): void {
    this.scoopIfDipped(held)
    const kettle = this.vesselBox('kettle')
    const kettleMouth: Box = { x: kettle.x, y: kettle.y - kettle.height / 2, width: kettle.width, height: kettleMouthMarginPx * 2 }
    if (contains(kettleMouth, point) && this.ritual.state.spoon.grams > 0) {
      this.ritual.dispatch({ type: 'tipSpoonInto', vesselId: 'kettle' })
    }
  }

  private restingPoseOf(objectId: string): ObjectPose {
    const home = this.restingPointOf(objectId)
    return { x: home.x, y: home.y, tiltDegrees: 0, isHeld: false }
  }

  private restingPointOf(objectId: string): ScenePoint {
    if (objectId === 'kettle' && this.ritual.state.heater.vesselIdOnTop === 'kettle') return kettleOnHeater
    if (objectId === 'spoon') return spoonHome
    if (objectId === 'cloth') return clothHome
    const home = vesselHomes[objectId]
    if (home === undefined) throw new Error(`the room layout has no place for "${objectId}"`)
    return home
  }

  private vesselBox(vesselId: string): Box {
    const home = vesselHomes[vesselId]
    if (home === undefined) throw new Error(`the room layout has no place for vessel "${vesselId}"`)
    return this.boxAtPose(vesselId, home)
  }

  private boxAtPose(objectId: string, size: Box): Box {
    const pose = this.poseOf(objectId)
    return { x: pose.x, y: pose.y, width: size.width, height: size.height }
  }
}

function distance(from: ScenePoint, to: ScenePoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y)
}

function offsetFrom(pose: ScenePoint, fingerPoint: ScenePoint): ScenePoint {
  return { x: pose.x - fingerPoint.x, y: pose.y - fingerPoint.y }
}

function shifted(point: ScenePoint, offset: ScenePoint): ScenePoint {
  return { x: point.x + offset.x, y: point.y + offset.y }
}
