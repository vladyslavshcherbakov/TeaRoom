import type { Catalog } from '../Definitions/Catalog.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'
import type { Leaves } from '../Physics/Brewing.ts'
import { water } from '../Physics/Liquid.ts'
import { initialSessionState } from './InitialState.ts'
import type { FigurineState, ItemLocation, PourState, PuddleState, RunningWaterState, SessionState, VesselState } from './SessionState.ts'

export const sessionStateVersion = 1

export type FittedSavedState =
  | { readonly kind: 'fits'; readonly state: SessionState; readonly changes: readonly string[] }
  | { readonly kind: 'doesNotFit'; readonly problems: readonly string[] }

type Shape = { readonly [key: string]: unknown }

const leavesShape: Leaves = { teaId: '', grams: 0, isSteeping: false, isStirredByTheBoil: false, steepedSeconds: 0 }
const pourShape: PourState = { sourceId: '', targetId: null, tiltDegrees: 0, streamOnTargetFraction: 0, missedStreamLandsAt: null, pouredMl: 0, spilledMl: 0, hasOverflowed: false, hasRunDry: false }
const runningWaterShape: RunningWaterState = { openedAtSeconds: 0, drainedSinceOpenedMl: 0, filledMl: 0, drainedMl: 0, hasOverflowed: false, isRunningOverTheLid: false }
const vesselShape: VesselState = { id: '', definitionId: '', liquid: water(0, 0), leaves: null, isLidOpen: false, shellHeat: 0, location: { kind: 'gone' } }
const puddleShape: PuddleState = { wetMl: 0, strength: 0, spilledAround: null }
const spotShape: Spot = { placeId: '', x: 0, y: 0, z: 0 }

export function fittedSavedState(catalog: Catalog, saved: unknown, savedVersion: number): FittedSavedState {
  if (savedVersion !== sessionStateVersion) return { kind: 'doesNotFit', problems: [`the saved state is version ${savedVersion}, the game reads version ${sessionStateVersion}`] }
  if (!isShape(saved)) return { kind: 'doesNotFit', problems: ['the saved state is not an object'] }
  const roomId = saved['roomId']
  if (typeof roomId !== 'string' || catalog.rooms[roomId] === undefined) return { kind: 'doesNotFit', problems: [`the saved room ${String(roomId)} is not in the catalog`] }
  const fresh = initialSessionState(catalog, roomId)
  const problems = shapeProblemsOf(fresh, saved)
  if (problems.length > 0) return { kind: 'doesNotFit', problems }
  const state = structuredClone(saved) as SessionState
  const changes = [...fitTheVessels(state, fresh), ...fitTheFigurines(state, fresh)]
  const places = new Set(catalog.rooms[roomId]?.places ?? [])
  problems.push(...placeProblemsOf(state, places), ...handProblemsOf(state))
  if (state.teaId !== null && catalog.teas[state.teaId] === undefined) problems.push(`the saved tea ${state.teaId} is not in the catalog`)
  if (problems.length > 0) return { kind: 'doesNotFit', problems }
  changes.push(...dropPuddlesOnLostPlaces(state, places))
  return { kind: 'fits', state, changes }
}

function shapeProblemsOf(fresh: SessionState, saved: Shape): string[] {
  const problems = shapeProblems({ ...fresh, vessels: {}, figurines: {}, puddles: {} }, saved, 'state')
  if (problems.length > 0) return problems
  const savedState = saved as SessionState
  for (const [id, vessel] of Object.entries(savedState.vessels)) {
    problems.push(...shapeProblems(vesselShape, vessel, `state.vessels.${id}`))
    if (vessel.leaves !== null) problems.push(...shapeProblems(leavesShape, vessel.leaves, `state.vessels.${id}.leaves`))
  }
  for (const [id, figurine] of Object.entries(savedState.figurines)) problems.push(...shapeProblems(figurineShape(id), figurine, `state.figurines.${id}`))
  for (const [placeId, puddle] of Object.entries(savedState.puddles)) problems.push(...shapeProblems(puddleShape, puddle, `state.puddles.${placeId}`))
  if (savedState.pour !== null) problems.push(...shapeProblems(pourShape, savedState.pour, 'state.pour'))
  if (savedState.sink.runningWater !== null) problems.push(...shapeProblems(runningWaterShape, savedState.sink.runningWater, 'state.sink.runningWater'))
  for (const [owner, location] of locationsIn(savedState)) problems.push(...locationProblems(owner, location))
  return problems
}

