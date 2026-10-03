import type { DeepReadonly } from '../../Engine/DeepReadonly.ts'
import { tiltWhereWaterStartsDegrees } from '../Chemistry/Pouring.ts'
import type { PourState } from './SessionState.ts'

export function isThePourStreamRunning(pour: DeepReadonly<PourState>): boolean {
  return pour.tiltDegrees >= tiltWhereWaterStartsDegrees && !pour.hasRunDry
}

export function isThePourRunningOverItsTarget(pour: DeepReadonly<PourState>): boolean {
  return pour.hasOverflowed && isThePourStreamRunning(pour) && pour.streamOnTargetFraction > 0
}
