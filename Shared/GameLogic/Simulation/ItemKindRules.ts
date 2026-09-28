import type { TapDefinition } from '../Definitions/RoomDefinition.ts'
import type { RunningWaterState } from '../State/SessionState.ts'
import type { Draft } from './Draft.ts'
import type { Refusal } from '../../Engine/Commands.ts'
import type { RefusalReason } from './TeaEvent.ts'

export type ItemKindRules = {
  readonly canSitOnTheHeater: (draft: Draft, itemId: string) => boolean
  readonly isMadeForTheHeater: (draft: Draft, itemId: string) => boolean
  readonly describeOnTheHeater: (draft: Draft, itemId: string) => string
  readonly heatOnTheWorkingHeater: (draft: Draft, itemId: string, seconds: number) => void
  readonly takeOffTheHeater: (draft: Draft, itemId: string) => void
  readonly runTheTapOnto: ((draft: Draft, itemId: string, runningWater: RunningWaterState, tap: TapDefinition, seconds: number) => void) | null
  readonly liftOutOfTheSink: (draft: Draft, itemId: string) => void
  readonly takeIntoAHand: (draft: Draft, itemId: string) => 'whole' | 'crumbled'
  readonly refusalToHold: (draft: Draft, itemId: string) => Refusal<RefusalReason> | null
  readonly isClosedAgainstTheTap: (draft: Draft, itemId: string) => boolean
}
