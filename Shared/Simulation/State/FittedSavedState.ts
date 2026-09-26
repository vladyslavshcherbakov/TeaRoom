import type { Catalog } from '../Definitions/Catalog.ts'
import type { Atmosphere } from '../Definitions/Atmosphere.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'
import type { Leaves } from '../Physics/Brewing.ts'
import type { Liquid } from '../Physics/Liquid.ts'
import { carriedItemIdsIn, itemLocationIn, whereIs } from '../Ritual/Reach.ts'
import type { DeepReadonly } from './DeepReadonly.ts'
import { initialSessionState } from './InitialState.ts'
import type { ClothState, FigurineState, HeaterState, ItemLocation, KeeperState, PourState, PuddleState, RunningWaterState, SessionState, SinkState, SpoonState, ThermostatState, VesselState } from './SessionState.ts'

export const sessionStateVersion = 1

export type FittedSavedState =
  | { readonly kind: 'fits'; readonly state: SessionState; readonly changes: readonly string[] }
  | { readonly kind: 'doesNotFit'; readonly problems: readonly string[] }

type Shape = { readonly [key: string]: unknown }

type SaveMigration = (saved: Shape, catalog: Catalog) => { readonly migrated: Shape; readonly change: string } | null

const clothIdOfSavesWithOneCloth = 'cloth'
const migrationsOldestFirst: readonly SaveMigration[] = [withTheMiddleHand, withClothsById, withWhatTheHeaterAndTheTapRanOnto, withTheShareThroughTheTimeOfDay, withTheHeatersWastedSeconds, withTheThermostat, withTheHeaterHoldingTheTarget, withVesselsRememberingTheyWereFull, withPuddlesAtTheirTemperature, withTheTeaOnTheSpoon, withTheTeasOfEveryLiquid, withoutTheTargetTemperatureAnnounced, withoutTheRitualsPhase, withoutTheChosenTea]
const shareThroughTheTimeOfDayOfOlderSaves = 0.5

const aNumber = aValueOfType('number')
const aString = aValueOfType('string')
const aBoolean = aValueOfType('boolean')

const aSpot = anObject<Spot>({ placeId: aString, x: aNumber, y: aNumber, z: aNumber, turnRadians: absentOr(aNumber) })

const aLiquid = anObject<Liquid>({ volumeMl: aNumber, temperatureC: aNumber, strength: aNumber, strengthByTeaId: aRecordOf(aNumber), bitterness: aNumber })

const someLeaves = anObject<Leaves>({ teaId: aString, grams: aNumber, isSteeping: aBoolean, isStirredByTheBoil: aBoolean, steepedSeconds: aNumber })

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
  isOn: aBoolean,
  thermostat: anObject<ThermostatState>({ targetC: aNumber, isOn: aBoolean }),
  holdsTheThermostatsTarget: aBoolean,
  switchedOnAtSeconds: aNumber,
  itemIdOnTop: nullOr(aString),
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
  isSoakingThePuddle: aBoolean,
  location: aLocation,
})

const aPour = anObject<PourState>({
  sourceId: aString,
  targetId: nullOr(aString),
  tiltDegrees: aNumber,
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
  keeper: anObject<KeeperState>({ placeId: nullOr(aString), hands: aListOf([nullOr(aString), nullOr(aString), nullOr(aString)]), hasAMiddleHand: aBoolean }),
  vessels: aRecordOf(aVessel),
  heater: aHeater,
  spoon: anObject<SpoonState>({ grams: aNumber, teaId: nullOr(aString), capacityGrams: aNumber, charring: aNumber, location: aLocation }),
  cloths: aRecordOf(aCloth),
  pour: nullOr(aPour),
  sink: anObject<SinkState>({ itemIdInside: nullOr(aString), runningWater: nullOr(someRunningWater), hasRunOverTheItemInside: aBoolean }),
  figurines: aRecordOf(anObject<FigurineState>({ id: aString, satisfaction: aNumber, wasOfferedTeaThisRitual: aBoolean })),
  puddles: aRecordOf(anObject<PuddleState>({ wetMl: aNumber, strength: aNumber, temperatureC: aNumber, spilledAround: nullOr(aSpot) })),
})

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
  const problems = sessionStateSchema(savedInTodaysShape, 'state')
  if (problems.length > 0) return { kind: 'doesNotFit', problems }
  const fresh = initialSessionState(catalog, roomId)
  const state = structuredClone(savedInTodaysShape) as SessionState
  changes.push(...fitTheVessels(state, fresh), ...fitTheCloths(state, fresh), ...fitTheFigurines(state, fresh), ...fitTheHeater(state, fresh))
  const places = new Set(catalog.rooms[roomId]?.places ?? [])
  problems.push(...placeProblemsOf(state, places), ...handProblemsOf(state), ...referenceProblemsOf(state))
  problems.push(...unknownTeaProblemsOf(state, catalog))
  if (problems.length > 0) return { kind: 'doesNotFit', problems }
  changes.push(...dropPuddlesOnLostPlaces(state, places))
  return { kind: 'fits', state, changes }
}

