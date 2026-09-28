import type { AppLog } from './AppLog.ts'

type SlowStretch = {
  realSeconds: number
  worldSeconds: number
  frames: number
}

const longestFrameSeconds = 0.1
const longestStretchLoggedAtItsEndSeconds = 10

export class WorldTime {
  private readonly log: AppLog
  private slowStretch: SlowStretch | null = null

  constructor(log: AppLog) {
    this.log = log
  }

  frameDrawn(realSeconds: number): number {
    const worldSeconds = Math.min(realSeconds, longestFrameSeconds)
    if (realSeconds <= longestFrameSeconds) {
      this.endTheSlowStretch()
      return worldSeconds
    }
    const stretch = this.slowStretch ?? { realSeconds: 0, worldSeconds: 0, frames: 0 }
    stretch.realSeconds += realSeconds
    stretch.worldSeconds += worldSeconds
    stretch.frames += 1
    this.slowStretch = stretch
    if (stretch.realSeconds >= longestStretchLoggedAtItsEndSeconds) this.endTheSlowStretch()
    return worldSeconds
  }

  private endTheSlowStretch(): void {
    const stretch = this.slowStretch
    if (stretch === null) return
    this.slowStretch = null
    const lostSeconds = stretch.realSeconds - stretch.worldSeconds
    const framesPerSecond = stretch.frames / stretch.realSeconds
    this.log(`the world fell ${lostSeconds.toFixed(1)} s behind real time over ${stretch.realSeconds.toFixed(1)} s at ${framesPerSecond.toFixed(1)} frames a second, because a frame moves it at most ${longestFrameSeconds} s`)
  }
}
