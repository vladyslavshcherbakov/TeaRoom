import type { Draft } from './Draft.ts'
import { rulesFor } from './ItemKinds.ts'
import { liftOutOfTheSink } from './SinkCommands.ts'

export function liftTheItem(draft: Draft, itemId: string): 'whole' | 'crumbled' {
  if (rulesFor(draft.state, itemId)?.takeIntoAHand(draft, itemId) === 'crumbled') return 'crumbled'
  liftOutOfTheSink(draft, itemId)
  return 'whole'
}
