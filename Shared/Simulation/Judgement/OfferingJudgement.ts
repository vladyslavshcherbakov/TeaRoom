import type { FigurineDefinition } from '../Definitions/FigurineDefinition.ts'
import { isPlainWater, type Liquid } from '../Physics/Liquid.ts'
import type { TeaInABlend } from './TasteJudgement.ts'

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

export function judgeOffering(offered: Liquid, blend: readonly TeaInABlend[], figurine: FigurineDefinition): OfferingJudgement {
  const satisfactionDelta = satisfactionFrom(offered, blend, figurine)
  return { satisfactionDelta, response: responseTo(satisfactionDelta) }
}

export function affinityForTheBlend(blend: readonly TeaInABlend[], figurine: FigurineDefinition): number {
  return blend.reduce((affinity, { tea, share }) => affinity + (figurine.affinityByTeaId[tea.id] ?? 0) * share, 0)
}

function satisfactionFrom(offered: Liquid, blend: readonly TeaInABlend[], figurine: FigurineDefinition): number {
  if (isPlainWater(offered)) return 1
  const affinity = affinityForTheBlend(blend, figurine)
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
