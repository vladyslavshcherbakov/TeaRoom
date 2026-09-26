import type { RoomLog } from './RoomNavigator.ts'

export type PlayTimeStorage = {
  readonly load: () => number
  readonly keep: (secondsPlayed: number) => void
}

export type FrameCircumstances = {
  readonly isThePageShown: boolean
  readonly hasTheKeeperDied: boolean
}

export type PlayTimeShown =
  | { readonly kind: 'underAMinute' }
  | { readonly kind: 'minutes'; readonly minutes: number }
  | { readonly kind: 'hoursAndMinutes'; readonly hours: number; readonly minutes: number }

const longestCountedFrameSeconds = 1
const secondsBetweenKeepingThePlayTime = 10
const secondsInAMinute = 60
const minutesInAnHour = 60

export class PlayTime {
  private readonly storage: PlayTimeStorage
  private readonly log: RoomLog
  private secondsPlayed: number
  private secondsSinceItWasKept = 0

  constructor(storage: PlayTimeStorage, log: RoomLog) {
    this.storage = storage
    this.log = log
    this.secondsPlayed = storage.load()
    log(`${this.secondsPlayed.toFixed(0)} s were played in earlier visits`)
  }

  get seconds(): number {
    return this.secondsPlayed
  }

  frameDrawn(seconds: number, circumstances: FrameCircumstances): void {
    if (!circumstances.isThePageShown || circumstances.hasTheKeeperDied) return
    const counted = Math.min(seconds, longestCountedFrameSeconds)
    this.secondsPlayed += counted
    this.secondsSinceItWasKept += counted
    if (this.secondsSinceItWasKept >= secondsBetweenKeepingThePlayTime) this.keep(null)
  }

  keep(reason: string | null): void {
    this.secondsSinceItWasKept = 0
    this.storage.keep(this.secondsPlayed)
    if (reason !== null) this.log(`the play time of ${this.secondsPlayed.toFixed(0)} s is kept: ${reason}`)
  }
}

export function playTimeShownFor(seconds: number): PlayTimeShown {
  const wholeMinutes = Math.floor(seconds / secondsInAMinute)
  if (wholeMinutes === 0) return { kind: 'underAMinute' }
  if (wholeMinutes < minutesInAnHour) return { kind: 'minutes', minutes: wholeMinutes }
  return { kind: 'hoursAndMinutes', hours: Math.floor(wholeMinutes / minutesInAnHour), minutes: wholeMinutes % minutesInAnHour }
}
