const secondsPerReading = 0.5

export class FrameRate {
  private secondsCounted = 0
  private framesCounted = 0

  frameDrawn(seconds: number): number | null {
    this.secondsCounted += seconds
    this.framesCounted += 1
    if (this.secondsCounted < secondsPerReading) return null
    const framesPerSecond = this.framesCounted / this.secondsCounted
    this.secondsCounted = 0
    this.framesCounted = 0
    return framesPerSecond
  }
}
