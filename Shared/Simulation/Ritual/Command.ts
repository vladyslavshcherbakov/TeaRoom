import type { TimeOfDay, Weather } from '../Definitions/Atmosphere.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'

export type Command =
  | { readonly type: 'beginRitual'; readonly teaId: string }
  | { readonly type: 'chooseAtmosphere'; readonly timeOfDay: TimeOfDay; readonly weather: Weather }
  | { readonly type: 'standAt'; readonly placeId: string | null }
  | { readonly type: 'pickUp'; readonly itemId: string }
  | { readonly type: 'putDown'; readonly itemId: string; readonly spot: Spot }
  | { readonly type: 'openVesselLid'; readonly vesselId: string }
  | { readonly type: 'closeVesselLid'; readonly vesselId: string }
  | { readonly type: 'openCaddy' }
  | { readonly type: 'closeCaddy' }
  | { readonly type: 'placeOnHeater'; readonly vesselId: string }
  | { readonly type: 'switchHeaterOn' }
  | { readonly type: 'switchHeaterOff' }
  | { readonly type: 'startPouring'; readonly sourceId: string; readonly targetId: string | null }
  | { readonly type: 'adjustPour'; readonly tiltDegrees: number; readonly streamOnTargetFraction: number }
  | { readonly type: 'stopPouring' }
  | { readonly type: 'startFillingFromTap'; readonly vesselId: string }
  | { readonly type: 'stopFillingFromTap' }
  | { readonly type: 'scoopTea'; readonly depth: number }
  | { readonly type: 'tipSpoonInto'; readonly vesselId: string }
  | { readonly type: 'tasteCup'; readonly cupId: string }
  | { readonly type: 'offerCup'; readonly cupId: string; readonly figurineId: string }
  | { readonly type: 'wipeTable'; readonly strokeSpeedCmPerSecond: number; readonly coveredFraction: number }
  | { readonly type: 'finishRitual' }
  | { readonly type: 'leaveRoom' }

export type CommandOfType<Type extends Command['type']> = Extract<Command, { readonly type: Type }>
