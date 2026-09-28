import type { DeepReadonly } from '../../Engine/DeepReadonly.ts'
import type { SessionState } from '../State/SessionState.ts'
import { spoonItemId } from '../State/WhereItemsAre.ts'
import { clothRules } from './ClothRules.ts'
import type { Draft } from './Draft.ts'
import type { ItemKindRules } from './ItemKindRules.ts'
import { spoonRules } from './SpoonRules.ts'
import { vesselRules } from './VesselRules.ts'

export type ItemKind = 'vessel' | 'spoon' | 'cloth'

const rulesByKind: Readonly<Record<ItemKind, ItemKindRules>> = { vessel: vesselRules, spoon: spoonRules, cloth: clothRules }

export function itemKindOf(state: DeepReadonly<SessionState>, itemId: string): ItemKind | undefined {
  if (itemId === spoonItemId) return 'spoon'
  if (state.cloths[itemId] !== undefined) return 'cloth'
  return state.vessels[itemId] === undefined ? undefined : 'vessel'
}

export function rulesFor(state: DeepReadonly<SessionState>, itemId: string): ItemKindRules | undefined {
  const kind = itemKindOf(state, itemId)
  return kind === undefined ? undefined : rulesByKind[kind]
}

export function describeOnTheHeater(draft: Draft, itemId: string): string {
  return rulesFor(draft.state, itemId)?.describeOnTheHeater(draft, itemId) ?? itemId
}
