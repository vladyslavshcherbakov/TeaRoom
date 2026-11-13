import type { TeaDefinition } from '../Definitions/Brewing.ts'
import type { ExchangeDefinition, FeelingChange, ReplyDefinition, ReplyOutcome } from '../Definitions/Conversation.ts'
import { holds, type WhatTheGuestCarries } from './ConditionJudgement.ts'

export type WeighedReply = {
  readonly changes: readonly FeelingChange[]
  readonly wasSmoothedByAPet: boolean
  readonly wasStrengthenedByTheTea: boolean
}

export function repliesOffered(exchange: ExchangeDefinition, carried: WhatTheGuestCarries): readonly ReplyDefinition[] {
  return exchange.replies.filter((reply) => holds(reply.shownWhen, carried))
}

export function outcomeOf(reply: ReplyDefinition, carried: WhatTheGuestCarries): ReplyOutcome | null {
  return reply.outcomes.find((outcome) => holds(outcome.when, carried)) ?? null
}

export function isStrengthenedBy(tea: TeaDefinition, reply: ReplyDefinition): boolean {
  return tea.strengthens === reply.kind
}

export function weighedReply(outcome: ReplyOutcome, isStrengthened: boolean, canAPetSmoothIt: boolean, trustFromAStrengthenedReply: number): WeighedReply {
  const hurtsTrust = outcome.changes.some(lowersTrust)
  if (hurtsTrust && canAPetSmoothIt) return { changes: outcome.changes.filter((change) => !lowersTrust(change)), wasSmoothedByAPet: true, wasStrengthenedByTheTea: false }
  if (hurtsTrust || !isStrengthened) return { changes: outcome.changes, wasSmoothedByAPet: false, wasStrengthenedByTheTea: false }
  return { changes: [...outcome.changes, { feeling: 'trust', by: trustFromAStrengthenedReply }], wasSmoothedByAPet: false, wasStrengthenedByTheTea: true }
}

function lowersTrust(change: FeelingChange): boolean {
  return change.feeling === 'trust' && change.by < 0
}
