import type { Atmosphere } from '../Definitions/Atmosphere.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'
import type { HandIndex } from '../State/SessionState.ts'
import type { OfferingResponse } from '../Judgement/OfferingJudgement.ts'
import type { TasteVerdict } from '../Judgement/TasteJudgement.ts'
import type { WaterJudgement } from '../Judgement/WaterJudgement.ts'
import type { Command } from './Command.ts'

export type RefusalReason =
  | 'ritualNotStarted'
  | 'ritualAlreadyStarted'
  | 'ritualInProgress'
  | 'ritualIsOver'
  | 'sessionEnded'
  | 'unknownTea'
  | 'unknownVessel'
  | 'unknownFigurine'
  | 'notAvailableInThisRoom'
  | 'vesselHasNoLid'
  | 'lidAlreadyOpen'
  | 'lidAlreadyClosed'
  | 'lidClosed'
  | 'cannotSitOnHeater'
  | 'tooHotToHold'
  | 'heaterOccupied'
  | 'heaterAlreadyOn'
  | 'heaterAlreadyOff'
  | 'alreadyPouring'
  | 'notPouring'
  | 'cannotPourIntoItself'
  | 'sourceIsEmpty'
  | 'vesselIsOnTheHeater'
  | 'vesselIsBeingPoured'
  | 'caddyIsEmpty'
  | 'spoonIsFull'
  | 'spoonIsEmpty'
  | 'cannotHoldLeaves'
  | 'notDrinkable'
  | 'cupIsEmpty'
  | 'figurineAlreadyOffered'
  | 'unknownPlace'
  | 'unknownItem'
  | 'outOfReach'
  | 'notAtThatPlace'
  | 'handsFull'
  | 'notInHand'
  | 'alreadyInHand'
  | 'noTapInThisRoom'
  | 'sinkOccupied'
  | 'cannotGoInTheSink'
  | 'tapAlreadyOn'
  | 'tapAlreadyOff'
  | 'tableIsDry'
  | 'clothIsAlreadySoaking'
  | 'vesselIsInTheSink'
  | 'burntAway'

export type RitualEvent =
  | { readonly type: 'ritualBegan'; readonly teaId: string }
  | { readonly type: 'atmosphereChanged'; readonly atmosphere: Atmosphere }
  | { readonly type: 'actionRefused'; readonly command: Command['type']; readonly reason: RefusalReason }
  | { readonly type: 'keeperMoved'; readonly placeId: string | null }
  | { readonly type: 'pickedUp'; readonly itemId: string; readonly handIndex: HandIndex }
  | { readonly type: 'putDown'; readonly itemId: string; readonly spot: Spot }
  | { readonly type: 'vesselLidOpened'; readonly vesselId: string }
  | { readonly type: 'vesselLidClosed'; readonly vesselId: string }
  | { readonly type: 'placedOnHeater'; readonly itemId: string }
  | { readonly type: 'takenOffHeater'; readonly itemId: string; readonly waterJudgement: WaterJudgement | null }
  | { readonly type: 'heaterSwitchedOn' }
  | {
      readonly type: 'heaterSwitchedOff'
      readonly waterJudgement: WaterJudgement | null
      readonly onSeconds: number
      readonly kilowattHoursUsed: number
    }
  | { readonly type: 'targetTemperatureReached'; readonly vesselId: string }
  | { readonly type: 'pourStarted'; readonly sourceId: string; readonly targetId: string | null }
  | { readonly type: 'vesselOverflowed'; readonly vesselId: string }
  | {
      readonly type: 'pourFinished'
      readonly sourceId: string
      readonly targetId: string | null
      readonly pouredMl: number
      readonly spilledMl: number
    }
  | { readonly type: 'putInTheSink'; readonly itemId: string }
  | { readonly type: 'tapTurnedOn' }
  | { readonly type: 'tapTurnedOff'; readonly openSeconds: number; readonly drainedMl: number }
  | { readonly type: 'teaScooped'; readonly grams: number }
  | { readonly type: 'leavesAdded'; readonly vesselId: string; readonly grams: number }
  | { readonly type: 'brewStarted'; readonly vesselId: string; readonly waterJudgement: WaterJudgement }
  | { readonly type: 'teaTasted'; readonly cupId: string; readonly verdict: TasteVerdict; readonly cupHeldLeaves: boolean }
  | { readonly type: 'figurineAcceptedTea'; readonly figurineId: string; readonly response: OfferingResponse }
  | { readonly type: 'tableWiped'; readonly wetMlLeft: number }
  | { readonly type: 'clothLaidInThePuddle' }
  | { readonly type: 'burntClothWashedBackToNew' }
  | { readonly type: 'spoonCrumbled'; readonly gramsLost: number }
  | { readonly type: 'clothTakenOffTheHeater'; readonly charring: number }
  | { readonly type: 'ritualFinished' }
  | { readonly type: 'roomLeft' }
