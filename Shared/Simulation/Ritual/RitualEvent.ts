import type { Atmosphere } from '../Definitions/Atmosphere.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'
import type { HandIndex } from '../State/SessionState.ts'
import type { OfferingResponse } from '../Judgement/OfferingJudgement.ts'
import type { TasteVerdict } from '../Judgement/TasteJudgement.ts'
import type { Command } from './Command.ts'

export type RefusalReason =
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
  | 'thermostatAlreadyOn'
  | 'thermostatAlreadyOff'
  | 'thermostatOutOfRange'
  | 'alreadyPouring'
  | 'notPouring'
  | 'cannotPourIntoItself'
  | 'sourceIsEmpty'
  | 'vesselIsOnTheHeater'
  | 'vesselIsBeingPoured'
  | 'notACaddy'
  | 'caddyIsEmpty'
  | 'spoonIsFull'
  | 'spoonIsEmpty'
  | 'spoonHoldsAnotherTea'
  | 'cannotHoldLeaves'
  | 'holdsLeavesOfAnotherTea'
  | 'notDrinkable'
  | 'cupIsEmpty'
  | 'figurineAlreadyOffered'
  | 'unknownPlace'
  | 'unknownItem'
  | 'outOfReach'
  | 'notAtThatPlace'
  | 'handsFull'
  | 'aHandIsFree'
  | 'middleHandAlreadyGrown'
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
  | { readonly type: 'atmosphereChanged'; readonly atmosphere: Atmosphere }
  | { readonly type: 'actionRefused'; readonly command: Command['type']; readonly reason: RefusalReason }
  | { readonly type: 'keeperMoved'; readonly placeId: string | null }
  | { readonly type: 'pickedUp'; readonly itemId: string; readonly handIndex: HandIndex }
  | { readonly type: 'middleHandGrown'; readonly itemId: string }
  | { readonly type: 'middleHandVanished' }
  | { readonly type: 'putDown'; readonly itemId: string; readonly spot: Spot }
  | { readonly type: 'vesselLidOpened'; readonly vesselId: string }
  | { readonly type: 'vesselLidClosed'; readonly vesselId: string }
  | { readonly type: 'placedOnHeater'; readonly itemId: string }
  | { readonly type: 'takenOffHeater'; readonly itemId: string }
  | { readonly type: 'heaterSwitchedOn' }
  | { readonly type: 'thermostatSet'; readonly targetC: number }
  | { readonly type: 'thermostatStarted'; readonly targetC: number }
  | {
      readonly type: 'heaterSwitchedOff'
      readonly onSeconds: number
      readonly kilowattHoursUsed: number
      readonly wastedSeconds: number
      readonly kilowattHoursWasted: number
      readonly secondsHeatedByItemId: Readonly<Record<string, number>>
    }
  | { readonly type: 'pourStarted'; readonly sourceId: string; readonly targetId: string | null }
  | { readonly type: 'vesselOverflowed'; readonly vesselId: string }
  | { readonly type: 'lastLeavesWashedOut'; readonly vesselId: string; readonly isACaddy: boolean }
  | { readonly type: 'houseRestocked'; readonly spoonReturned: boolean; readonly wasACaddyRefilled: boolean; readonly wasACaddyEmpty: boolean }
  | {
      readonly type: 'pourFinished'
      readonly sourceId: string
      readonly targetId: string | null
      readonly pouredMl: number
      readonly spilledMl: number
    }
  | { readonly type: 'putInTheSink'; readonly itemId: string }
  | { readonly type: 'tapTurnedOn' }
  | { readonly type: 'tapTurnedOff'; readonly openSeconds: number; readonly drainedMl: number; readonly hasRunOntoAnItem: boolean }
  | { readonly type: 'teaScooped'; readonly grams: number }
  | { readonly type: 'leavesAdded'; readonly vesselId: string; readonly grams: number }
  | { readonly type: 'brewStarted'; readonly vesselId: string }
  | { readonly type: 'teaTasted'; readonly cupId: string; readonly verdict: TasteVerdict; readonly cupHeldLeaves: boolean }
  | { readonly type: 'keeperDied'; readonly cupId: string }
  | { readonly type: 'figurineAcceptedTea'; readonly figurineId: string; readonly response: OfferingResponse }
  | { readonly type: 'tableWiped'; readonly placeId: string; readonly wetMlLeft: number }
  | { readonly type: 'clothLaidInThePuddle'; readonly clothId: string }
  | { readonly type: 'burntClothWashedBackToNew'; readonly clothId: string }
  | { readonly type: 'spoonCrumbled'; readonly gramsLost: number }
  | { readonly type: 'boiledDry'; readonly vesselId: string; readonly wasFullAndOnlyBoiledDown: boolean }
  | { readonly type: 'metalGlowsTooHotToHold'; readonly vesselId: string }
  | { readonly type: 'clothTakenOffTheHeater'; readonly clothId: string; readonly charring: number }
