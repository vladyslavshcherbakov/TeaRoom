import type { Catalog } from '../Definitions/Catalog.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'
import { dryLeaves, type Leaves } from '../Physics/Brewing.ts'
import { water } from '../Physics/Liquid.ts'
import { carriedItemIdsIn, itemLocationIn } from '../Ritual/Reach.ts'
import type { DeepReadonly } from './DeepReadonly.ts'
import { initialSessionState } from './InitialState.ts'
import type { ClothState, FigurineState, ItemLocation, PourState, PuddleState, RunningWaterState, SessionState, VesselState } from './SessionState.ts'

export const sessionStateVersion = 1

export type FittedSavedState =
  | { readonly kind: 'fits'; readonly state: SessionState; readonly changes: readonly string[] }
  | { readonly kind: 'doesNotFit'; readonly problems: readonly string[] }

type Shape = { readonly [key: string]: unknown }

type SaveMigration = (saved: Shape, catalog: Catalog) => { readonly migrated: Shape; readonly change: string } | null

const leavesShape: Leaves = dryLeaves('', 0)
const pourShape: PourState = { sourceId: '', targetId: null, tiltDegrees: 0, streamOnTargetFraction: 0, missedStreamLandsAt: null, pouredMl: 0, spilledMl: 0, hasOverflowed: false, hasRunDry: false }
const runningWaterShape: RunningWaterState = { openedAtSeconds: 0, drainedSinceOpenedMl: 0, filledMl: 0, drainedMl: 0, hasOverflowed: false, isRunningOverTheLid: false, hasRunOntoAnItem: false }
const vesselShape: VesselState = { id: '', definitionId: '', liquid: water(0, 0), leaves: null, isLidOpen: false, shellHeat: 0, hasOnlyBoiledDownSinceFull: false, location: { kind: 'gone' } }
const puddleShape: PuddleState = { wetMl: 0, strength: 0, temperatureC: 0, spilledAround: null }
const spotShape: Spot = { placeId: '', x: 0, y: 0, z: 0 }
const clothShape: ClothState = { id: '', wetMl: 0, teaStain: 0, charring: 0, wasBurntBeforeWashing: false, isSoakingThePuddle: false, location: { kind: 'gone' } }
const clothIdOfSavesWithOneCloth = 'cloth'
const migrationsOldestFirst: readonly SaveMigration[] = [withTheMiddleHand, withClothsById, withWhatTheHeaterAndTheTapRanOnto, withTheShareThroughTheTimeOfDay, withTheHeatersWastedSeconds, withTheThermostat, withTheHeaterHoldingTheTarget, withVesselsRememberingTheyWereFull, withPuddlesAtTheirTemperature]
const shareThroughTheTimeOfDayOfOlderSaves = 0.5

export function fittedSavedState(catalog: Catalog, saved: unknown, savedVersion: number): FittedSavedState {
  if (savedVersion !== sessionStateVersion) return { kind: 'doesNotFit', problems: [`the saved state is version ${savedVersion}, the game reads version ${sessionStateVersion}`] }
  if (!isShape(saved)) return { kind: 'doesNotFit', problems: ['the saved state is not an object'] }
  const changes: string[] = []
  const savedInTodaysShape = migrationsOldestFirst.reduce((shape, migrate) => {
    const migration = migrate(shape, catalog)
    if (migration === null) return shape
    changes.push(migration.change)
    return migration.migrated
  }, saved)
  const roomId = savedInTodaysShape['roomId']
  if (typeof roomId !== 'string' || catalog.rooms[roomId] === undefined) return { kind: 'doesNotFit', problems: [`the saved room ${String(roomId)} is not in the catalog`] }
  const fresh = initialSessionState(catalog, roomId)
  const problems = shapeProblemsOf(fresh, savedInTodaysShape)
  if (problems.length > 0) return { kind: 'doesNotFit', problems }
  const state = structuredClone(savedInTodaysShape) as SessionState
  changes.push(...fitTheVessels(state, fresh), ...fitTheCloths(state, fresh), ...fitTheFigurines(state, fresh))
  const places = new Set(catalog.rooms[roomId]?.places ?? [])
  problems.push(...placeProblemsOf(state, places), ...handProblemsOf(state))
  if (state.teaId !== null && catalog.teas[state.teaId] === undefined) problems.push(`the saved tea ${state.teaId} is not in the catalog`)
  if (problems.length > 0) return { kind: 'doesNotFit', problems }
  changes.push(...dropPuddlesOnLostPlaces(state, places))
  return { kind: 'fits', state, changes }
}

