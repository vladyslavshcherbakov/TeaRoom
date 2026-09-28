export function clampedToShare(value: number): number {
  return Math.min(1, Math.max(0, value))
}
