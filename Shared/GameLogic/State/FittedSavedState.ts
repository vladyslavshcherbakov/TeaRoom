import type { Catalog } from '../Definitions/Catalog.ts'
import { definitionIn } from '../../Engine/Catalog.ts'
import type { Atmosphere } from '../Definitions/Atmosphere.ts'
import type { RoomDefinition, Spot } from '../Definitions/RoomDefinition.ts'
import type { Leaves } from '../Chemistry/Brewing.ts'
import type { Liquid } from '../Chemistry/Liquid.ts'
import type { DeepReadonly } from '../../Engine/DeepReadonly.ts'
import { initialSessionState } from './InitialState.ts'
import { aBoolean, absentOr, aNumber, anObject, aRecordOf, aString, fittedSave, isAnObject, nullOr, type FittedSave, type ObjectShape } from '../../Engine/Save.ts'
import { carriedItemIdsIn, itemLocationIn, middleHandIndex, standingSpotOf } from './WhereItemsAre.ts'
import type { ClothState, FigurineState, HeaterState, ItemLocation, PlayerState, PourState, PuddleState, RunningWaterState, SessionState, SinkState, SpoonState, VesselState } from './SessionState.ts'

export const sessionStateVersion = 4

const aSpot = anObject<Spot>({ placeId: aString, x: aNumber, y: aNumber, z: aNumber, turnRadians: absentOr(aNumber) })

const aLiquid = anObject<Liquid>({ volumeMl: aNumber, temperatureC: aNumber, strength: aNumber, strengthByTeaId: aRecordOf(aNumber), bitterness: aNumber })

const someLeaves = anObject<Leaves>({ gramsByTeaId: aRecordOf(aNumber), isSteeping: aBoolean, isStirredByTheBoil: aBoolean, steepedSecondsByTeaId: aRecordOf(aNumber) })

const aVessel = anObject<VesselState>({
  id: aString,
  definitionId: aString,
  liquid: aLiquid,
  leaves: nullOr(someLeaves),
  isLidOpen: aBoolean,
  shellHeat: aNumber,
  hasOnlyBoiledDownSinceFull: aBoolean,
  location: aLocation,
})

const aHeater = anObject<HeaterState>({
  definitionId: aString,
  mode: aHeaterMode,
  thermostatTargetC: aNumber,
  switchedOnAtSeconds: aNumber,
  secondsHeatedByItemId: aRecordOf(aNumber),
  secondsWasted: aNumber,
  secondsHeating: aNumber,
  hasAnnouncedBoilingAway: aBoolean,
})

const aCloth = anObject<ClothState>({
  id: aString,
  wetMl: aNumber,
  teaStain: aNumber,
  charring: aNumber,
  wasBurntBeforeWashing: aBoolean,
  soakingPuddleId: nullOr(aString),
  location: aLocation,
})

const aPour = anObject<PourState>({
  sourceId: aString,
  targetId: nullOr(aString),
  tiltDegrees: aNumber,
  highestTiltDegrees: aNumber,
  streamOnTargetFraction: aNumber,
  missedStreamLandsAt: nullOr(aSpot),
  pouredMl: aNumber,
  spilledMl: aNumber,
  hasOverflowed: aBoolean,
  hasRunDry: aBoolean,
})

const someRunningWater = anObject<RunningWaterState>({
  openedAtSeconds: aNumber,
  drainedSinceOpenedMl: aNumber,
  filledMl: aNumber,
  drainedMl: aNumber,
  hasOverflowed: aBoolean,
  isRunningOverTheLid: aBoolean,
  hasRunOntoAnItem: aBoolean,
})

const sessionStateSchema = anObject<SessionState>({
  elapsedSeconds: aNumber,
  roomId: aString,
  atmosphere: anObject<Atmosphere>({ timeOfDay: aString, shareThroughTheTimeOfDay: aNumber, weather: aString }),
  player: anObject<PlayerState>({ placeId: nullOr(aString), hasAMiddleHand: aBoolean }),
  vessels: aRecordOf(aVessel),
  heater: aHeater,
  spoon: anObject<SpoonState>({ gramsByTeaId: aRecordOf(aNumber), capacityGrams: aNumber, charring: aNumber, location: aLocation }),
  cloths: aRecordOf(aCloth),
  pour: nullOr(aPour),
  sink: anObject<SinkState>({ runningWater: nullOr(someRunningWater), hasRunOverTheItemInside: aBoolean }),
  figurines: aRecordOf(anObject<FigurineState>({ id: aString, satisfaction: aNumber, wasOfferedTeaThisRitual: aBoolean })),
  puddles: aRecordOf(anObject<PuddleState>({ centre: aSpot, wetMl: aNumber, strength: aNumber, temperatureC: aNumber })),
  puddlesSpilled: aNumber,
})

