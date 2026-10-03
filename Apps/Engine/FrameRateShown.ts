import { FrameRate } from './FrameRate.ts'

export class FrameRateShown {
  private frameRate: FrameRate | null = null
  private framesPerSecond: number | null = null

  get isShown(): boolean {
    return this.frameRate !== null
  }

  get reading(): number | null {
    return this.framesPerSecond === null ? null : Math.round(this.framesPerSecond)
  }

  show(isShown: boolean): void {
    if (isShown === this.isShown) return
    this.frameRate = isShown ? new FrameRate() : null
    this.framesPerSecond = null
  }

  frameDrawn(seconds: number): void {
    const framesPerSecond = this.frameRate?.frameDrawn(seconds) ?? null
    if (framesPerSecond !== null) this.framesPerSecond = framesPerSecond
  }
}
