import assert from 'node:assert/strict'
import test from 'node:test'
import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'
import { RitualSession } from '../../Shared/Simulation/Ritual/RitualSession.ts'
import { RecordingLog } from '../Support/RecordingLog.ts'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

test('kettle_whenTheKeeperIsAwayAnHour_coolsToTheRoom', () => {
  const coolingCatalog = testCatalog({ kettle: 0.01 })
  const ritual = TestRitual.begun(coolingCatalog)
  ritual.heatKettleTo(90)

  const { ritual: returned } = ritual.leaveAndReturnAfter(3600, coolingCatalog)

  assert.equal(returned.vessel('kettle').liquid.temperatureC.toFixed(1), '20.0')
})

test('kettle_leftOnTheWorkingHeaterForAnHour_boilsDry', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  const { ritual: returned } = ritual.leaveAndReturnAfter(3600)

  assert.equal(returned.vessel('kettle').liquid.volumeMl, 0)
})

test('leavesInTheKettle_whenTheKeeperIsAwayTenMinutes_steepTenMinutesLonger', () => {
  const ritual = TestRitual.begun()
  ritual.heatKettleTo(80)
  ritual.addLeavesToKettle(5)
  const steepedSecondsBefore = ritual.vessel('kettle').leaves?.steepedSeconds ?? 0

  const { ritual: returned } = ritual.leaveAndReturnAfter(600)

  assert.equal(((returned.vessel('kettle').leaves?.steepedSeconds ?? 0) - steepedSecondsBefore).toFixed(0), '600')
})

test('absence_longerThanTwelveHours_livesOnlyTheFirstTwelveHours', () => {
  const ritual = TestRitual.begun()
  const elapsedSecondsBefore = ritual.state.elapsedSeconds

  const { ritual: returned } = ritual.leaveAndReturnAfter(100_000)

  assert.equal(returned.state.elapsedSeconds - elapsedSecondsBefore, 43_200)
})

test('pour_whenTheKeeperLeftInTheMiddleOfIt_stopsOnReturnWithoutPouringWhileAway', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })
  ritual.do({ type: 'adjustPour', tiltDegrees: 45, streamOnTargetFraction: 1, missedStreamLandsAt: null })
  ritual.wait(1)
  const cupMlBefore = ritual.vessel('cup1').liquid.volumeMl

  const { ritual: returned, events } = ritual.leaveAndReturnAfter(60)

  assert.equal(returned.state.pour, null)
  assert.equal(returned.vessel('cup1').liquid.volumeMl, cupMlBefore)
  assert.equal(eventsOfType(events, 'pourFinished').length, 1)
})

test('spoon_whenItCrumbledBeforeTheAbsence_waitsAtItsPlaceAgainAndIsAnnounced', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'spoon' })
  ritual.do({ type: 'placeOnHeater', itemId: 'spoon' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(17)
  ritual.do({ type: 'pickUp', itemId: 'spoon' })

  const { ritual: returned, events } = ritual.leaveAndReturnAfter(0)

  assert.deepEqual(returned.state.spoon, { grams: 0, capacityGrams: 5, charring: 0, location: { kind: 'onSurface', spot: { placeId: 'table', x: 7, y: 0, z: 0 } } })
  assert.deepEqual(eventsOfType(events, 'houseRestocked'), [{ type: 'houseRestocked', spoonReturned: true, caddyWasRefilled: false, caddyWasEmpty: false }])
})

test('caddy_whenWashedCleanBeforeTheAbsence_isFullAndDryAgainAndIsAnnouncedAsEmpty', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'caddy' })
  ritual.do({ type: 'putInTheSink', itemId: 'caddy' })
  ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })
  ritual.wait(60)
  ritual.do({ type: 'turnTheTapOff' })

  const { ritual: returned, events } = ritual.leaveAndReturnAfter(0)

  assert.equal(returned.vessel('caddy').leaves?.grams, 50)
  assert.equal(returned.vessel('caddy').liquid.volumeMl, 0)
  assert.deepEqual(eventsOfType(events, 'houseRestocked'), [{ type: 'houseRestocked', spoonReturned: false, caddyWasRefilled: true, caddyWasEmpty: true }])
})

