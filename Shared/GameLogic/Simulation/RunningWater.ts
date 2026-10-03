import type { Draft } from './Draft.ts'
import type { RunningWaterState, TapUse } from '../State/SessionState.ts'

export function drain(runningWater: RunningWaterState, ml: number): void {
  runningWater.drainedMl += ml
  runningWater.drainedSinceOpenedMl += ml
}

export function runningWaterOver(draft: Draft, itemId: string | null, isItemClosedAgainstTheTap: boolean, use: TapUse, runningBefore: RunningWaterState | null): RunningWaterState {
  return {
    use,
    openedAtSeconds: runningBefore?.openedAtSeconds ?? draft.state.elapsedSeconds,
    drainedSinceOpenedMl: runningBefore?.drainedSinceOpenedMl ?? 0,
    filledMl: 0,
    drainedMl: 0,
    hasOverflowed: false,
    isRunningOverTheLid: isItemClosedAgainstTheTap,
    hasRunOntoAnItem: (runningBefore?.hasRunOntoAnItem ?? false) || itemId !== null,
  }
}
