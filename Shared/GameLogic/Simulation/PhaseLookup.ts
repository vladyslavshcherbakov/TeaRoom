import { found, refusedWith, type Found } from '../../Engine/Commands.ts'
import { definitionIn } from '../../Engine/Catalog.ts'
import type { EndingDefinition, ExchangeDefinition, VisitDefinition } from '../Definitions/Conversation.ts'
import type { WhatTheGuestCarries } from '../Judgement/ConditionJudgement.ts'
import type { Phase, PhaseKind } from '../State/TeahouseState.ts'
import type { TeahouseDraft } from './TeahouseDraft.ts'

export function phaseOfKind<Kind extends PhaseKind>(draft: TeahouseDraft, kind: Kind): Found<Extract<Phase, { readonly kind: Kind }>, 'notTheMoment'> {
  const { phase } = draft.state
  if (phase.kind !== kind) return refusedWith('notTheMoment', `the phase is ${phase.kind}, the command needs ${kind}`)
  return found(phase as Extract<Phase, { readonly kind: Kind }>)
}

export function visitOf(draft: TeahouseDraft): VisitDefinition {
  return definitionIn(draft.catalog, 'visits', draft.state.visitId)
}

export function exchangeOf(draft: TeahouseDraft, exchangeId: string): ExchangeDefinition {
  return definitionIn({ exchanges: visitOf(draft).exchanges }, 'exchanges', exchangeId)
}

export function endingOf(draft: TeahouseDraft, endingId: string): EndingDefinition {
  return definitionIn({ endings: visitOf(draft).endings }, 'endings', endingId)
}

export function carriedBy(draft: TeahouseDraft): WhatTheGuestCarries {
  return { feelings: draft.state.feelings, facts: draft.state.facts, isAReturnVisit: visitOf(draft).isAReturn }
}