function handProblemsOf(state: SessionState): string[] {
  const itemIds = new Set(carriedItemIdsIn(state))
  const hands = state.keeper.hands
  const handsHoldingWhatIsNotThere = hands.flatMap((itemId, handIndex) => {
    if (itemId === null) return []
    if (!itemIds.has(itemId)) return [`hand ${handIndex} holds ${itemId}, which the room does not have`]
    const location = itemLocationIn(state, itemId)
    return location?.kind === 'inHand' && location.handIndex === handIndex ? [] : [`hand ${handIndex} holds ${itemId}, which is ${whereIs(location)}`]
  })
  const itemsInAnotherHand = locationsIn(state).flatMap(([itemId, location]) =>
    location.kind === 'inHand' && hands[location.handIndex] !== itemId ? [`${itemId} is in hand ${location.handIndex}, which holds ${hands[location.handIndex] ?? 'nothing'}`] : [],
  )
  const middleHandThatNeverGrew = !state.keeper.hasAMiddleHand && hands[2] !== null ? [`the middle hand holds ${hands[2]}, though it has not grown`] : []
  return [...handsHoldingWhatIsNotThere, ...itemsInAnotherHand, ...middleHandThatNeverGrew]
}

function referenceProblemsOf(state: SessionState): string[] {
  const pour = state.pour
  const pouredVesselIds = pour === null ? [] : [pour.sourceId, pour.targetId]
  return [
    ...itemOnASurfaceProblems(state, 'the heater', state.heater.itemIdOnTop),
    ...itemOnASurfaceProblems(state, 'the sink', state.sink.itemIdInside),
    ...pouredVesselIds.flatMap((vesselId) => (vesselId === null || state.vessels[vesselId] !== undefined ? [] : [`the pour runs through ${vesselId}, which the room does not have`])),
  ]
}

function itemOnASurfaceProblems(state: SessionState, holder: string, itemId: string | null): string[] {
  if (itemId === null) return []
  const location = itemLocationIn(state, itemId)
  return location?.kind === 'onSurface' ? [] : [`${holder} holds ${itemId}, which is ${whereIs(location)}`]
}

function placeProblemsOf(state: SessionState, places: ReadonlySet<string>): string[] {
  const keeperPlaceId = state.keeper.placeId
  const keeperProblems = keeperPlaceId === null || places.has(keeperPlaceId) ? [] : [`the keeper stands at the ${keeperPlaceId}, which the room no longer has`]
  const itemProblems = locationsIn(state).flatMap(([owner, location]) => (location.kind === 'onSurface' && !places.has(location.spot.placeId) ? [`${owner} stands on ${location.spot.placeId}, which the room no longer has`] : []))
  return [...keeperProblems, ...itemProblems]
}

function locationsIn(state: SessionState): [string, DeepReadonly<ItemLocation>][] {
  return carriedItemIdsIn(state).flatMap((itemId): [string, DeepReadonly<ItemLocation>][] => {
    const location = itemLocationIn(state, itemId)
    return location === undefined ? [] : [[itemId, location]]
  })
}

