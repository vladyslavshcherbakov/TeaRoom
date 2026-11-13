import type { ActionRefused } from '../../Engine/Commands.ts'
import type { SteepVerdict, WaterVerdict } from '../State/TeahouseState.ts'
import type { TeahouseCommandType } from './TeahouseCommands.ts'

export type RefusalReason = 'notTheMoment' | 'unknownTea' | 'unknownBowl' | 'unknownPet' | 'replyNotOffered'

export type TeahouseEvent =
  | { readonly type: 'guestArrived'; readonly visitId: string }
  | { readonly type: 'kettleTakenOff'; readonly water: WaterVerdict }
  | { readonly type: 'steepPoured'; readonly steep: SteepVerdict; readonly cups: number }
  | { readonly type: 'teaServed'; readonly bowlId: string }
  | { readonly type: 'replied'; readonly replyId: string }
  | { readonly type: 'guestLeft'; readonly endingId: string }
  | { readonly type: 'petFed'; readonly petId: string }
  | { readonly type: 'eveningCame'; readonly day: number }
  | { readonly type: 'storyTold' }
  | ActionRefused<TeahouseCommandType, RefusalReason>
