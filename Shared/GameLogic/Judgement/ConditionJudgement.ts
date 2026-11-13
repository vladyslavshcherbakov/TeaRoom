import type { Condition, Feelings } from '../Definitions/Conversation.ts'

export type WhatTheGuestCarries = {
  readonly feelings: Feelings
  readonly facts: readonly string[]
  readonly isAReturnVisit: boolean
}

export function holds(condition: Condition, carried: WhatTheGuestCarries): boolean {
  switch (condition.kind) {
    case 'always':
      return true
    case 'feelingAtLeast':
      return carried.feelings[condition.feeling] >= condition.value
    case 'knows':
      return carried.facts.includes(condition.fact)
    case 'isAReturnVisit':
      return carried.isAReturnVisit
    case 'not':
      return !holds(condition.condition, carried)
    case 'all':
      return condition.conditions.every((part) => holds(part, carried))
  }
}
