import type { Atmosphere } from '../Definitions/Atmosphere.ts'
import type { Leaves } from '../Physics/Brewing.ts'
import type { Liquid } from '../Physics/Liquid.ts'

export type Phase = 'settingUp' | 'ritual' | 'resting' | 'ended'

export type VesselState = {
  id: string
  definitionId: string
  liquid: Liquid
  leaves: Leaves | null
  isLidOpen: boolean
}

export type HeaterState = {
  definitionId: string
  isOn: boolean
  vesselIdOnTop: string | null
  hasAnnouncedTargetTemperature: boolean
}

export type CaddyState = {
  teaId: string | null
  grams: number
  isOpen: boolean
}

export type SpoonState = {
  grams: number
  capacityGrams: number
}

export type PourState = {
  sourceId: string
  targetId: string | null
  tiltDegrees: number
  streamOnTargetFraction: number
  pouredMl: number
  spilledMl: number
  hasOverflowed: boolean
  hasRunDry: boolean
}

export type FigurineState = {
  id: string
  satisfaction: number
  wasOfferedTeaThisRitual: boolean
}

export type GodsJudgementsMade = {
  water: boolean
  firstSip: boolean
}

export type SessionState = {
  phase: Phase
  elapsedSeconds: number
  roomId: string
  atmosphere: Atmosphere
  teaId: string | null
  vessels: Record<string, VesselState>
  heater: HeaterState
  caddy: CaddyState
  spoon: SpoonState
  pour: PourState | null
  figurines: Record<string, FigurineState>
  tableWetMl: number
  godsSatisfaction: number
  godsJudgementsMade: GodsJudgementsMade
}
