import { definitionIn } from '../../Engine/Catalog.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'
import type { Liquid } from '../Chemistry/Liquid.ts'
import { distanceAcrossTheTop, doPuddlesTouch, isOnTheSameTop, puddleCentreAfterSpill, puddleRadiusMetres, puddleStrengthAfterSpill, puddleTemperatureAfterCooling, puddleTemperatureAfterSpill, wetMlAfterDrying } from '../Chemistry/Table.ts'
import type { DeepReadonly } from '../../Engine/DeepReadonly.ts'
import type { PuddleState, SessionState, VesselState } from '../State/SessionState.ts'
import { type Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'

export function spill(draft: Draft, spot: Spot, spilledMl: number, spilled: Liquid): void {
  if (spilledMl <= 0) return
  const puddleId = puddleIdUnder(draft.state, spot) ?? startAPuddle(draft, spot, spilled)
  const puddle = draft.state.puddles[puddleId]
  if (puddle === undefined) return
  addTo(puddle, spot, spilledMl, spilled.strength, spilled.temperatureC)
  mergeThePuddlesThatTouch(draft, puddleId)
}

export function doesAPourDrain(source: DeepReadonly<VesselState>, target: DeepReadonly<VesselState> | undefined): boolean {
  return target?.location.kind === 'inTheSink' || (target === undefined && source.location.kind === 'inTheSink')
}

export function dryThePuddles(draft: Draft, seconds: number): void {
  const ambientC = definitionIn(draft.catalog, 'rooms', draft.state.roomId).ambientTemperatureC
  for (const [puddleId, puddle] of Object.entries(draft.state.puddles)) {
    puddle.wetMl = wetMlAfterDrying(puddle.wetMl, puddle.temperatureC, ambientC, seconds)
    puddle.temperatureC = puddleTemperatureAfterCooling(puddle.temperatureC, ambientC, seconds)
    if (puddle.wetMl > 0) continue
    delete draft.state.puddles[puddleId]
    note(draft, `${puddleId} on the ${puddle.centre.placeId} is gone`)
  }
}

export function puddleIdUnder(state: DeepReadonly<SessionState>, spot: Spot): string | null {
  const puddlesHoldingTheSpot = Object.entries(state.puddles).filter(([, puddle]) => isOnTheSameTop(puddle.centre, spot) && distanceAcrossTheTop(puddle.centre, spot) <= puddleRadiusMetres(puddle.wetMl))
  const [nearest] = puddlesHoldingTheSpot.sort(([, first], [, second]) => distanceAcrossTheTop(first.centre, spot) - distanceAcrossTheTop(second.centre, spot))
  return nearest?.[0] ?? null
}

export function wetMlOnEveryPlace(state: DeepReadonly<SessionState>): number {
  return Object.values(state.puddles).reduce((total, puddle) => total + puddle.wetMl, 0)
}

export function wetMlAt(state: DeepReadonly<SessionState>, placeId: string): number {
  return Object.values(state.puddles).filter((puddle) => puddle.centre.placeId === placeId).reduce((total, puddle) => total + puddle.wetMl, 0)
}

function startAPuddle(draft: Draft, spot: Spot, spilled: Liquid): string {
  draft.state.puddlesSpilled += 1
  const puddleId = `puddle${draft.state.puddlesSpilled}`
  draft.state.puddles[puddleId] = { centre: spot, wetMl: 0, strength: 0, temperatureC: spilled.temperatureC }
  note(draft, `${puddleId} starts on the ${spot.placeId} around (${spot.x.toFixed(2)}, ${spot.z.toFixed(2)})`)
  return puddleId
}

function addTo(puddle: PuddleState, spot: Spot, spilledMl: number, spilledStrength: number, spilledTemperatureC: number): void {
  const wetMlAfter = puddle.wetMl + spilledMl
  const shareOfTheNewWater = spilledMl / wetMlAfter
  puddle.centre = puddleCentreAfterSpill(puddle.centre, spot, shareOfTheNewWater)
  puddle.strength = puddleStrengthAfterSpill(puddle.wetMl, puddle.strength, spilledMl, spilledStrength)
  puddle.temperatureC = puddleTemperatureAfterSpill(puddle.wetMl, puddle.temperatureC, spilledMl, spilledTemperatureC)
  puddle.wetMl = wetMlAfter
}

function mergeThePuddlesThatTouch(draft: Draft, grownPuddleId: string): void {
  const grown = draft.state.puddles[grownPuddleId]
  if (grown === undefined) return
  const [touchedId, touched] = Object.entries(draft.state.puddles).find(([puddleId, other]) => puddleId !== grownPuddleId && doPuddlesTouch(grown, other)) ?? []
  if (touchedId === undefined || touched === undefined) return
  const [keptId, kept, goneId, gone] = grown.wetMl >= touched.wetMl ? [grownPuddleId, grown, touchedId, touched] : [touchedId, touched, grownPuddleId, grown]
  addTo(kept, gone.centre, gone.wetMl, gone.strength, gone.temperatureC)
  delete draft.state.puddles[goneId]
  for (const cloth of Object.values(draft.state.cloths)) if (cloth.soakingPuddleId === goneId) cloth.soakingPuddleId = keptId
  note(draft, `${goneId} runs into ${keptId} on the ${kept.centre.placeId}, which holds ${kept.wetMl.toFixed(1)} ml`)
  mergeThePuddlesThatTouch(draft, keptId)
}