export function fittedSavedState(catalog: Catalog, saved: unknown, savedVersion: number): FittedSave<SessionState> {
  return fittedSave({ version: sessionStateVersion, problemsBeforeTheSchema: (savedObject) => savedRoomProblemsOf(catalog, savedObject), schema: sessionStateSchema, problemsOf: (state) => stateProblemsOf(catalog, state) }, saved, savedVersion)
}

function savedRoomProblemsOf(catalog: Catalog, saved: ObjectShape): string[] {
  const roomId = saved['roomId']
  return typeof roomId === 'string' && catalog.rooms[roomId] !== undefined ? [] : [`the saved room ${String(roomId)} is not in the catalog`]
}

function stateProblemsOf(catalog: Catalog, state: SessionState): string[] {
  const room = definitionIn(catalog, 'rooms', state.roomId)
  return [
    ...roomContentProblemsOf(state, initialSessionState(catalog, state.roomId), room),
    ...placeProblemsOf(state, new Set(room.places)),
    ...handProblemsOf(state),
    ...referenceProblemsOf(state),
    ...unknownTeaProblemsOf(state, catalog),
  ]
}

function roomContentProblemsOf(state: SessionState, fresh: SessionState, room: RoomDefinition): string[] {
  const { timeOfDay, weather } = state.atmosphere
  return [
    ...differentItemsProblems('vessel', Object.values(state.vessels).map(vesselWithItsDefinition), Object.values(fresh.vessels).map(vesselWithItsDefinition)),
    ...differentItemsProblems('cloth', Object.keys(state.cloths), Object.keys(fresh.cloths)),
    ...differentItemsProblems('figurine', Object.keys(state.figurines), Object.keys(fresh.figurines)),
    ...(state.heater.definitionId === fresh.heater.definitionId ? [] : [`the saved heater is ${state.heater.definitionId}, and the room has ${fresh.heater.definitionId}`]),
    ...(room.timesOfDay.length === 0 || room.timesOfDay.includes(timeOfDay) ? [] : [`the room does not offer the time of day ${timeOfDay}`]),
    ...(room.weathers.length === 0 || room.weathers.includes(weather) ? [] : [`the room does not offer the weather ${weather}`]),
  ]
}

function vesselWithItsDefinition(vessel: DeepReadonly<VesselState>): string {
  return `${vessel.id} (${vessel.definitionId})`
}

function differentItemsProblems(kindOfItem: string, savedItems: readonly string[], roomItems: readonly string[]): string[] {
  const itemsTheSaveLacks = roomItems.filter((item) => !savedItems.includes(item)).map((item) => `the room has the ${kindOfItem} ${item}, which the save lacks`)
  const itemsTheRoomLacks = savedItems.filter((item) => !roomItems.includes(item)).map((item) => `the save has the ${kindOfItem} ${item}, which the room no longer has`)
  return [...itemsTheSaveLacks, ...itemsTheRoomLacks]
}

function handProblemsOf(state: SessionState): string[] {
  const itemIdsByHand = new Map<number, string[]>()
  for (const [itemId, location] of locationsIn(state)) {
    if (location.kind === 'inHand') itemIdsByHand.set(location.handIndex, [...(itemIdsByHand.get(location.handIndex) ?? []), itemId])
  }
  const crowdedHands = [...itemIdsByHand].filter(([, itemIds]) => itemIds.length > 1).map(([handIndex, itemIds]) => `hand ${handIndex} holds ${itemIds.join(' and ')} at once`)
  const middleHandItemIds = itemIdsByHand.get(middleHandIndex) ?? []
  const middleHandThatNeverGrew = !state.player.hasAMiddleHand && middleHandItemIds.length > 0 ? [`the middle hand holds ${middleHandItemIds.join(' and ')}, though it has not grown`] : []
  return [...crowdedHands, ...middleHandThatNeverGrew]
}

