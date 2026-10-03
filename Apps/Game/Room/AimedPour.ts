import { clampedToShare, definitionIn, standingSpotOf, tiltWhereTheStreamSplashes, type Catalog, type DeepReadonly, type Spot, type VesselState } from '../../../Shared/GameLogic/GameLogic.ts'
import { layoutOf } from './CarriedShapes.ts'
import { sameBoardWithinMetres } from './Placement.ts'
import { roomHalfSize, type RoomLayout } from './RoomLayout.ts'
import type { FloorPoint } from '../../Engine/Points.ts'
import type { AppLog } from '../../Engine/AppLog.ts'
import type { SessionPort } from './SessionPort.ts'
import { clamped, floorDistanceBetween } from '../../Engine/Arithmetic.ts'

export type AimedPourView = {
  readonly sourceId: string
  readonly targetId: string
  readonly spout: FloorPoint
  readonly spoutDirection: FloorPoint
  readonly tiltDegrees: number
}

export type SpoutArea = {
  readonly minX: number
  readonly maxX: number
  readonly minZ: number
  readonly maxZ: number
}

export type PourTarget = {
  readonly id: string
  readonly spot: Spot
  readonly openingRadiusMetres: number
  readonly tiltWhereTheStreamSplashesDegrees: number
}

export type PourSetUp = {
  readonly session: SessionPort
  readonly catalog: Catalog
  readonly layout: RoomLayout
  readonly log: AppLog
  readonly sourceId: string | null
  readonly targetId: string
  readonly spoutDirection: FloorPoint
}

const firstSpoutOffsetFromTargetMetres = 0.22
const aimedVesselReachMetres = 0.3
const aimedVesselAwayFromTheWallsMetres = 0.05
const tiltGrowthDegreesPerSecond = 30
const tiltFallDegreesPerSecond = 70
const steepestTiltBelowTheSplashDegrees = 1
const streamRadiusMetres = 0.012
const spoutMovesThePuddleFromMetres = 0.01

type SentPour = { readonly tiltDegrees: number; readonly streamOnTargetFraction: number; readonly missedStreamLandsAt: Spot | null }

const unsentPour: SentPour = { tiltDegrees: -1, streamOnTargetFraction: -1, missedStreamLandsAt: null }

export function canAimAPour(state: SessionPort['state'], sourceId: string | null, targetId: string): boolean {
  const source = sourceId === null ? undefined : state.vessels[sourceId]
  return source !== undefined && sourceId !== targetId && standingSpotOf(state.vessels[targetId]?.location) !== null
}

export function aimAPour(setUp: PourSetUp): AimedPour | null {
  const { session, log, sourceId, targetId, spoutDirection } = setUp
  const state = session.state
  const source = sourceId === null ? undefined : state.vessels[sourceId]
  const target = state.vessels[targetId]
  const targetLayout = layoutOf(state, targetId)
  const targetSpot = standingSpotOf(target?.location)
  if (source === undefined || target === undefined || targetSpot === null || targetLayout === undefined) {
    log(`no pour to aim at ${targetId}`)
    return null
  }
  openTheLidsThePourNeeds(setUp, source, target)
  const pourTarget = { id: targetId, spot: targetSpot, openingRadiusMetres: targetLayout.openingRadiusMetres, tiltWhereTheStreamSplashesDegrees: tiltWhereTheStreamSplashesOf(setUp.catalog, source, target) }
  const top = topOf(setUp.layout, targetSpot.placeId)
  if (top === null) log(`${targetId} stands on the ${targetSpot.placeId}, which has no furniture in this room, so water that misses it is lost and leaves no puddle`, 'error')
  return new AimedPour(session, log, source.id, pourTarget, pourTargetsBeside(setUp, source, targetSpot), spoutDirection, spoutAreaInsideTheWalls(spoutDirection), top, holesInTheTopOf(setUp.layout, targetSpot.placeId))
}

export class AimedPour {
  private readonly session: SessionPort
  private readonly log: AppLog
  private readonly sourceId: string
  private readonly candidates: readonly PourTarget[]
  private target: PourTarget
  private readonly spoutDirection: FloorPoint
  private readonly spoutArea: SpoutArea
  private readonly spillArea: SpoutArea | null
  private readonly holesInTheSpillArea: readonly SpoutArea[]
  private spout: FloorPoint
  private tiltDegrees = 0
  private isTiltHeld = false
  private isPouring = false
  private isTiltingWithNothingToPour = false
  private lastFingerPoint: FloorPoint | null = null
  private lastSentPour: SentPour = unsentPour

