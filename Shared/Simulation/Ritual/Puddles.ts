import { definitionIn } from '../Definitions/Catalog.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'
import type { Liquid } from '../Physics/Liquid.ts'
import { puddleStrengthAfterSpill, puddleTemperatureAfterCooling, puddleTemperatureAfterSpill, wetMlAfterDrying } from '../Physics/Table.ts'
import type { DeepReadonly } from '../State/DeepReadonly.ts'
import type { SessionState, VesselState } from '../State/SessionState.ts'
import { note, type Draft } from './Draft.ts'
import { ritualPlaceOf } from './Reach.ts'

export function spill(draft: Draft, placeId: string, spilledAround: Spot | null, spilledMl: number, spilled: Liquid): void {
  if (spilledMl <= 0) return
  const existing = draft.state.puddles[placeId]
  const puddle = existing ?? { wetMl: 0, strength: 0, temperatureC: spilled.temperatureC, spilledAround }
  if (existing === undefined) {
    draft.state.puddles[placeId] = puddle
    note(draft, `a puddle starts on the ${placeId}${spilledAround === null ? '' : ` around (${spilledAround.x.toFixed(2)}, ${spilledAround.z.toFixed(2)})`}`)
  }
  puddle.strength = puddleStrengthAfterSpill(puddle.wetMl, puddle.strength, spilledMl, spilled.strength)
  puddle.temperatureC = puddleTemperatureAfterSpill(puddle.wetMl, puddle.temperatureC, spilledMl, spilled.temperatureC)
  puddle.wetMl += spilledMl
}

export function placeWhereAPourSpills(draft: Draft, target: VesselState | undefined): { placeId: string; spilledAround: Spot | null } {
  if (target?.location.kind === 'onSurface') return { placeId: target.location.spot.placeId, spilledAround: target.location.spot }
  return { placeId: draft.state.keeper.placeId ?? ritualPlaceOf(draft), spilledAround: null }
}

export function dryThePuddles(draft: Draft, seconds: number): void {
  const ambientC = definitionIn(draft.catalog, 'rooms', draft.state.roomId).ambientTemperatureC
  for (const [placeId, puddle] of Object.entries(draft.state.puddles)) {
    puddle.wetMl = wetMlAfterDrying(puddle.wetMl, puddle.temperatureC, ambientC, seconds)
    puddle.temperatureC = puddleTemperatureAfterCooling(puddle.temperatureC, ambientC, seconds)
    if (puddle.wetMl > 0) continue
    delete draft.state.puddles[placeId]
    note(draft, `the puddle on the ${placeId} is gone`)
  }
}

export function wetMlOnEveryPlace(state: DeepReadonly<SessionState>): number {
  return Object.values(state.puddles).reduce((total, puddle) => total + puddle.wetMl, 0)
}

export function wetMlAt(state: DeepReadonly<SessionState>, placeId: string): number {
  return state.puddles[placeId]?.wetMl ?? 0
}

