import type { RunningWaterState } from '../State/SessionState.ts'

export function drain(runningWater: RunningWaterState, ml: number): void {
  runningWater.drainedMl += ml
  runningWater.drainedSinceOpenedMl += ml
}
