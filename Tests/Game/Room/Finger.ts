import type { ScenePoint } from '../../../Apps/Game/Room/RoomLayout.ts'
import type { TableTouches } from '../../../Apps/Game/Room/Touch/TableTouches.ts'

const stepsPerDrag = 12

export class Finger {
  private readonly touches: TableTouches
  private nowMs = 0

  constructor(touches: TableTouches) {
    this.touches = touches
  }

  tap(point: ScenePoint): void {
    this.touches.touchStarted(point)
    this.nowMs += 80
    this.touches.touchEnded(point, this.nowMs)
  }

  press(point: ScenePoint): void {
    this.touches.touchStarted(point)
  }

  slideThrough(points: readonly ScenePoint[], durationMs: number): void {
    const legDurationMs = durationMs / Math.max(1, points.length - 1)
    for (let leg = 1; leg < points.length; leg += 1) {
      const from = points[leg - 1]
      const to = points[leg]
      if (from === undefined || to === undefined) continue
      for (let step = 1; step <= stepsPerDrag; step += 1) {
        this.nowMs += legDurationMs / stepsPerDrag
        this.touches.touchMoved(between(from, to, step / stepsPerDrag), this.nowMs)
      }
    }
  }

  lift(point: ScenePoint): void {
    this.touches.touchEnded(point, this.nowMs)
  }

  drag(points: readonly ScenePoint[], durationMs = 600): void {
    const [first] = points
    const last = points.at(-1)
    if (first === undefined || last === undefined) return
    this.press(first)
    this.slideThrough(points, durationMs)
    this.lift(last)
  }
}

function between(from: ScenePoint, to: ScenePoint, share: number): ScenePoint {
  return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share }
}
