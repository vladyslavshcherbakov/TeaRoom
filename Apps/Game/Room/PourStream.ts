import { tiltWhereWaterStartsDegrees, type DeepReadonly, type PourState } from '../../../Shared/GameLogic/GameLogic.ts'

export function isThePourStreamRunning(pour: DeepReadonly<PourState>): boolean {
  return pour.tiltDegrees >= tiltWhereWaterStartsDegrees && !pour.hasRunDry
}

export function isThePourRunningOverItsTarget(pour: DeepReadonly<PourState>): boolean {
  return pour.hasOverflowed && isThePourStreamRunning(pour) && pour.streamOnTargetFraction > 0
}
