import type { AfterAReply, Condition, EndingDefinition, Feeling, FeelingChange, ReplyDefinition, ReplyKind, ReplyOutcome } from '../../GameLogic/GameLogic.ts'

type OutcomeDetails = {
  readonly when?: Condition
  readonly changes?: readonly FeelingChange[]
  readonly learns?: readonly string[]
}

type EndingDetails = Partial<Pick<EndingDefinition, 'leavesOnTheShelf' | 'takesFromTheShelf' | 'makesImmortal' | 'tomorrow'>>

export const always: Condition = { kind: 'always' }

export const onAReturnVisit: Condition = { kind: 'isAReturnVisit' }

export function knows(fact: string): Condition {
  return { kind: 'knows', fact }
}

export function trustAtLeast(value: number): Condition {
  return { kind: 'feelingAtLeast', feeling: 'trust', value }
}

export function both(first: Condition, second: Condition): Condition {
  return { kind: 'all', conditions: [first, second] }
}

export function grows(feeling: Feeling, by = 1): FeelingChange {
  return { feeling, by }
}

export function falls(feeling: Feeling): FeelingChange {
  return { feeling, by: -1 }
}

export function toExchange(exchangeId: string): AfterAReply {
  return { kind: 'exchange', exchangeId }
}

export function toEnding(endingId: string): AfterAReply {
  return { kind: 'ending', endingId }
}

export function outcome(answer: string, mood: string, then: AfterAReply, details: OutcomeDetails = {}): ReplyOutcome {
  return { when: details.when ?? always, answer, mood, changes: details.changes ?? [], learns: details.learns ?? [], then }
}

export function replyOf(kind: ReplyKind, id: string, says: string, outcomes: readonly ReplyOutcome[], shownWhen: Condition = always): ReplyDefinition {
  return { id, kind, says, shownWhen, outcomes }
}

export function ending(parting: string, mood: string, details: EndingDetails = {}): EndingDefinition {
  return { parting, mood, leavesOnTheShelf: details.leavesOnTheShelf ?? [], takesFromTheShelf: details.takesFromTheShelf ?? [], makesImmortal: details.makesImmortal ?? [], tomorrow: details.tomorrow ?? null }
}
