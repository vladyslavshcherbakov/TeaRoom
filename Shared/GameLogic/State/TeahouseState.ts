import type { Feelings } from '../Definitions/Conversation.ts'

export type WaterVerdict = 'tooCool' | 'right' | 'scalding'

export type SteepVerdict = 'weak' | 'right' | 'bitter'

export type Brew = {
  readonly teaId: string
  readonly water: WaterVerdict
  readonly steep: SteepVerdict
  readonly cups: number
}

export type Heard = {
  readonly exchangeId: string
  readonly replyId: string
  readonly answer: string
  readonly wasSmoothedByAPet: boolean
  readonly wasStrengthenedByTheTea: boolean
}

export type Talk = {
  readonly brew: Brew
  readonly bowlId: string
  readonly bowlRemark: string | null
  cupsLeft: number
  exchangeId: string
  heard: Heard | null
  hasAPetSmoothedAMistake: boolean
}

export type Phase =
  | { readonly kind: 'dusk' }
  | { readonly kind: 'guestSpeaks' }
  | { readonly kind: 'choosingLeaf' }
  | { readonly kind: 'heatingWater'; readonly teaId: string; heat: number }
  | { readonly kind: 'steeping'; readonly teaId: string; readonly water: WaterVerdict; steepShare: number; isHeld: boolean }
  | { readonly kind: 'choosingBowl'; readonly brew: Brew }
  | { readonly kind: 'talking'; readonly talk: Talk }
  | { readonly kind: 'parting'; readonly talk: Talk; readonly endingId: string }
  | { readonly kind: 'feeding'; readonly endingId: string }
  | { readonly kind: 'night'; readonly endingId: string; readonly fedPetId: string }
  | { readonly kind: 'storyTold' }

export type PhaseKind = Phase['kind']

export type TeahouseState = {
  seconds: number
  day: number
  visitId: string
  rumour: string
  windowView: string
  mood: string
  feelings: Feelings
  facts: string[]
  whisperingPetId: string | null
  immortalPetIds: string[]
  shelf: string[]
  phase: Phase
}
