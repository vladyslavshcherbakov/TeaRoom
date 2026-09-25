import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import type { FloorPoint } from './RoomLayout.ts'
import type { RoomLog } from './RoomNavigator.ts'
import type { RitualPort } from './RoomPlay.ts'
import { clampedToShare } from '../../../Shared/Simulation/Physics/ClampedToShare.ts'

export type AimedPourView = {
  readonly sourceId: string
  readonly targetId: string
  readonly spout: FloorPoint
  readonly spoutDirection: FloorPoint
  readonly tiltDegrees: number
}

export type PourTarget = {
  readonly id: string
  readonly spot: Spot
  readonly openingRadiusMetres: number
  readonly tiltWhereTheStreamSplashesDegrees: number
}

const firstSpoutOffsetFromTargetMetres = 0.22
const tiltGrowthDegreesPerSecond = 30
const tiltFallDegreesPerSecond = 70
const steepestTiltBelowTheSplashDegrees = 1
const streamRadiusMetres = 0.012
const spoutMovesThePuddleFromMetres = 0.01

type SentPour = { readonly tiltDegrees: number; readonly streamOnTargetFraction: number; readonly missedStreamLandsAt: Spot | null }

const unsentPour: SentPour = { tiltDegrees: -1, streamOnTargetFraction: -1, missedStreamLandsAt: null }

export class AimedPour {
  private readonly ritual: RitualPort
  private readonly log: RoomLog
  private readonly sourceId: string
  private readonly candidates: readonly PourTarget[]
  private target: PourTarget
  private readonly spoutDirection: FloorPoint
  private spout: FloorPoint
  private tiltDegrees = 0
  private isTiltHeld = false
  private isPouring = false
  private lastFingerPoint: FloorPoint | null = null
  private lastSentPour: SentPour = unsentPour

  constructor(ritual: RitualPort, log: RoomLog, sourceId: string, target: PourTarget, candidates: readonly PourTarget[], spoutDirection: FloorPoint) {
    this.ritual = ritual
    this.log = log
    this.sourceId = sourceId
    this.target = target
    this.candidates = candidates
    this.spoutDirection = spoutDirection
    this.spout = { x: target.spot.x - spoutDirection.x * firstSpoutOffsetFromTargetMetres, z: target.spot.z - spoutDirection.z * firstSpoutOffsetFromTargetMetres }
    log(`aiming ${sourceId} at ${target.id}, the spout starts ${firstSpoutOffsetFromTargetMetres} m to its left on the screen, pointing (${spoutDirection.x.toFixed(2)}, ${spoutDirection.z.toFixed(2)}), ${candidates.map((candidate) => candidate.id).join(', ')} can be poured into here`)
  }

  get view(): AimedPourView {
    return { sourceId: this.sourceId, targetId: this.target.id, spout: this.spout, spoutDirection: this.spoutDirection, tiltDegrees: this.tiltDegrees }
  }

  fingerDown(point: FloorPoint): void {
    this.lastFingerPoint = point
  }

  fingerMoved(point: FloorPoint): void {
    const last = this.lastFingerPoint
    if (last === null) return
    this.spout = { x: this.spout.x + point.x - last.x, z: this.spout.z + point.z - last.z }
    this.lastFingerPoint = point
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
    if (this.isPouring && this.ritual.state.pour === null) {
      this.isPouring = false
      this.log(`the pour from ${this.sourceId} ended while it was tilted`)
    }
    if (!this.isPouring && this.isTiltHeld && this.tiltDegrees > 0) this.startPouring()
    if (!this.isPouring) return
    if (this.tiltDegrees === 0) return this.stopPouring()
    const pour = { tiltDegrees: this.tiltDegrees, streamOnTargetFraction: this.onTargetFraction(), missedStreamLandsAt: this.spotUnderTheSpout() }
    if (!hasChangedSince(pour, this.lastSentPour)) return
    this.lastSentPour = pour
    this.ritual.dispatch({ type: 'adjustPour', ...pour })
  }

  finish(): void {
    if (this.isPouring) this.stopPouring()
    this.log(`stopped aiming ${this.sourceId} at ${this.target.id}`)
  }

  private startPouring(): void {
    const events = this.ritual.dispatch({ type: 'startPouring', sourceId: this.sourceId, targetId: this.target.id })
    if (events.some((event) => event.type === 'actionRefused')) {
      this.isTiltHeld = false
      return this.log(`${this.sourceId} tilts back: the pour into ${this.target.id} was refused`)
    }
    this.isPouring = true
  }

  private stopPouring(): void {
    this.isPouring = false
    this.lastSentPour = unsentPour
    this.ritual.dispatch({ type: 'stopPouring' })
  }

  private followTheSpout(): void {
    const shareOverTheTarget = this.shareOfTheStreamOver(this.target)
    const [best] = this.candidates.map((candidate) => ({ candidate, share: this.shareOfTheStreamOver(candidate) })).sort((first, second) => second.share - first.share)
    if (best === undefined || best.share <= shareOverTheTarget || best.candidate.id === this.target.id) return
    this.log(`the spout of ${this.sourceId} moved over ${best.candidate.id}, ${best.share.toFixed(2)} of the stream against ${shareOverTheTarget.toFixed(2)} over ${this.target.id}, so it pours into ${best.candidate.id} now`)
    if (this.isPouring) this.stopPouring()
    this.target = best.candidate
  }

  private spotUnderTheSpout(): Spot {
    return { placeId: this.target.spot.placeId, x: this.spout.x, y: this.target.spot.y, z: this.spout.z }
  }

  private onTargetFraction(): number {
    return this.shareOfTheStreamOver(this.target)
  }

  private shareOfTheStreamOver(target: PourTarget): number {
    const distance = Math.hypot(this.spout.x - target.spot.x, this.spout.z - target.spot.z)
    const share = (target.openingRadiusMetres + streamRadiusMetres - distance) / (2 * streamRadiusMetres)
    return clampedToShare(share)
  }
}

function hasChangedSince(pour: SentPour, sent: SentPour): boolean {
  if (pour.tiltDegrees !== sent.tiltDegrees || pour.streamOnTargetFraction !== sent.streamOnTargetFraction) return true
  if (pour.missedStreamLandsAt === null || sent.missedStreamLandsAt === null) return pour.missedStreamLandsAt !== sent.missedStreamLandsAt
  return Math.hypot(pour.missedStreamLandsAt.x - sent.missedStreamLandsAt.x, pour.missedStreamLandsAt.z - sent.missedStreamLandsAt.z) >= spoutMovesThePuddleFromMetres
}
