import type { FigurineDefinition } from '../Definitions/FigurineDefinition.ts'
import { isPlainWater, type Liquid } from '../Physics/Liquid.ts'

export type OfferingResponse = 'glow' | 'subtle' | 'barely'

export type OfferingJudgement = {
  readonly satisfactionDelta: number
  readonly response: OfferingResponse
}

const pointsForAnyTea = 4
const pointsPerAffinity = 4
const pointsForPreferredStrength = 4
const pointsLostToBitterness = 4
const bitterFrom = 45
const glowFrom = 12
const subtleFrom = 6

export function judgeOffering(offered: Liquid, teaId: string, figurine: FigurineDefinition): OfferingJudgement {
  const satisfactionDelta = satisfactionFrom(offered, teaId, figurine)
  return { satisfactionDelta, response: responseTo(satisfactionDelta) }
}

function satisfactionFrom(offered: Liquid, teaId: string, figurine: FigurineDefinition): number {
  if (isPlainWater(offered)) return 1
  const affinity = figurine.affinityByTeaId[teaId] ?? 0
  const isPreferredStrength =
    offered.strength >= figurine.preferredStrength.lowest && offered.strength <= figurine.preferredStrength.highest
  return (
    pointsForAnyTea +
    affinity * pointsPerAffinity +
    (isPreferredStrength ? pointsForPreferredStrength : 0) -
    (offered.bitterness >= bitterFrom ? pointsLostToBitterness : 0)
  )
}

function responseTo(satisfactionDelta: number): OfferingResponse {
  if (satisfactionDelta >= glowFrom) return 'glow'
  if (satisfactionDelta >= subtleFrom) return 'subtle'
  return 'barely'
}