test('caddy_holdingTeaBrewedInIt_isPouredOutAndRefilledWhereItStands', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })
  ritual.pour('kettle', 'caddy', 5)
  const caddyLocationBefore = ritual.vessel('caddy').location

  const { ritual: returned, events } = ritual.leaveAndReturnAfter(0)

  assert.deepEqual(returned.vessel('caddy').location, caddyLocationBefore)
  assert.equal(returned.vessel('caddy').liquid.volumeMl, 0)
  assert.deepEqual(returned.vessel('caddy').leaves, { teaId: 'testGreen', grams: 50, isSteeping: false, isStirredByTheBoil: false, steepedSeconds: 0 })
  assert.deepEqual(eventsOfType(events, 'houseRestocked'), [{ type: 'houseRestocked', spoonReturned: false, caddyWasRefilled: true, caddyWasEmpty: false }])
})

test('return_withTheSpoonHereAndTheCaddyFullAndDry_restocksNothing', () => {
  const ritual = TestRitual.begun()

  const { events } = ritual.leaveAndReturnAfter(60)

  assert.deepEqual(eventsOfType(events, 'houseRestocked'), [])
})

test('savedState_missingAFieldTheGameReads_doesNotFit', () => {
  const savedState = TestRitual.begun().savedState as { cloth: Record<string, unknown> }
  delete savedState.cloth['teaStain']

  const resuming = RitualSession.resume(testCatalog(), savedState, 1, new RecordingLog(), true)

  assert.deepEqual(resuming, { kind: 'savedStateDoesNotFit', problems: ['state.cloth.teaStain is not a number'] })
})

test('savedState_ofAnotherVersion_doesNotFit', () => {
  const resuming = RitualSession.resume(testCatalog(), TestRitual.begun().savedState, 0, new RecordingLog(), true)

  assert.equal(resuming.kind, 'savedStateDoesNotFit')
})

test('savedState_whenTheRoomGainedAVessel_placesTheNewVesselAtItsStart', () => {
  const savedState = TestRitual.begun().savedState

  const resumed = TestRitual.resumedFrom(savedState, catalogWithAFourthCup())

  assert.deepEqual(resumed.vessel('cup4').location, { kind: 'onSurface', spot: { placeId: 'table', x: 10, y: 0, z: 0 } })
})

test('savedState_whenTheRoomLostAVesselHeldInAHand_emptiesThatHand', () => {
  const ritual = TestRitual.begun(catalogWithAFourthCup())
  ritual.do({ type: 'pickUp', itemId: 'cup4' })

  const resumed = TestRitual.resumedFrom(ritual.savedState, testCatalog())

  assert.deepEqual(resumed.state.keeper.hands, [null, null, null])
  assert.equal(resumed.state.vessels['cup4'], undefined)
})

function catalogWithAFourthCup(): Catalog {
  const catalog = testCatalog()
  const room = catalog.rooms['testRoom']
  if (room === undefined) throw new Error('the test catalog lost its room')
  const fourthCup = { id: 'cup4', definitionId: 'testCup', initialWaterMl: 0, startsAt: { placeId: 'table', x: 10, y: 0, z: 0 } }
  return { ...catalog, rooms: { testRoom: { ...room, vessels: [...room.vessels, fourthCup] } } }
}

test('savedState_fromBeforeTheMiddleHand_resumesWithAnEmptyMiddleHand', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  const savedState = ritual.savedState as { keeper: { hands: unknown[]; hasAMiddleHand?: boolean } }
  savedState.keeper.hands = savedState.keeper.hands.slice(0, 2)
  delete savedState.keeper.hasAMiddleHand

  const resumed = TestRitual.resumedFrom(savedState)

  assert.deepEqual(resumed.state.keeper, { placeId: 'table', hands: ['kettle', null, null], hasAMiddleHand: false })
})

test('savedState_withAnItemInTheMiddleHand_resumesWithTheMiddleHandHoldingIt', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'pickUp', itemId: 'thermos' })
  ritual.do({ type: 'pickUpWithAMiddleHand', itemId: 'cup1' })

  const resumed = TestRitual.resumedFrom(ritual.savedState)

  assert.deepEqual(resumed.state.keeper, { placeId: 'table', hands: ['kettle', 'thermos', 'cup1'], hasAMiddleHand: true })
  assert.deepEqual(resumed.vessel('cup1').location, { kind: 'inHand', handIndex: 2 })
})
