import type { Atmosphere } from '../Definitions/Atmosphere.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'
import type { Leaves } from '../Chemistry/Brewing.ts'
import type { Liquid } from '../Chemistry/Liquid.ts'

export type HandIndex = 0 | 1 | 2

export type ItemLocation =
  | { kind: 'onSurface'; spot: Spot }
  | { kind: 'onTheHeater'; spot: Spot }
  | { kind: 'inTheSink'; spot: Spot }
  | { kind: 'inHand'; handIndex: HandIndex }
  | { kind: 'gone' }

export type PlayerState = {
  placeId: string | null
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

export type HeaterMode = { kind: 'off' } | { kind: 'byHand'; holdsTheThermostatsTarget: boolean } | { kind: 'thermostat'; isHeating: boolean }

export type HeaterState = {
  definitionId: string
  mode: HeaterMode
  thermostatTargetC: number
  switchedOnAtSeconds: number
  secondsHeatedByItemId: Record<string, number>
  secondsWasted: number
  secondsHeating: number
  hasAnnouncedBoilingAway: boolean
}

export type SpoonState = {
  gramsByTeaId: Record<string, number>
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
  soakingPuddleId: string | null
  location: ItemLocation
}

export type PourState = {
  sourceId: string
  targetId: string | null
  tiltDegrees: number
  highestTiltDegrees: number
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
  runningWater: RunningWaterState | null
  hasRunOverTheItemInside: boolean
}

export type FigurineState = {
  id: string
  satisfaction: number
  wasOfferedTeaThisRitual: boolean
}

export type PuddleState = {
  centre: Spot
  wetMl: number
  strength: number
  temperatureC: number
}

export type SessionState = {
  elapsedSeconds: number
  roomId: string
  atmosphere: Atmosphere
  player: PlayerState
  vessels: Record<string, VesselState>
  heater: HeaterState
  spoon: SpoonState
  cloths: Record<string, ClothState>
  pour: PourState | null
  sink: SinkState
  figurines: Record<string, FigurineState>
  puddles: Record<string, PuddleState>
  puddlesSpilled: number
}
