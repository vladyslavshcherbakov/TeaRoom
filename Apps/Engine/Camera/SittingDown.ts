import type { AppLog } from '../AppLog.ts'
import type { FloorPoint, WorldPoint } from '../Points.ts'
import { lookAt, lookBetween, type FirstPersonLook } from './FirstPersonLook.ts'
import { easedSeatedShare, eyeHeightMetres, seatedShareAfter } from './PlayerHeight.ts'

export type SeatInFirstPerson = {
  readonly isSeated: boolean
  readonly look: FirstPersonLook
  readonly tableInView: WorldPoint | null
  readonly walker: FloorPoint
  readonly playerHeightCentimetres: number
}

type TurnWhileSittingDown = {
  readonly from: FirstPersonLook
  readonly to: FirstPersonLook
}

export class SittingDown {
  private readonly log: AppLog
  private wasSeated = false
  private turn: TurnWhileSittingDown | null = null
  private share = 0

  constructor(log: AppLog) {
    this.log = log
  }

  get seatedShare(): number {
    return this.share
  }

  lookAfterAFrame(seat: SeatInFirstPerson, seconds: number): FirstPersonLook {
    if (seat.isSeated && !this.wasSeated) this.turnToTheTable(seat)
    if (!seat.isSeated && this.wasSeated) this.log('the player stands up from the table, the view rising to standing eyes')
    if (!seat.isSeated) this.turn = null
    this.wasSeated = seat.isSeated
    this.share = seatedShareAfter(this.share, seat.isSeated, seconds)
    const turn = this.turn
    if (turn === null) return seat.look
    if (this.share === 1) this.turn = null
    return lookBetween(turn.from, turn.to, easedSeatedShare(this.share))
  }

  private turnToTheTable(seat: SeatInFirstPerson): void {
    if (seat.tableInView === null) return this.log('the player sits down with no table in view to turn to')
    const eyes = { x: seat.walker.x, y: eyeHeightMetres(seat.playerHeightCentimetres, 1), z: seat.walker.z }
    this.turn = { from: seat.look, to: lookAt(seat.tableInView, eyes) }
    this.log('the player sits down at the table, the view sinking and turning to it, then free to look around')
  }
}