function shapeProblems(expected: unknown, actual: unknown, path: string): string[] {
  if (expected === null || expected === undefined) return []
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return [`${path} is not a list of ${expected.length}`]
    return expected.flatMap((item, index) => shapeProblems(item, actual[index], `${path}[${index}]`))
  }
  if (!isShape(expected)) return typeof actual === typeof expected ? [] : [`${path} is not a ${typeof expected}`]
  if (!isShape(actual)) return [`${path} is not an object`]
  if ('kind' in expected && actual['kind'] !== expected['kind']) return []
  return Object.entries(expected).flatMap(([key, value]) => shapeProblems(value, actual[key], `${path}.${key}`))
}

function figurineShape(id: string): FigurineState {
  return { id, satisfaction: 0, wasOfferedTeaThisRitual: false }
}

function locationProblems(owner: string, location: ItemLocation): string[] {
  switch (location.kind) {
    case 'onSurface':
      return shapeProblems(spotShape, location.spot, `${owner}'s spot`)
    case 'inHand':
      return location.handIndex === 0 || location.handIndex === 1 ? [] : [`${owner} is held in a hand that does not exist, ${String(location.handIndex)}`]
    case 'gone':
      return []
    default:
      return [`${owner} lies in an unknown kind of place, ${String((location as { kind: unknown }).kind)}`]
  }
}

function handProblemsOf(state: SessionState): string[] {
  const itemIds = new Set([...Object.keys(state.vessels), 'spoon', 'cloth'])
  return state.keeper.hands.flatMap((itemId, handIndex) => (itemId === null || itemIds.has(itemId) ? [] : [`hand ${handIndex} holds ${itemId}, which the room does not have`]))
}

function placeProblemsOf(state: SessionState, places: ReadonlySet<string>): string[] {
  return locationsIn(state).flatMap(([owner, location]) => (location.kind === 'onSurface' && !places.has(location.spot.placeId) ? [`${owner} stands on ${location.spot.placeId}, which the room no longer has`] : []))
}

function locationsIn(state: SessionState): [string, ItemLocation][] {
  return [...Object.values(state.vessels).map((vessel): [string, ItemLocation] => [vessel.id, vessel.location]), ['spoon', state.spoon.location], ['cloth', state.cloth.location]]
}

function fitTheVessels(state: SessionState, fresh: SessionState): string[] {
  const changes: string[] = []
  for (const vessel of Object.values(state.vessels)) {
    const freshVessel = fresh.vessels[vessel.id]
    if (freshVessel !== undefined && freshVessel.definitionId === vessel.definitionId) continue
    forgetTheVessel(state, vessel.id)
    changes.push(`${vessel.id} (${vessel.definitionId}) is no longer in the room and is left out`)
  }
  for (const vessel of Object.values(fresh.vessels)) {
    if (state.vessels[vessel.id] !== undefined) continue
    state.vessels[vessel.id] = vessel
    changes.push(`${vessel.id} (${vessel.definitionId}) is new in the room and stands at its place on the ${vessel.location.kind === 'onSurface' ? vessel.location.spot.placeId : 'floor'}`)
  }
  return changes
}

function forgetTheVessel(state: SessionState, vesselId: string): void {
  delete state.vessels[vesselId]
  state.keeper.hands = [state.keeper.hands[0] === vesselId ? null : state.keeper.hands[0], state.keeper.hands[1] === vesselId ? null : state.keeper.hands[1]]
  if (state.heater.itemIdOnTop === vesselId) state.heater.itemIdOnTop = null
  if (state.sink.itemIdInside === vesselId) state.sink.itemIdInside = null
  if (state.pour !== null && (state.pour.sourceId === vesselId || state.pour.targetId === vesselId)) state.pour = null
}

function fitTheFigurines(state: SessionState, fresh: SessionState): string[] {
  const changes: string[] = []
  for (const id of Object.keys(state.figurines)) {
    if (fresh.figurines[id] !== undefined) continue
    delete state.figurines[id]
    changes.push(`the figurine ${id} is no longer in the room and is left out`)
  }
  for (const [id, figurine] of Object.entries(fresh.figurines)) {
    if (state.figurines[id] !== undefined) continue
    state.figurines[id] = figurine
    changes.push(`the figurine ${id} is new in the room`)
  }
  return changes
}

function dropPuddlesOnLostPlaces(state: SessionState, places: ReadonlySet<string>): string[] {
  const changes: string[] = []
  for (const placeId of Object.keys(state.puddles)) {
    if (places.has(placeId)) continue
    delete state.puddles[placeId]
    changes.push(`the puddle on ${placeId} is left out, since the room no longer has that place`)
  }
  return changes
}

function isShape(value: unknown): value is Shape {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
