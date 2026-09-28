export type EyePlaneVector = {
  readonly x: number
  readonly y: number
}

const gravityMetresPerSecondSquared = 9.81
const slowingPerSecond = 2.5
const bounceShare = 0.5
const longestStepSeconds = 1 / 240
const longestAdvanceSeconds = 0.1

export class GooglyPupil {
  private readonly roomToRollMetres: number
  private x = 0
  private y: number
  private speedX = 0
  private speedY = 0

  constructor(roomToRollMetres: number) {
    this.roomToRollMetres = roomToRollMetres
    this.y = -roomToRollMetres
  }

  get offset(): EyePlaneVector {
    return { x: this.x, y: this.y }
  }

  advance(seconds: number, headAcceleration: EyePlaneVector): void {
    const advanceSeconds = Math.min(seconds, longestAdvanceSeconds)
    const steps = Math.max(1, Math.ceil(advanceSeconds / longestStepSeconds))
    for (let step = 0; step < steps; step += 1) this.roll(advanceSeconds / steps, headAcceleration)
  }

  private roll(seconds: number, headAcceleration: EyePlaneVector): void {
    this.speedX += (-headAcceleration.x - slowingPerSecond * this.speedX) * seconds
    this.speedY += (-gravityMetresPerSecondSquared - headAcceleration.y - slowingPerSecond * this.speedY) * seconds
    this.x += this.speedX * seconds
    this.y += this.speedY * seconds
    this.bounceOffTheRim()
  }

  private bounceOffTheRim(): void {
    const distanceFromTheMiddle = Math.hypot(this.x, this.y)
    if (distanceFromTheMiddle <= this.roomToRollMetres) return
    const outwardX = this.x / distanceFromTheMiddle
    const outwardY = this.y / distanceFromTheMiddle
    this.x = outwardX * this.roomToRollMetres
    this.y = outwardY * this.roomToRollMetres
    const outwardSpeed = this.speedX * outwardX + this.speedY * outwardY
    if (outwardSpeed <= 0) return
    this.speedX -= (1 + bounceShare) * outwardSpeed * outwardX
    this.speedY -= (1 + bounceShare) * outwardSpeed * outwardY
  }
}
