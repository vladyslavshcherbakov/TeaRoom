import type { Spot } from '../Definitions/RoomDefinition.ts'
import { puddleStrengthAfterSpill, wetMlAfterDrying } from '../Physics/Table.ts'
import type { DeepReadonly } from '../State/DeepReadonly.ts'
import type { SessionState, VesselState } from '../State/SessionState.ts'
import { note, type Draft } from './Draft.ts'
import { ritualPlaceOf } from './Reach.ts'

export function spill(draft: Draft, placeId: string, spilledAround: Spot | null, spilledMl: number, strength: number): void {
  if (spilledMl <= 0) return
  const existing = draft.state.puddles[placeId]
  const puddle = existing ?? { wetMl: 0, strength: 0, spilledAround }
  if (existing === undefined) {
    draft.state.puddles[placeId] = puddle
    note(draft, `a puddle starts on the ${placeId}${spilledAround === null ? '' : ` around (${spilledAround.x.toFixed(2)}, ${spilledAround.z.toFixed(2)})`}`)
  }
  puddle.strength = puddleStrengthAfterSpill(puddle.wetMl, puddle.strength, spilledMl, strength)
  puddle.wetMl += spilledMl
}

export function placeWhereAPourSpills(draft: Draft, target: VesselState | undefined): { placeId: string; spilledAround: Spot | null } {
  if (target?.location.kind === 'onSurface') return { placeId: target.location.spot.placeId, spilledAround: target.location.spot }
  return { placeId: draft.state.keeper.placeId ?? ritualPlaceOf(draft), spilledAround: null }
}

export function dryThePuddles(draft: Draft, seconds: number): void {
  for (const [placeId, puddle] of Object.entries(draft.state.puddles)) {
    puddle.wetMl = wetMlAfterDrying(puddle.wetMl, seconds)
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