function referenceProblemsOf(state: SessionState): string[] {
  const pour = state.pour
  const pouredVesselIds = pour === null ? [] : [pour.sourceId, pour.targetId]
  const itemIdsOnTheHeater = locationsIn(state).filter(([, location]) => location.kind === 'onTheHeater').map(([itemId]) => itemId)
  const itemIdsInTheSink = locationsIn(state).filter(([, location]) => location.kind === 'inTheSink').map(([itemId]) => itemId)
  return [
    ...(itemIdsOnTheHeater.length > 1 ? [`the heater holds ${itemIdsOnTheHeater.join(' and ')} at once`] : []),
    ...(itemIdsInTheSink.length > 1 ? [`the sink holds ${itemIdsInTheSink.join(' and ')} at once`] : []),
    ...pouredVesselIds.flatMap((vesselId) => (vesselId === null || state.vessels[vesselId] !== undefined ? [] : [`the pour runs through ${vesselId}, which the room does not have`])),
  ]
}

function placeProblemsOf(state: SessionState, places: ReadonlySet<string>): string[] {
  const playerPlaceId = state.player.placeId
  const playerProblems = playerPlaceId === null || places.has(playerPlaceId) ? [] : [`the player stands at the ${playerPlaceId}, which the room no longer has`]
  const itemProblems = locationsIn(state).flatMap(([owner, location]) => {
    const spot = standingSpotOf(location)
    return spot === null || places.has(spot.placeId) ? [] : [`${owner} stands on ${spot.placeId}, which the room no longer has`]
  })
  const puddleProblems = Object.entries(state.puddles).filter(([, puddle]) => !places.has(puddle.centre.placeId)).map(([puddleId, puddle]) => `${puddleId} lies on ${puddle.centre.placeId}, which the room no longer has`)
  const soakingProblems = Object.values(state.cloths).flatMap((cloth) => (cloth.soakingPuddleId === null || state.puddles[cloth.soakingPuddleId] !== undefined ? [] : [`${cloth.id} soaks ${cloth.soakingPuddleId}, which is not spilled`]))
  return [...playerProblems, ...itemProblems, ...puddleProblems, ...soakingProblems]
}

function locationsIn(state: SessionState): [string, DeepReadonly<ItemLocation>][] {
  return carriedItemIdsIn(state).flatMap((itemId): [string, DeepReadonly<ItemLocation>][] => {
    const location = itemLocationIn(state, itemId)
    return location === undefined ? [] : [[itemId, location]]
  })
}

function unknownTeaProblemsOf(state: SessionState, catalog: Catalog): string[] {
  const heldTeas: [string, string][] = [
    ...Object.keys(state.spoon.gramsByTeaId).map((teaId): [string, string] => ['the spoon holds', teaId]),
    ...Object.values(state.vessels).flatMap((vessel) => Object.keys(vessel.leaves?.gramsByTeaId ?? {}).map((teaId): [string, string] => [`${vessel.id} holds leaves of`, teaId])),
    ...Object.values(state.vessels).flatMap((vessel) => Object.keys(vessel.liquid.strengthByTeaId).map((teaId): [string, string] => [`${vessel.id} holds a liquid of`, teaId])),
  ]
  return heldTeas.filter(([, teaId]) => catalog.teas[teaId] === undefined).map(([holder, teaId]) => `${holder} ${teaId}, which is not in the catalog`)
}

function aLocation(value: unknown, path: string): string[] {
  if (!isAnObject(value)) return [`${path} is not an object`]
  switch (value['kind']) {
    case 'onSurface':
    case 'onTheHeater':
    case 'inTheSink':
      return aSpot(value['spot'], `${path}.spot`)
    case 'inHand':
      return value['handIndex'] === 0 || value['handIndex'] === 1 || value['handIndex'] === 2 ? [] : [`${path} is a hand that does not exist, ${String(value['handIndex'])}`]
    case 'gone':
      return []
    default:
      return [`${path} is an unknown kind of place, ${String(value['kind'])}`]
  }
}

function aHeaterMode(value: unknown, path: string): string[] {
  if (!isAnObject(value)) return [`${path} is not an object`]
  switch (value['kind']) {
    case 'off':
      return []
    case 'byHand':
      return aBoolean(value['holdsTheThermostatsTarget'], `${path}.holdsTheThermostatsTarget`)
    case 'thermostat':
      return aBoolean(value['isHeating'], `${path}.isHeating`)
    default:
      return [`${path} is an unknown mode of the heater, ${String(value['kind'])}`]
  }
}
