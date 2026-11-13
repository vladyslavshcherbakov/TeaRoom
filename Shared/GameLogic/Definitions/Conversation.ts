export const replyKinds = ['ask', 'sympathise', 'object', 'advise'] as const

export type ReplyKind = (typeof replyKinds)[number]

export const feelings = ['trust', 'resolve', 'attachment'] as const

export type Feeling = (typeof feelings)[number]

export type Feelings = Record<Feeling, number>

export type FeelingChange = { readonly feeling: Feeling; readonly by: number }

export type Condition =
  | { readonly kind: 'always' }
  | { readonly kind: 'feelingAtLeast'; readonly feeling: Feeling; readonly value: number }
  | { readonly kind: 'knows'; readonly fact: string }
  | { readonly kind: 'isAReturnVisit' }
  | { readonly kind: 'not'; readonly condition: Condition }
  | { readonly kind: 'all'; readonly conditions: readonly Condition[] }

export type AfterAReply = { readonly kind: 'exchange'; readonly exchangeId: string } | { readonly kind: 'ending'; readonly endingId: string }

export type ReplyOutcome = {
  readonly when: Condition
  readonly answer: string
  readonly mood: string
  readonly changes: readonly FeelingChange[]
  readonly learns: readonly string[]
  readonly then: AfterAReply
}

export type ReplyDefinition = {
  readonly id: string
  readonly kind: ReplyKind
  readonly says: string
  readonly shownWhen: Condition
  readonly outcomes: readonly ReplyOutcome[]
}

export type ExchangeDefinition = {
  readonly prompt: string | null
  readonly whispers: Readonly<Record<string, string>>
  readonly replies: readonly ReplyDefinition[]
}

export type BowlRemark = {
  readonly line: string
  readonly changes: readonly FeelingChange[]
}

export type Tomorrow = {
  readonly visitId: string
  readonly rumour: string
  readonly windowView: string
  readonly daysLater: number
}

export type EndingDefinition = {
  readonly parting: string
  readonly mood: string
  readonly leavesOnTheShelf: readonly string[]
  readonly takesFromTheShelf: readonly string[]
  readonly makesImmortal: readonly string[]
  readonly tomorrow: Tomorrow | null
}

export type VisitDefinition = {
  readonly guestId: string
  readonly opening: string
  readonly openingMood: string
  readonly bringsToTheCounter: string | null
  readonly trustOnArrival: number
  readonly isAReturn: boolean
  readonly bowlRemarks: Readonly<Record<string, BowlRemark>>
  readonly firstExchangeId: string
  readonly exchanges: Readonly<Record<string, ExchangeDefinition>>
  readonly endings: Readonly<Record<string, EndingDefinition>>
  readonly whenTheTeaRunsOut: string
}
