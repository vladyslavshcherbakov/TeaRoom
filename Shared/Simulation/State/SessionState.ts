import type { Atmosphere } from '../Definitions/Atmosphere.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'
import type { Leaves } from '../Physics/Brewing.ts'
import type { Liquid } from '../Physics/Liquid.ts'

export type Phase = 'settingUp' | 'ritual' | 'resting' | 'ended'

export type HandIndex = 0 | 1 | 2

export type ItemLocation = { kind: 'onSurface'; spot: Spot } | { kind: 'inHand'; handIndex: HandIndex } | { kind: 'gone' }

export type KeeperState = {
  placeId: string | null
  hands: [string | null, string | null, string | null]
  hasAMiddleHand: boolean
}

export type VesselState = {
  id: string
  definitionId: string
  liquid: Liquid
  leaves: Leaves | null
  isLidOpen: boolean
  shellHeat: number
  hasOnlyBoiledDownSinceFull: boolean
  location: ItemLocation
}

export type ThermostatState = {
  targetC: number
  isOn: boolean
}

export type HeaterState = {
  definitionId: string
  isOn: boolean
  thermostat: ThermostatState
  holdsTheThermostatsTarget: boolean
  switchedOnAtSeconds: number
  itemIdOnTop: string | null
  secondsHeatedByItemId: Record<string, number>
  secondsWasted: number
  secondsHeating: number
  hasAnnouncedTargetTemperature: boolean
  hasAnnouncedBoilingAway: boolean
}

export type SpoonState = {
  grams: number
  capacityGrams: number
  charring: number
  location: ItemLocation
}

export type ClothState = {
  id: string
  wetMl: number
  teaStain: number
  charring: number
  wasBurntBeforeWashing: boolean
  isSoakingThePuddle: boolean
  location: ItemLocation
}

export type PourState = {
  sourceId: string
  targetId: string | null
  tiltDegrees: number
  streamOnTargetFraction: number
  missedStreamLandsAt: Spot | null
  pouredMl: number
  spilledMl: number
  hasOverflowed: boolean
  hasRunDry: boolean
}

export type RunningWaterState = {
  openedAtSeconds: number
  drainedSinceOpenedMl: number
  filledMl: number
  drainedMl: number
  hasOverflowed: boolean
  isRunningOverTheLid: boolean
  hasRunOntoAnItem: boolean
}

export type SinkState = {
  itemIdInside: string | null
  runningWater: RunningWaterState | null
  hasRunOverTheItemInside: boolean
}

export type FigurineState = {
  id: string
  satisfaction: number
  wasOfferedTeaThisRitual: boolean
}

export type PuddleState = {
  wetMl: number
  strength: number
  spilledAround: Spot | null
}

export type SessionState = {
  phase: Phase
  elapsedSeconds: number
  roomId: string
  atmosphere: Atmosphere
  teaId: string | null
  keeper: KeeperState
  vessels: Record<string, VesselState>
  heater: HeaterState
  spoon: SpoonState
  cloths: Record<string, ClothState>
  pour: PourState | null
  sink: SinkState
  figurines: Record<string, FigurineState>
  puddles: Record<string, PuddleState>
}