  constructor(session: SessionPort, log: AppLog, sourceId: string, target: PourTarget, candidates: readonly PourTarget[], spoutDirection: FloorPoint, spoutArea: SpoutArea, spillArea: SpoutArea | null, holesInTheSpillArea: readonly SpoutArea[]) {
    this.session = session
    this.log = log
    this.sourceId = sourceId
    this.target = target
    this.candidates = candidates
    this.spoutDirection = spoutDirection
    this.spoutArea = spoutArea
    this.spillArea = spillArea
    this.holesInTheSpillArea = holesInTheSpillArea
    this.spout = insideTheArea({ x: target.spot.x - spoutDirection.x * firstSpoutOffsetFromTargetMetres, z: target.spot.z - spoutDirection.z * firstSpoutOffsetFromTargetMetres }, spoutArea)
    log(`aiming ${sourceId} at ${target.id}, the spout starts ${firstSpoutOffsetFromTargetMetres} m to its left on the screen, pointing (${spoutDirection.x.toFixed(2)}, ${spoutDirection.z.toFixed(2)}), ${candidates.map((candidate) => candidate.id).join(', ')} can be poured into here`)
  }

  get view(): AimedPourView {
    return { sourceId: this.sourceId, targetId: this.target.id, spout: this.spout, spoutDirection: this.spoutDirection, tiltDegrees: this.tiltDegrees }
  }

  fingerDown(point: FloorPoint | null): void {
    this.lastFingerPoint = point
    if (point === null) this.log(`the finger aiming ${this.sourceId} touched off the aim plane, so it moves the vessel once it is over the plane`)
  }

  fingerMoved(point: FloorPoint | null): void {
    const last = this.lastFingerPoint
    if (point === null) return this.forgetTheFingerOffTheAimPlane()
    this.lastFingerPoint = point
    if (last === null) return
    this.spout = insideTheArea({ x: this.spout.x + point.x - last.x, z: this.spout.z + point.z - last.z }, this.spoutArea)
    this.followTheSpout()
  }

  fingerUp(): void {
    this.lastFingerPoint = null
    this.log(`spout of ${this.sourceId} moved to (${this.spout.x.toFixed(2)}, ${this.spout.z.toFixed(2)}), ${this.onTargetFraction().toFixed(2)} of the stream over ${this.target.id}`)
  }

  tiltPressed(): void {
    this.isTiltHeld = true
  }

  tiltReleased(): void {
    this.isTiltHeld = false
  }

  advance(seconds: number): void {
    const tiltChange = this.isTiltHeld ? tiltGrowthDegreesPerSecond * seconds : -tiltFallDegreesPerSecond * seconds
    this.tiltDegrees = Math.min(this.target.tiltWhereTheStreamSplashesDegrees - steepestTiltBelowTheSplashDegrees, Math.max(0, this.tiltDegrees + tiltChange))
    if (this.isPouring && this.session.state.pour === null) {
      this.isPouring = false
      this.log(`the pour from ${this.sourceId} ended while it was tilted`)
    }
    if (this.tiltDegrees === 0) this.isTiltingWithNothingToPour = false
    if (!this.isPouring && !this.isTiltingWithNothingToPour && this.isTiltHeld && this.tiltDegrees > 0) this.startPouring()
    if (!this.isPouring) return
    if (this.tiltDegrees === 0) return this.stopPouring()
    const pour = { tiltDegrees: this.tiltDegrees, streamOnTargetFraction: this.onTargetFraction(), missedStreamLandsAt: this.spotUnderTheSpout() }
    if (!hasChangedSince(pour, this.lastSentPour)) return
    this.lastSentPour = pour
    this.session.dispatch({ type: 'adjustPour', ...pour })
  }

  finish(): void {
    if (this.isPouring) this.stopPouring()
    this.log(`stopped aiming ${this.sourceId} at ${this.target.id}`)
  }

  private forgetTheFingerOffTheAimPlane(): void {
    if (this.lastFingerPoint === null) return
    this.lastFingerPoint = null
    this.log(`the finger aiming ${this.sourceId} left the aim plane, so the vessel stays and the finger's next point on the plane starts a new drag`)
  }

  private startPouring(): void {
    const events = this.session.dispatch({ type: 'startPouring', sourceId: this.sourceId, targetId: this.target.id })
    if (events.some((event) => event.type === 'actionRefused' && event.reason === 'sourceIsEmpty')) {
      this.isTiltingWithNothingToPour = true
      return this.log(`${this.sourceId} tilts on with nothing to pour: it is empty`)
    }
    if (events.some((event) => event.type === 'actionRefused')) {
      this.isTiltHeld = false
      return this.log(`${this.sourceId} tilts back: the pour into ${this.target.id} was refused`)
    }
    this.isPouring = true
  }

  private stopPouring(): void {
    this.isPouring = false
    this.lastSentPour = unsentPour
    this.session.dispatch({ type: 'stopPouring' })
  }

  private followTheSpout(): void {
    const shareOverTheTarget = this.shareOfTheStreamOver(this.target)
    const [best] = this.candidates.map((candidate) => ({ candidate, share: this.shareOfTheStreamOver(candidate) })).sort((first, second) => second.share - first.share)
    if (best === undefined || best.share <= shareOverTheTarget || best.candidate.id === this.target.id) return
    this.log(`the spout of ${this.sourceId} moved over ${best.candidate.id}, ${best.share.toFixed(2)} of the stream against ${shareOverTheTarget.toFixed(2)} over ${this.target.id}, so it pours into ${best.candidate.id} now`)
    if (this.isPouring) this.stopPouring()
    this.target = best.candidate
  }

