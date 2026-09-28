import type { AppLog } from '../AppLog.ts'
import { isWalking, type Walk } from '../Walking/Walk.ts'
import { lookTurnedBy, lookTurnedByTheMouse, lookTurnedTowards, type FirstPersonLook, type MouseMovement, type StickDeflection } from './FirstPersonLook.ts'

export type LookControls = {
  readonly mouseMovement: MouseMovement | null
  readonly lookStick: StickDeflection | null
}

export class LookAlongTheWalk {
  private readonly log: AppLog
  private walksSeen: number
  private isLetGoByThePlayer = false

  constructor(walksStarted: number, log: AppLog) {
    this.walksSeen = walksStarted
    this.log = log
  }

  lookAfterAFrame(look: FirstPersonLook, controls: LookControls, walk: Walk, walksStarted: number, seconds: number): FirstPersonLook {
    if (walksStarted !== this.walksSeen) this.followTheNewWalk(walksStarted)
    if (isWalking(walk) && !this.isLetGoByThePlayer && isTurnedByThePlayer(controls)) this.letGoOfTheWalk()
    const lookAlongTheWay = isWalking(walk) && !this.isLetGoByThePlayer ? lookTurnedTowards(look, walk.headingRadians, seconds) : look
    return lookTurnedByThe(controls, lookAlongTheWay, seconds)
  }

  private followTheNewWalk(walksStarted: number): void {
    this.walksSeen = walksStarted
    if (!this.isLetGoByThePlayer) return
    this.isLetGoByThePlayer = false
    this.log('a new walk starts, so the first-person look turns towards its way again')
  }

  private letGoOfTheWalk(): void {
    this.isLetGoByThePlayer = true
    this.log('the player turned the first-person look during a walk, so it no longer turns towards the way until the next walk starts')
  }
}

function isTurnedByThePlayer(controls: LookControls): boolean {
  const { mouseMovement, lookStick } = controls
  const hasTheMouseMoved = mouseMovement !== null && (mouseMovement.x !== 0 || mouseMovement.y !== 0)
  const isTheStickPushed = lookStick !== null && (lookStick.right !== 0 || lookStick.up !== 0)
  return hasTheMouseMoved || isTheStickPushed
}

function lookTurnedByThe(controls: LookControls, look: FirstPersonLook, seconds: number): FirstPersonLook {
  const turnedByTheMouse = controls.mouseMovement === null ? look : lookTurnedByTheMouse(look, controls.mouseMovement)
  return controls.lookStick === null ? turnedByTheMouse : lookTurnedBy(turnedByTheMouse, controls.lookStick, seconds)
}