function shapeProblemsOf(fresh: SessionState, saved: Shape): string[] {
  const problems = shapeProblems({ ...fresh, vessels: {}, cloths: {}, figurines: {}, puddles: {} }, saved, 'state')
  if (problems.length > 0) return problems
  const savedState = saved as SessionState
  for (const [id, vessel] of Object.entries(savedState.vessels)) {
    problems.push(...shapeProblems(vesselShape, vessel, `state.vessels.${id}`))
    if (vessel.leaves !== null) problems.push(...shapeProblems(leavesShape, vessel.leaves, `state.vessels.${id}.leaves`))
  }
  for (const [id, cloth] of Object.entries(savedState.cloths)) problems.push(...shapeProblems(clothShape, cloth, `state.cloths.${id}`))
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

function locationProblems(owner: string, location: DeepReadonly<ItemLocation>): string[] {
  switch (location.kind) {
    case 'onSurface':
      return shapeProblems(spotShape, location.spot, `${owner}'s spot`)
    case 'inHand':
      return location.handIndex === 0 || location.handIndex === 1 || location.handIndex === 2 ? [] : [`${owner} is held in a hand that does not exist, ${String(location.handIndex)}`]
    case 'gone':
      return []
    default:
      return [`${owner} lies in an unknown kind of place, ${String((location as { kind: unknown }).kind)}`]
  }
}

function handProblemsOf(state: SessionState): string[] {
  const itemIds = new Set(carriedItemIdsIn(state))
  return state.keeper.hands.flatMap((itemId, handIndex) => (itemId === null || itemIds.has(itemId) ? [] : [`hand ${handIndex} holds ${itemId}, which the room does not have`]))
}

function placeProblemsOf(state: SessionState, places: ReadonlySet<string>): string[] {
  return locationsIn(state).flatMap(([owner, location]) => (location.kind === 'onSurface' && !places.has(location.spot.placeId) ? [`${owner} stands on ${location.spot.placeId}, which the room no longer has`] : []))
}

function locationsIn(state: SessionState): [string, DeepReadonly<ItemLocation>][] {
  return carriedItemIdsIn(state).flatMap((itemId): [string, DeepReadonly<ItemLocation>][] => {
    const location = itemLocationIn(state, itemId)
    return location === undefined ? [] : [[itemId, location]]
  })
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
  letGoOfTheItem(state, vesselId)
  if (state.pour !== null && (state.pour.sourceId === vesselId || state.pour.targetId === vesselId)) state.pour = null
}

function fitTheCloths(state: SessionState, fresh: SessionState): string[] {
  const changes: string[] = []
  for (const id of Object.keys(state.cloths)) {
    if (fresh.cloths[id] !== undefined) continue
    delete state.cloths[id]
    letGoOfTheItem(state, id)
    changes.push(`the cloth ${id} is no longer in the room and is left out`)
  }
  for (const cloth of Object.values(fresh.cloths)) {
    if (state.cloths[cloth.id] !== undefined) continue
    state.cloths[cloth.id] = cloth
    changes.push(`the cloth ${cloth.id} is new in the room and lies at its place on the ${cloth.location.kind === 'onSurface' ? cloth.location.spot.placeId : 'floor'}`)
  }
  return changes
}

function letGoOfTheItem(state: SessionState, itemId: string): void {
  const [firstHand, secondHand, middleHand] = state.keeper.hands
  state.keeper.hands = [firstHand === itemId ? null : firstHand, secondHand === itemId ? null : secondHand, middleHand === itemId ? null : middleHand]
  if (middleHand === itemId) state.keeper.hasAMiddleHand = false
  if (state.heater.itemIdOnTop === itemId) state.heater.itemIdOnTop = null
  if (state.sink.itemIdInside === itemId) state.sink.itemIdInside = null
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

function withTheMiddleHand(saved: Shape): ReturnType<SaveMigration> {
  const keeper = saved['keeper']
  if (!isShape(keeper) || !Array.isArray(keeper['hands']) || keeper['hands'].length !== 2) return null
  return {
    migrated: { ...saved, keeper: { ...keeper, hands: [...keeper['hands'], null], hasAMiddleHand: false } },
    change: 'the keeper, saved before the middle hand existed, gets an empty one that has not grown',
  }
}

function withClothsById(saved: Shape): ReturnType<SaveMigration> {
  const cloth = saved['cloth']
  if (!isShape(cloth) || saved['cloths'] !== undefined) return null
  const savedWithoutTheOneCloth = Object.fromEntries(Object.entries(saved).filter(([key]) => key !== 'cloth'))
  return {
    migrated: { ...savedWithoutTheOneCloth, cloths: { [clothIdOfSavesWithOneCloth]: { ...cloth, id: clothIdOfSavesWithOneCloth } } },
    change: `the one cloth of a save from before a room could hold several becomes the cloth "${clothIdOfSavesWithOneCloth}"`,
  }
}

function withWhatTheHeaterAndTheTapRanOnto(saved: Shape): ReturnType<SaveMigration> {
  const heater = saved['heater']
  const sink = saved['sink']
  const heaterWithItsRecord = isShape(heater) && heater['secondsHeatedByItemId'] === undefined ? { ...heater, secondsHeatedByItemId: {} } : heater
  const runningWater = isShape(sink) ? sink['runningWater'] : undefined
  const hasRunOntoAnItem = isShape(sink) && sink['itemIdInside'] !== null
  const sinkWithItsRecord = isShape(sink) && isShape(runningWater) && runningWater['hasRunOntoAnItem'] === undefined ? { ...sink, runningWater: { ...runningWater, hasRunOntoAnItem } } : sink
  if (heaterWithItsRecord === heater && sinkWithItsRecord === sink) return null
  return {
    migrated: { ...saved, heater: heaterWithItsRecord, sink: sinkWithItsRecord },
    change: `a save from before the heater and the tap remembered what they ran onto starts remembering now${sinkWithItsRecord === sink ? '' : `, and its running tap counts as having run onto ${hasRunOntoAnItem ? 'the item in the sink' : 'nothing'}`}`,
  }
}

function withTheShareThroughTheTimeOfDay(saved: Shape): ReturnType<SaveMigration> {
  const atmosphere = saved['atmosphere']
  if (!isShape(atmosphere) || atmosphere['shareThroughTheTimeOfDay'] !== undefined) return null
  return {
    migrated: { ...saved, atmosphere: { ...atmosphere, shareThroughTheTimeOfDay: shareThroughTheTimeOfDayOfOlderSaves } },
    change: `a save from before the light was kept stands halfway through its ${String(atmosphere['timeOfDay'])}`,
  }
}

function withTheHeatersWastedSeconds(saved: Shape): ReturnType<SaveMigration> {
  const heater = saved['heater']
  if (!isShape(heater) || heater['secondsWasted'] !== undefined) return null
  return {
    migrated: { ...saved, heater: { ...heater, secondsWasted: 0 } },
    change: 'a save from before the heater counted its wasted seconds starts counting them now',
  }
}

function withTheThermostat(saved: Shape, catalog: Catalog): ReturnType<SaveMigration> {
  const heater = saved['heater']
  if (!isShape(heater) || heater['thermostat'] !== undefined) return null
  const startsAtC = catalog.heaters[String(heater['definitionId'])]?.thermostat.startsAtC
  if (startsAtC === undefined) return null
  const elapsedSeconds = typeof saved['elapsedSeconds'] === 'number' ? saved['elapsedSeconds'] : 0
  const switchedOnAtSeconds = typeof heater['switchedOnAtSeconds'] === 'number' ? heater['switchedOnAtSeconds'] : elapsedSeconds
  const secondsHeating = heater['isOn'] === true ? elapsedSeconds - switchedOnAtSeconds : 0
  return {
    migrated: { ...saved, heater: { ...heater, thermostat: { targetC: startsAtC, isOn: false }, secondsHeating } },
    change: `a save from before the heater had a thermostat gets one set to ${startsAtC} °C and not working, and counts ${secondsHeating.toFixed(0)} s of heating so far`,
  }
}

function withTheHeaterHoldingTheTarget(saved: Shape): ReturnType<SaveMigration> {
  const heater = saved['heater']
  if (!isShape(heater) || heater['holdsTheThermostatsTarget'] !== undefined) return null
  return {
    migrated: { ...saved, heater: { ...heater, holdsTheThermostatsTarget: false } },
    change: 'a save from before the heater could hold the thermostat\'s target boils by hand as it did',
  }
}

function withVesselsRememberingTheyWereFull(saved: Shape): ReturnType<SaveMigration> {
  const vessels = saved['vessels']
  if (!isShape(vessels) || Object.values(vessels).every((vessel) => !isShape(vessel) || vessel['hasOnlyBoiledDownSinceFull'] !== undefined)) return null
  const remembering = Object.fromEntries(Object.entries(vessels).map(([id, vessel]) => [id, isShape(vessel) && vessel['hasOnlyBoiledDownSinceFull'] === undefined ? { ...vessel, hasOnlyBoiledDownSinceFull: false } : vessel]))
  return {
    migrated: { ...saved, vessels: remembering },
    change: 'a save from before the vessels remembered being full counts none of them as full',
  }
}

function withPuddlesAtTheirTemperature(saved: Shape, catalog: Catalog): ReturnType<SaveMigration> {
  const puddles = saved['puddles']
  const roomId = saved['roomId']
  const room = typeof roomId === 'string' ? catalog.rooms[roomId] : undefined
  if (!isShape(puddles) || room === undefined || Object.values(puddles).every((puddle) => !isShape(puddle) || puddle['temperatureC'] !== undefined)) return null
  const warmed = Object.fromEntries(Object.entries(puddles).map(([placeId, puddle]) => [placeId, isShape(puddle) && puddle['temperatureC'] === undefined ? { ...puddle, temperatureC: room.ambientTemperatureC } : puddle]))
  return {
    migrated: { ...saved, puddles: warmed },
    change: `a save from before the puddles had a temperature finds them at the room's ${room.ambientTemperatureC} °C`,
  }
}

function isShape(value: unknown): value is Shape {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