  private spotUnderTheSpout(): Spot | null {
    if (this.spillArea === null || !isInsideTheArea(this.spout, this.spillArea) || this.holesInTheSpillArea.some((hole) => isInsideTheArea(this.spout, hole))) return null
    return { placeId: this.target.spot.placeId, x: this.spout.x, y: this.target.spot.y, z: this.spout.z }
  }

  private onTargetFraction(): number {
    return this.shareOfTheStreamOver(this.target)
  }

  private shareOfTheStreamOver(target: PourTarget): number {
    const distance = floorDistanceBetween(this.spout, target.spot)
    const share = (target.openingRadiusMetres + streamRadiusMetres - distance) / (2 * streamRadiusMetres)
    return clampedToShare(share)
  }
}

function hasChangedSince(pour: SentPour, sent: SentPour): boolean {
  if (pour.tiltDegrees !== sent.tiltDegrees || pour.streamOnTargetFraction !== sent.streamOnTargetFraction) return true
  if (pour.missedStreamLandsAt === null || sent.missedStreamLandsAt === null) return pour.missedStreamLandsAt !== sent.missedStreamLandsAt
  return floorDistanceBetween(pour.missedStreamLandsAt, sent.missedStreamLandsAt) >= spoutMovesThePuddleFromMetres
}

function isInsideTheArea(point: FloorPoint, area: SpoutArea): boolean {
  return point.x >= area.minX && point.x <= area.maxX && point.z >= area.minZ && point.z <= area.maxZ
}

function insideTheArea(point: FloorPoint, area: SpoutArea): FloorPoint {
  return { x: clamped(point.x, area.minX, area.maxX), z: clamped(point.z, area.minZ, area.maxZ) }
}

function openTheLidsThePourNeeds(setUp: PourSetUp, source: DeepReadonly<VesselState>, target: DeepReadonly<VesselState>): void {
  for (const vesselId of setUp.session.lidsThatClosePour(source.id, target.id)) {
    setUp.log(`opening the lid of ${vesselId} for the pour from ${source.id} into ${target.id}`)
    setUp.session.dispatch({ type: 'openVesselLid', vesselId })
  }
}

function spoutAreaInsideTheWalls(spoutDirection: FloorPoint): SpoutArea {
  const insideTheWalls = roomHalfSize - aimedVesselAwayFromTheWallsMetres
  const bodyBehindTheSpout = { x: -spoutDirection.x * aimedVesselReachMetres, z: -spoutDirection.z * aimedVesselReachMetres }
  return {
    minX: Math.max(-insideTheWalls, -insideTheWalls - bodyBehindTheSpout.x),
    maxX: Math.min(insideTheWalls, insideTheWalls - bodyBehindTheSpout.x),
    minZ: Math.max(-insideTheWalls, -insideTheWalls - bodyBehindTheSpout.z),
    maxZ: Math.min(insideTheWalls, insideTheWalls - bodyBehindTheSpout.z),
  }
}

function topOf(layout: RoomLayout, placeId: string): SpoutArea | null {
  const footprint = layout.furniture.find((piece) => piece.id === placeId)?.footprint
  if (footprint === undefined) return null
  return { minX: footprint.x - footprint.width / 2, maxX: footprint.x + footprint.width / 2, minZ: footprint.z - footprint.depth / 2, maxZ: footprint.z + footprint.depth / 2 }
}

function holesInTheTopOf(layout: RoomLayout, placeId: string): SpoutArea[] {
  const sink = layout.sinkBasin
  if (sink.placeId !== placeId) return []
  return [{ minX: sink.x - sink.width / 2, maxX: sink.x + sink.width / 2, minZ: sink.z - sink.depth / 2, maxZ: sink.z + sink.depth / 2 }]
}

function pourTargetsBeside(setUp: PourSetUp, source: DeepReadonly<VesselState>, targetSpot: Spot): PourTarget[] {
  const state = setUp.session.state
  return Object.values(state.vessels).flatMap((vessel) => {
    const layout = layoutOf(state, vessel.id)
    const spot = standingSpotOf(vessel.location)
    const isStandingThere = spot !== null && spot.placeId === targetSpot.placeId && Math.abs(spot.y - targetSpot.y) < sameBoardWithinMetres
    if (vessel.id === source.id || layout === undefined || spot === null || !isStandingThere) return []
    return [{ id: vessel.id, spot, openingRadiusMetres: layout.openingRadiusMetres, tiltWhereTheStreamSplashesDegrees: tiltWhereTheStreamSplashesOf(setUp.catalog, source, vessel) }]
  })
}

function tiltWhereTheStreamSplashesOf(catalog: Catalog, source: DeepReadonly<VesselState>, target: DeepReadonly<VesselState>): number {
  return tiltWhereTheStreamSplashes(definitionIn(catalog, 'vessels', source.definitionId), definitionIn(catalog, 'vessels', target.definitionId))
}
