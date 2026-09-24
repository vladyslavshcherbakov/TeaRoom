import type { VesselDefinition } from '../Definitions/VesselDefinition.ts'
import { mixLiquids, splitLiquid, type Liquid } from './Liquid.ts'

export type StreamLanding = {
  readonly source: Liquid
  readonly target: Liquid | null
  readonly landedMl: number
  readonly spilledMl: number
  readonly overflowedMl: number
}

const tiltWhereWaterStartsDegrees = 10
const tiltOfFullFlowDegrees = 45
const flowShareAboveWhichWaterSplashes = 0.8
const splashedShareOfFastFlow = 0.1

export const tiltWhereWaterSplashesDegrees =
  tiltWhereWaterStartsDegrees + flowShareAboveWhichWaterSplashes * (tiltOfFullFlowDegrees - tiltWhereWaterStartsDegrees)

function flowShareAtTilt(tiltDegrees: number): number {
  const share = (tiltDegrees - tiltWhereWaterStartsDegrees) / (tiltOfFullFlowDegrees - tiltWhereWaterStartsDegrees)
  return Math.min(1, Math.max(0, share))
}

export function pourStream(
  source: Liquid,
  sourceDefinition: VesselDefinition,
  target: { liquid: Liquid; definition: VesselDefinition } | null,
  tiltDegrees: number,
  streamOnTargetFraction: number,
  seconds: number,
): StreamLanding {
  const flowShare = flowShareAtTilt(tiltDegrees)
  const { taken: stream, left: sourceAfter } = splitLiquid(source, flowShare * sourceDefinition.maxPourMlPerSecond * seconds)
  const splashedShare = flowShare > flowShareAboveWhichWaterSplashes ? splashedShareOfFastFlow : 0
  const reachingTargetMl = target === null ? 0 : stream.volumeMl * clampToShare(streamOnTargetFraction) * (1 - splashedShare)
  const roomLeftMl = target === null ? 0 : Math.max(0, target.definition.capacityMl - target.liquid.volumeMl)
  const landedMl = Math.min(reachingTargetMl, roomLeftMl)
  const overflowedMl = reachingTargetMl - landedMl
  return {
    source: sourceAfter,
    target: target === null ? null : mixLiquids(target.liquid, { ...stream, volumeMl: landedMl }),
    landedMl,
    spilledMl: stream.volumeMl - landedMl,
    overflowedMl,
  }
}

function clampToShare(value: number): number {
  return Math.min(1, Math.max(0, value))
}
