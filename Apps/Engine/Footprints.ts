import { clamped, floorDistanceBetween } from './Arithmetic.ts'
import type { FloorPoint, Footprint } from './Points.ts'

export function isACircleInside(rectangle: Footprint, centre: FloorPoint, radius: number): boolean {
  return Math.abs(centre.x - rectangle.x) <= rectangle.width / 2 - radius && Math.abs(centre.z - rectangle.z) <= rectangle.depth / 2 - radius
}

export function doesACircleTouch(rectangle: Footprint, centre: FloorPoint, radius: number): boolean {
  const nearestX = clamped(centre.x, rectangle.x - rectangle.width / 2, rectangle.x + rectangle.width / 2)
  const nearestZ = clamped(centre.z, rectangle.z - rectangle.depth / 2, rectangle.z + rectangle.depth / 2)
  return floorDistanceBetween(centre, { x: nearestX, z: nearestZ }) < radius
}
