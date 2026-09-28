import type { VesselDefinition } from '../Definitions/VesselDefinition.ts'
import { mixLiquids, type Liquid } from './Liquid.ts'
import { clampedToShare } from '../../Engine/ClampedToShare.ts'

export type StreamLanding = {
  readonly target: Liquid | null
  readonly landedMl: number
  readonly spilledMl: number
  readonly missedMl: number
  readonly splashedMl: number
  readonly overflowed: Liquid
}

export const tiltWhereWaterStartsDegrees = 10
const splashedShareOfFastFlow = 0.1

export const tiltOfFullFlowDegrees = 45

export function tiltWhereTheStreamSplashes(sourceDefinition: VesselDefinition, targetDefinition: VesselDefinition): number {
  const flowShareTheTargetTakes = Math.min(1, targetDefinition.takesAStreamOfUpToMlPerSecond / sourceDefinition.maxPourMlPerSecond)
  return tiltWhereWaterStartsDegrees + flowShareTheTargetTakes * (tiltOfFullFlowDegrees - tiltWhereWaterStartsDegrees)
}

function flowShareAtTilt(tiltDegrees: number): number {
  const share = (tiltDegrees - tiltWhereWaterStartsDegrees) / (tiltOfFullFlowDegrees - tiltWhereWaterStartsDegrees)
  return clampedToShare(share)
}

export function pourFlowMlPerSecond(sourceDefinition: VesselDefinition, tiltDegrees: number): number {
  return flowShareAtTilt(tiltDegrees) * sourceDefinition.maxPourMlPerSecond
}

export function landingOfTheStream(stream: Liquid, streamMlPerSecond: number, target: { liquid: Liquid; definition: VesselDefinition } | null, streamOnTargetFraction: number): StreamLanding {
  const splashedShare = target !== null && streamMlPerSecond > target.definition.takesAStreamOfUpToMlPerSecond ? splashedShareOfFastFlow : 0
  const onTargetMl = target === null ? 0 : stream.volumeMl * clampedToShare(streamOnTargetFraction)
  const reachingTargetMl = onTargetMl * (1 - splashedShare)
  const roomLeftMl = target === null ? 0 : Math.max(0, target.definition.capacityMl - target.liquid.volumeMl)
  const landedMl = Math.min(reachingTargetMl, roomLeftMl)
  const mixedInTheTarget = target === null ? null : mixLiquids(target.liquid, { ...stream, volumeMl: reachingTargetMl })
  return {
    target: target === null || mixedInTheTarget === null ? null : upToTheBrim(mixedInTheTarget, target.definition.capacityMl),
    landedMl,
    spilledMl: stream.volumeMl - landedMl,
    missedMl: stream.volumeMl - onTargetMl,
    splashedMl: onTargetMl - reachingTargetMl,
    overflowed: { ...(mixedInTheTarget ?? stream), volumeMl: reachingTargetMl - landedMl },
  }
}

function upToTheBrim(liquid: Liquid, capacityMl: number): Liquid {
  return liquid.volumeMl > capacityMl ? { ...liquid, volumeMl: capacityMl } : liquid
}
