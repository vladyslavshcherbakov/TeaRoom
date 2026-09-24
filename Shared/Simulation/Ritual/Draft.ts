import { definitionIn, type Catalog } from '../Definitions/Catalog.ts'
import type { TeaDefinition } from '../Definitions/TeaDefinition.ts'
import type { VesselDefinition } from '../Definitions/VesselDefinition.ts'
import { godsSatisfactionAfter, type GodsVerdict } from '../Judgement/GodsMood.ts'
import type { SessionState, VesselState } from '../State/SessionState.ts'
import type { Command } from './Command.ts'
import type { RefusalReason, RitualEvent } from './RitualEvent.ts'
import type { LogLine } from './RitualLog.ts'

export type Draft = {
  readonly state: SessionState
  readonly catalog: Catalog
  readonly events: RitualEvent[]
  readonly logLines: LogLine[]
}

export type Outcome = {
  readonly state: SessionState
  readonly events: readonly RitualEvent[]
  readonly logLines: readonly LogLine[]
}

export function startDraft(state: SessionState, catalog: Catalog): Draft {
  return { state: structuredClone(state), catalog, events: [], logLines: [] }
}

export function outcomeOf(draft: Draft): Outcome {
  return { state: draft.state, events: draft.events, logLines: draft.logLines }
}

export function note(draft: Draft, message: string): void {
  draft.logLines.push({ level: 'info', message })
}

export function noteDetail(draft: Draft, message: string): void {
  draft.logLines.push({ level: 'debug', message })
}

export function refuse(draft: Draft, command: Command, reason: RefusalReason, decidingValues = ''): void {
  const { type, ...commandValues } = command
  const values = decidingValues === '' ? '' : `, ${decidingValues}`
  note(draft, `${type} refused (${reason}): ${JSON.stringify(commandValues)}${values}`)
  draft.events.push({ type: 'actionRefused', command: type, reason })
}

export function letTheGodsJudge(draft: Draft, verdict: GodsVerdict | null): void {
  if (verdict === null) return
  const before = draft.state.godsSatisfaction
  draft.state.godsSatisfaction = godsSatisfactionAfter(before, verdict)
  const delta = draft.state.godsSatisfaction - before
  const softening = delta === verdict.delta ? '' : `, asked for ${signed(verdict.delta)}`
  note(draft, `gods ${before} → ${draft.state.godsSatisfaction} (${signed(delta)}${softening}): ${verdict.remark}`)
  draft.events.push({ type: 'godsMoodChanged', delta, satisfaction: draft.state.godsSatisfaction, remark: verdict.remark })
}

export function describeLiquid(vessel: VesselState): string {
  const { volumeMl, temperatureC, strength, bitterness } = vessel.liquid
  return `${vessel.id} ${volumeMl.toFixed(1)} ml at ${temperatureC.toFixed(1)} °C, strength ${strength.toFixed(0)}, bitterness ${bitterness.toFixed(0)}`
}

export function vesselDefinitionOf(draft: Draft, vessel: VesselState): VesselDefinition {
  return definitionIn(draft.catalog, 'vessels', vessel.definitionId)
}

export function isClosedAgainstFilling(draft: Draft, vessel: VesselState): boolean {
  return vesselDefinitionOf(draft, vessel).lid?.mustBeOpenToFill === true && !vessel.isLidOpen
}

export function chosenTea(draft: Draft): TeaDefinition | null {
  return draft.state.teaId === null ? null : definitionIn(draft.catalog, 'teas', draft.state.teaId)
}

export function isInvolvedInPour(draft: Draft, vesselId: string): boolean {
  const pour = draft.state.pour
  return pour !== null && (pour.sourceId === vesselId || pour.targetId === vesselId)
}

function signed(delta: number): string {
  return delta >= 0 ? `+${delta}` : String(delta)
}
