import type { ReplyKind } from './Conversation.ts'

export type HeatRange = { readonly from: number; readonly to: number }

export type TeaDefinition = {
  readonly id: string
  readonly strengthens: ReplyKind
  readonly waterHeat: HeatRange
  readonly steepShare: HeatRange
}

export type BowlDefinition = {
  readonly id: string
}
