import { definitionIn, type Catalog } from '../Definitions/Catalog.ts'
import type { TeaDefinition } from '../Definitions/TeaDefinition.ts'
import type { VesselDefinition } from '../Definitions/VesselDefinition.ts'
import { godsSatisfactionAfter, type GodsVerdict } from '../Judgement/GodsMood.ts'
import type { SessionState, VesselState } from '../State/SessionState.ts'
import type { Command } from './Command.ts'
import type { RefusalReason, RitualEvent } from './RitualEvent.ts'

export type Draft = {
  readonly state: SessionState
  readonly catalog: Catalog
  readonly events: RitualEvent[]
}

export type Outcome = {
  readonly state: SessionState
  readonly events: readonly RitualEvent[]
}

export function startDraft(state: SessionState, catalog: Catalog): Draft {
  return { state: structuredClone(state), catalog, events: [] }
}

export function outcomeOf(draft: Draft): Outcome {
  return { state: draft.state, events: draft.events }
}

export function refuse(draft: Draft, command: Command, reason: RefusalReason): void {
  draft.events.push({ type: 'actionRefused', command: command.type, reason })
}

export function letTheGodsJudge(draft: Draft, verdict: GodsVerdict | null): void {
  if (verdict === null) return
  const before = draft.state.godsSatisfaction
  draft.state.godsSatisfaction = godsSatisfactionAfter(before, verdict)
  draft.events.push({
    type: 'godsMoodChanged',
    delta: draft.state.godsSatisfaction - before,
    satisfaction: draft.state.godsSatisfaction,
    remark: verdict.remark,
  })
}

export function vesselDefinitionOf(draft: Draft, vessel: VesselState): VesselDefinition {
  return definitionIn(draft.catalog, 'vessels', vessel.definitionId)
}

export function chosenTea(draft: Draft): TeaDefinition | null {
  return draft.state.teaId === null ? null : definitionIn(draft.catalog, 'teas', draft.state.teaId)
}

export function isInvolvedInPour(draft: Draft, vesselId: string): boolean {
  const pour = draft.state.pour
  return pour !== null && (pour.sourceId === vesselId || pour.targetId === vesselId)
}
