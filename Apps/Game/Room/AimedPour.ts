import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { tiltWhereWaterSplashesDegrees } from '../../../Shared/Simulation/Physics/Pouring.ts'
import type { FloorPoint } from './RoomLayout.ts'
import type { RoomLog } from './RoomNavigator.ts'
import type { RitualPort } from './RoomPlay.ts'

export type AimedPourView = {
  readonly sourceId: string
  readonly targetId: string
  readonly spout: FloorPoint
  readonly spoutDirection: FloorPoint
  readonly tiltDegrees: number
}

const firstSpoutOffsetFromTargetMetres = 0.22
const tiltGrowthDegreesPerSecond = 30
const tiltFallDegreesPerSecond = 70
const steepestTiltBelowTheSplashDegrees = 1
const steepestTiltDegrees = tiltWhereWaterSplashesDegrees - steepestTiltBelowTheSplashDegrees
const streamRadiusMetres = 0.012

export class AimedPour {
  private readonly ritual: RitualPort
  private readonly log: RoomLog
  private readonly sourceId: string
  private readonly targetId: string
  private readonly target: FloorPoint
  private readonly openingRadiusMetres: number
  private readonly spoutDirection: FloorPoint
  private spout: FloorPoint
  private tiltDegrees = 0
  private isTiltHeld = false
  private isPouring = false
  private lastFingerPoint: FloorPoint | null = null
  private lastSentPour = { tiltDegrees: -1, streamOnTargetFraction: -1 }

  constructor(ritual: RitualPort, log: RoomLog, sourceId: string, targetId: string, targetSpot: Spot, openingRadiusMetres: number, spoutDirection: FloorPoint) {
    this.ritual = ritual
    this.log = log
    this.sourceId = sourceId
    this.targetId = targetId
    this.target = { x: targetSpot.x, z: targetSpot.z }
    this.openingRadiusMetres = openingRadiusMetres
    this.spoutDirection = spoutDirection
    this.spout = { x: targetSpot.x - spoutDirection.x * firstSpoutOffsetFromTargetMetres, z: targetSpot.z - spoutDirection.z * firstSpoutOffsetFromTargetMetres }
    log(`aiming ${sourceId} at ${targetId}, the spout starts ${firstSpoutOffsetFromTargetMetres} m to its left on the screen, pointing (${spoutDirection.x.toFixed(2)}, ${spoutDirection.z.toFixed(2)})`)
  }

  get view(): AimedPourView {
    return { sourceId: this.sourceId, targetId: this.targetId, spout: this.spout, spoutDirection: this.spoutDirection, tiltDegrees: this.tiltDegrees }
  }

  fingerDown(point: FloorPoint): void {
    this.lastFingerPoint = point
  }

  fingerMoved(point: FloorPoint): void {
    const last = this.lastFingerPoint
    if (last === null) return
    this.spout = { x: this.spout.x + point.x - last.x, z: this.spout.z + point.z - last.z }
    this.lastFingerPoint = point
  }

  fingerUp(): void {
    this.lastFingerPoint = null
    this.log(`spout of ${this.sourceId} moved to (${this.spout.x.toFixed(2)}, ${this.spout.z.toFixed(2)}), ${this.onTargetFraction().toFixed(2)} of the stream over ${this.targetId}`)
  }

  tiltPressed(): void {
    this.isTiltHeld = true
  }

  tiltReleased(): void {
    this.isTiltHeld = false
  }

  advance(seconds: number): void {
    const tiltChange = this.isTiltHeld ? tiltGrowthDegreesPerSecond * seconds : -tiltFallDegreesPerSecond * seconds
    this.tiltDegrees = Math.min(steepestTiltDegrees, Math.max(0, this.tiltDegrees + tiltChange))
    if (this.isPouring && this.ritual.state.pour === null) {
      this.isPouring = false
      this.log(`the pour from ${this.sourceId} ended while it was tilted`)
    }
    if (!this.isPouring && this.isTiltHeld && this.tiltDegrees > 0) this.startPouring()
    if (!this.isPouring) return
    if (this.tiltDegrees === 0) return this.stopPouring()
    const pour = { tiltDegrees: this.tiltDegrees, streamOnTargetFraction: this.onTargetFraction() }
    if (pour.tiltDegrees === this.lastSentPour.tiltDegrees && pour.streamOnTargetFraction === this.lastSentPour.streamOnTargetFraction) return
    this.lastSentPour = pour
    this.ritual.dispatch({ type: 'adjustPour', ...pour })
  }

  finish(): void {
    if (this.isPouring) this.stopPouring()
    this.log(`stopped aiming ${this.sourceId} at ${this.targetId}`)
  }

  private startPouring(): void {
    const events = this.ritual.dispatch({ type: 'startPouring', sourceId: this.sourceId, targetId: this.targetId })
    if (events.some((event) => event.type === 'actionRefused')) {
      this.isTiltHeld = false
      return this.log(`${this.sourceId} tilts back: the pour into ${this.targetId} was refused`)
    }
    this.isPouring = true
  }

  private stopPouring(): void {
    this.isPouring = false
    this.lastSentPour = { tiltDegrees: -1, streamOnTargetFraction: -1 }
    this.ritual.dispatch({ type: 'stopPouring' })
  }

  private onTargetFraction(): number {
    const distance = Math.hypot(this.spout.x - this.target.x, this.spout.z - this.target.z)
    const share = (this.openingRadiusMetres + streamRadiusMetres - distance) / (2 * streamRadiusMetres)
    return Math.min(1, Math.max(0, share))
  }
}
