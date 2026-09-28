import type { AppLog } from './AppLog.ts'

export type TapCount = {
  readonly count: number
  readonly isReached: boolean
}

export class TapsInARow {
  private readonly what: string
  private readonly reachedAtCount: number
  private readonly log: AppLog
  private lastTapped: { readonly key: string; count: number } | null = null

  constructor(what: string, reachedAtCount: number, log: AppLog) {
    this.what = what
    this.reachedAtCount = reachedAtCount
    this.log = log
  }

  isCounting(key: string): boolean {
    return this.lastTapped?.key === key
  }

  countTapOn(key: string): TapCount {
    if (this.lastTapped?.key === key) this.lastTapped.count += 1
    else this.lastTapped = { key, count: 1 }
    const { count } = this.lastTapped
    const isReached = count >= this.reachedAtCount
    if (isReached) this.lastTapped = null
    return { count, isReached }
  }

  startAgainAfterAnotherTap(): void {
    const count = this.lastTapped?.count ?? 0
    if (count === 0) return
    this.log(`another tap after ${count} taps ${this.what} starts the count again`)
    this.lastTapped = null
  }
}
