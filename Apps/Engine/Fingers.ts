import { screenDistanceBetween } from './Arithmetic.ts'
import type { ScreenPoint } from './ScreenPoint.ts'

export type Finger = {
  readonly start: ScreenPoint
  last: ScreenPoint
  mayBeATap: boolean
}

export const tapSlopPixels = 12

export class Fingers {
  private readonly fingerByPointerId = new Map<number, Finger>()

  get count(): number {
    return this.fingerByPointerId.size
  }

  has(pointerId: number): boolean {
    return this.fingerByPointerId.has(pointerId)
  }

  fingerOf(pointerId: number): Finger | undefined {
    return this.fingerByPointerId.get(pointerId)
  }

  put(pointerId: number, point: ScreenPoint, mayBeATap: boolean): void {
    this.fingerByPointerId.set(pointerId, { start: point, last: point, mayBeATap })
  }

  move(finger: Finger, point: ScreenPoint): void {
    finger.last = point
    if (isBeyondTheTapSlop(finger.start, point)) finger.mayBeATap = false
  }

  lift(pointerId: number): Finger | undefined {
    const finger = this.fingerByPointerId.get(pointerId)
    this.fingerByPointerId.delete(pointerId)
    return finger
  }

  forbidTaps(): void {
    for (const finger of this.fingerByPointerId.values()) finger.mayBeATap = false
  }

  gapBetweenTheFirstTwo(): number {
    const [first, second] = [...this.fingerByPointerId.values()]
    return first === undefined || second === undefined ? 1 : screenDistanceBetween(first.last, second.last)
  }
}

export function isBeyondTheTapSlop(start: ScreenPoint, point: ScreenPoint): boolean {
  return screenDistanceBetween(start, point) > tapSlopPixels
}
