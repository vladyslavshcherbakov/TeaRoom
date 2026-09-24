import type { ScenePoint } from '../RoomLayout.ts'

const scenePixelsPerCentimetre = 10

export type WipeStroke = {
  readonly startedAtMs: number
  readonly lastPoint: ScenePoint
  readonly lengthPx: number
}

export function startStroke(point: ScenePoint, atMs: number): WipeStroke {
  return { startedAtMs: atMs, lastPoint: point, lengthPx: 0 }
}

export function extendStroke(stroke: WipeStroke, point: ScenePoint): WipeStroke {
  const segmentPx = Math.hypot(point.x - stroke.lastPoint.x, point.y - stroke.lastPoint.y)
  return { ...stroke, lastPoint: point, lengthPx: stroke.lengthPx + segmentPx }
}

export function strokeSpeedCmPerSecond(stroke: WipeStroke, endedAtMs: number): number {
  const seconds = Math.max(0.001, (endedAtMs - stroke.startedAtMs) / 1000)
  return stroke.lengthPx / scenePixelsPerCentimetre / seconds
}

export function coveredFraction(stroke: WipeStroke, puddleRadiusPx: number): number {
  return Math.min(1, stroke.lengthPx / (puddleRadiusPx * 2))
}