function unknownTeaProblemsOf(state: SessionState, catalog: Catalog): string[] {
  const heldTeas: [string, string | null][] = [
    ['the spoon holds', state.spoon.teaId],
    ...Object.values(state.vessels).map((vessel): [string, string | null] => [`${vessel.id} holds leaves of`, vessel.leaves?.teaId ?? null]),
    ...Object.values(state.vessels).flatMap((vessel) => Object.keys(vessel.liquid.strengthByTeaId).map((teaId): [string, string | null] => [`${vessel.id} holds a liquid of`, teaId])),
  ]
  return heldTeas.filter(([, teaId]) => teaId !== null && catalog.teas[teaId] === undefined).map(([holder, teaId]) => `${holder} ${String(teaId)}, which is not in the catalog`)
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

function fitTheHeater(state: SessionState, fresh: SessionState): string[] {
  const savedHeater = state.heater
  if (savedHeater.definitionId === fresh.heater.definitionId) return []
  state.heater = { ...fresh.heater, itemIdOnTop: savedHeater.itemIdOnTop }
  return [`the heater ${savedHeater.definitionId} is no longer the room's, so the room's ${fresh.heater.definitionId} stands in its place, switched off, with ${savedHeater.itemIdOnTop ?? 'nothing'} on it`]
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

function withTheTeaOnTheSpoon(saved: Shape): ReturnType<SaveMigration> {
  const spoon = saved['spoon']
  if (!isShape(spoon) || spoon['teaId'] !== undefined) return null
  const teaId = typeof spoon['grams'] === 'number' && spoon['grams'] > 0 && typeof saved['teaId'] === 'string' ? saved['teaId'] : null
  return {
    migrated: { ...saved, spoon: { ...spoon, teaId } },
    change: `a save from before the spoon knew its tea finds ${teaId === null ? 'no tea' : `the ritual's ${teaId}`} on it`,
  }
}

function withTheTeasOfEveryLiquid(saved: Shape): ReturnType<SaveMigration> {
  const vessels = saved['vessels']
  if (!isShape(vessels) || Object.values(vessels).every((vessel) => !isShape(vessel) || !isShape(vessel['liquid']) || vessel['liquid']['strengthByTeaId'] !== undefined)) return null
  const teaId = typeof saved['teaId'] === 'string' ? saved['teaId'] : null
  const withTeas = Object.fromEntries(Object.entries(vessels).map(([id, vessel]) => [id, isShape(vessel) && isShape(vessel['liquid']) && vessel['liquid']['strengthByTeaId'] === undefined ? { ...vessel, liquid: liquidWithTheTea(vessel['liquid'], teaId) } : vessel]))
  return {
    migrated: { ...saved, vessels: withTeas },
    change: `a save from before a liquid knew its teas gives the strength of each liquid to ${teaId === null ? 'no tea' : `the ritual's ${teaId}`}`,
  }
}

function liquidWithTheTea(liquid: Shape, teaId: string | null): Shape {
  const strength = liquid['strength']
  return { ...liquid, strengthByTeaId: teaId !== null && typeof strength === 'number' && strength > 0 ? { [teaId]: strength } : {} }
}

function withoutTheTargetTemperatureAnnounced(saved: Shape): ReturnType<SaveMigration> {
  const heater = saved['heater']
  if (!isShape(heater) || heater['hasAnnouncedTargetTemperature'] === undefined) return null
  return {
    migrated: { ...saved, heater: withoutTheField(heater, 'hasAnnouncedTargetTemperature') },
    change: 'a save from before the water was left unjudged forgets whether the heater announced the tea\'s good range',
  }
}

function withoutTheRitualsPhase(saved: Shape): ReturnType<SaveMigration> {
  if (saved['phase'] === undefined) return null
  return {
    migrated: withoutTheField(saved, 'phase'),
    change: `a save from before the ritual lost its phases forgets that it was ${String(saved['phase'])}`,
  }
}

function withoutTheChosenTea(saved: Shape): ReturnType<SaveMigration> {
  if (saved['teaId'] === undefined) return null
  return {
    migrated: withoutTheField(saved, 'teaId'),
    change: `a save from before each caddy held its own tea forgets that the ritual chose ${String(saved['teaId'])}`,
  }
}

function withoutTheField(shape: Shape, field: string): Shape {
  return Object.fromEntries(Object.entries(shape).filter(([key]) => key !== field))
}

function isShape(value: unknown): value is Shape {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

type FieldCheck = (value: unknown, path: string) => string[]

type SchemaOf<Value> = { readonly [Key in keyof Value]-?: FieldCheck }

function aValueOfType(type: 'number' | 'string' | 'boolean'): FieldCheck {
  return (value, path) => (typeof value === type ? [] : [`${path} is not a ${type}`])
}

function nullOr(check: FieldCheck): FieldCheck {
  return (value, path) => (value === null ? [] : check(value, path))
}

function absentOr(check: FieldCheck): FieldCheck {
  return (value, path) => (value === undefined ? [] : check(value, path))
}

function anObject<Value>(schema: SchemaOf<Value>): FieldCheck {
  return (value, path) => {
    if (!isShape(value)) return [`${path} is not an object`]
    return Object.entries<FieldCheck>(schema).flatMap(([key, check]) => check(value[key], `${path}.${key}`))
  }
}

function aRecordOf(check: FieldCheck): FieldCheck {
  return (value, path) => (isShape(value) ? Object.entries(value).flatMap(([key, field]) => check(field, `${path}.${key}`)) : [`${path} is not an object`])
}

function aListOf(checks: readonly FieldCheck[]): FieldCheck {
  return (value, path) => {
    if (!Array.isArray(value) || value.length !== checks.length) return [`${path} is not a list of ${checks.length}`]
    return checks.flatMap((check, index) => check(value[index], `${path}[${index}]`))
  }
}

function aLocation(value: unknown, path: string): string[] {
  if (!isShape(value)) return [`${path} is not an object`]
  switch (value['kind']) {
    case 'onSurface':
      return aSpot(value['spot'], `${path}.spot`)
    case 'inHand':
      return value['handIndex'] === 0 || value['handIndex'] === 1 || value['handIndex'] === 2 ? [] : [`${path} is a hand that does not exist, ${String(value['handIndex'])}`]
    case 'gone':
      return []
    default:
      return [`${path} is an unknown kind of place, ${String(value['kind'])}`]
  }
}
