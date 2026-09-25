import type { TapDefinition } from '../Definitions/RoomDefinition.ts'
import type { DeepReadonly } from '../State/DeepReadonly.ts'
import type { RunningWaterState, SessionState } from '../State/SessionState.ts'
import { clothRules } from './ClothRules.ts'
import type { Draft } from './Draft.ts'
import { spoonItemId } from './Reach.ts'
import { spoonRules } from './SpoonRules.ts'
import { vesselRules } from './VesselRules.ts'

export type ItemKind = 'vessel' | 'spoon' | 'cloth'

export type ItemKindRules = {
  readonly canSitOnTheHeater: (draft: Draft, itemId: string) => boolean
  readonly isMadeForTheHeater: (draft: Draft, itemId: string) => boolean
  readonly describeOnTheHeater: (draft: Draft, itemId: string) => string
  readonly heatOnTheWorkingHeater: (draft: Draft, itemId: string, seconds: number) => void
  readonly takeOffTheHeater: (draft: Draft, itemId: string) => void
  readonly runTheTapOnto: ((draft: Draft, itemId: string, runningWater: RunningWaterState, tap: TapDefinition, seconds: number) => void) | null
  readonly liftOutOfTheSink: (draft: Draft, itemId: string) => void
  readonly takeIntoAHand: (draft: Draft, itemId: string) => 'whole' | 'crumbled'
}

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
