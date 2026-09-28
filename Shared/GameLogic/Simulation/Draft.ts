import { type Catalog } from '../Definitions/Catalog.ts'
import { definitionIn } from '../../Engine/Catalog.ts'
import type { VesselDefinition } from '../Definitions/VesselDefinition.ts'
import { steepedSecondsOf, totalLeafGrams, type Leaves } from '../Chemistry/Brewing.ts'
import { shareOfTheStrengthByTeaId, type Liquid } from '../Chemistry/Liquid.ts'
import type { SessionState, VesselState } from '../State/SessionState.ts'
import type { TeaEvent } from './TeaEvent.ts'
import type { Draft as EngineDraft } from '../../Engine/Draft.ts'
import { percent } from '../../Engine/Percent.ts'

export type Draft = EngineDraft<SessionState, Catalog, TeaEvent>

export function describeLiquid(vessel: VesselState): string {
  const { volumeMl, temperatureC, strength, bitterness } = vessel.liquid
  return `${vessel.id} ${volumeMl.toFixed(1)} ml at ${temperatureC.toFixed(1)} °C, strength ${strength.toFixed(0)}${describeTheTeasOf(vessel.liquid)}, bitterness ${bitterness.toFixed(0)}`
}

export function describeTheTeasOf(liquid: Liquid): string {
  const teas = Object.entries(shareOfTheStrengthByTeaId(liquid)).map(([teaId, share]) => `${percent(share)} ${teaId}`)
  return teas.length === 0 ? '' : ` of ${teas.join(', ')}`
}

export function describeTheLeaves(gramsByTeaId: Readonly<Record<string, number>>): string {
  return `${totalLeafGrams(gramsByTeaId).toFixed(2)} g of ${teasOfTheLeaves(gramsByTeaId)}`
}

export function describeTheSteepingTimes(leaves: Leaves, digits: number): string {
  const secondsSteepedBy = (teaId: string) => `${steepedSecondsOf(leaves, teaId).toFixed(digits)} s`
  const [firstTeaId, ...otherTeaIds] = Object.keys(leaves.gramsByTeaId)
  if (firstTeaId === undefined) return 'no time'
  if (otherTeaIds.length === 0) return secondsSteepedBy(firstTeaId)
  return [firstTeaId, ...otherTeaIds].map((teaId) => `${secondsSteepedBy(teaId)} of ${teaId}`).join(', ')
}

export function teasOfTheLeaves(gramsByTeaId: Readonly<Record<string, number>>): string {
  const teaIds = Object.keys(gramsByTeaId)
  if (teaIds.length <= 1) return teaIds[0] ?? 'no tea'
  const gramsOfEveryTea = totalLeafGrams(gramsByTeaId)
  return Object.entries(gramsByTeaId).map(([teaId, grams]) => `${percent(grams / gramsOfEveryTea)} ${teaId}`).join(', ')
}

export function vesselDefinitionOf(draft: Draft, vessel: VesselState): VesselDefinition {
  return definitionIn(draft.catalog, 'vessels', vessel.definitionId)
}

export function isClosedAgainstFilling(draft: Draft, vessel: VesselState): boolean {
  return vesselDefinitionOf(draft, vessel).lid?.mustBeOpenToFill === true && !vessel.isLidOpen
}

export function isInvolvedInPour(draft: Draft, vesselId: string): boolean {
  const pour = draft.state.pour
  return pour !== null && (pour.sourceId === vesselId || pour.targetId === vesselId)
}
