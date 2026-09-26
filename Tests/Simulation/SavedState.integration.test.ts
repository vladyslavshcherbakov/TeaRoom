import assert from 'node:assert/strict'
import test from 'node:test'
import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'
import { RitualSession } from '../../Shared/Simulation/Ritual/RitualSession.ts'
import { RecordingLog } from '../Support/RecordingLog.ts'
import { testCatalog, testHouseCatalog, withASecondCloth } from '../Support/TestCatalog.ts'
import { TestRitual } from '../Support/TestRitual.ts'

test('savedState_missingAFieldTheGameReads_doesNotFit', () => {
  const savedState = TestRitual.begun().savedState as { cloths: Record<string, Record<string, unknown>> }
  delete savedState.cloths['cloth']?.['teaStain']

  const resuming = RitualSession.resume(testCatalog(), savedState, 1, new RecordingLog(), true)

  assert.deepEqual(resuming, { kind: 'savedStateDoesNotFit', problems: ['state.cloths.cloth.teaStain is not a number'] })
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

test('savedState_fromBeforeARoomCouldHoldSeveralCloths_resumesWithItsOneClothUnderTheIdCloth', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  const savedState = ritual.savedState as { cloth?: unknown; cloths?: Record<string, { id?: string }> }
  savedState.cloth = Object.fromEntries(Object.entries(savedState.cloths?.['cloth'] ?? {}).filter(([key]) => key !== 'id'))
  delete savedState.cloths

  const resumed = TestRitual.resumedFrom(savedState)

  assert.deepEqual(resumed.cloth().location, { kind: 'inHand', handIndex: 0 })
  assert.deepEqual(resumed.state.keeper.hands, ['cloth', null, null])
})

test('savedState_fromBeforeTheTapRememberedWhatItRanOnto_resumesCountingTheItemInTheSinkAsRunOnto', () => {
  const ritual = TestRitual.begun(testHouseCatalog(), 'testGreen', 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'putInTheSink', itemId: 'kettle' })
  ritual.do({ type: 'turnTheTapOn' })
  const savedState = ritual.savedState as { heater: Record<string, unknown>; sink: { runningWater: Record<string, unknown> } }
  delete savedState.heater['secondsHeatedByItemId']
  delete savedState.sink.runningWater['hasRunOntoAnItem']

  const resumed = TestRitual.resumedFrom(savedState, testHouseCatalog())

  assert.deepEqual(resumed.state.heater.secondsHeatedByItemId, {})
  assert.equal(resumed.state.sink.runningWater?.hasRunOntoAnItem, true)
})

test('savedState_whenTheRoomGainedASecondCloth_laysTheNewClothAtItsStart', () => {
  const savedState = TestRitual.begun().savedState

  const resumed = TestRitual.resumedFrom(savedState, withASecondCloth(testCatalog()))

  assert.deepEqual(resumed.cloth('cloth2').location, { kind: 'onSurface', spot: { placeId: 'table', x: 11, y: 0, z: 0 } })
})

test('savedState_fromBeforeTheLightWasKept_standsHalfwayThroughItsTimeOfDay', () => {
  const savedState = TestRitual.begun().savedState as { atmosphere: Record<string, unknown> }
  delete savedState.atmosphere['shareThroughTheTimeOfDay']

  const resumed = TestRitual.resumedFrom(savedState)

  assert.deepEqual(resumed.state.atmosphere, { timeOfDay: 'sunset', shareThroughTheTimeOfDay: 0.5, weather: 'rain' })
})

test('savedState_fromBeforeTheHeaterCountedItsWaste_startsCountingItAtNothing', () => {
  const savedState = TestRitual.begun().savedState as { heater: Record<string, unknown> }
  delete savedState.heater['secondsWasted']

  const resumed = TestRitual.resumedFrom(savedState)

  assert.equal(resumed.state.heater.secondsWasted, 0)
})

test('savedState_fromBeforeTheThermostat_getsOneAtAHundredDegreesNotWorking', () => {
  const savedState = TestRitual.begun().savedState as { heater: Record<string, unknown> }
  delete savedState.heater['thermostat']
  delete savedState.heater['secondsHeating']

  const resumed = TestRitual.resumedFrom(savedState)

  assert.deepEqual(resumed.state.heater.thermostat, { targetC: 100, isOn: false })
  assert.equal(resumed.state.heater.secondsHeating, 0)
})

test('savedState_fromBeforeTheHeaterCouldHoldItsTarget_boilsByHandAsItDid', () => {
  const savedState = TestRitual.begun().savedState as { heater: Record<string, unknown> }
  delete savedState.heater['holdsTheThermostatsTarget']

  const resumed = TestRitual.resumedFrom(savedState)

  assert.equal(resumed.state.heater.holdsTheThermostatsTarget, false)
})

test('savedState_fromBeforeVesselsRememberedBeingFull_countsNoneAsFull', () => {
  const savedState = TestRitual.begun().savedState as { vessels: Record<string, Record<string, unknown>> }
  for (const vessel of Object.values(savedState.vessels)) delete vessel['hasOnlyBoiledDownSinceFull']

  const resumed = TestRitual.resumedFrom(savedState)

  assert.equal(resumed.state.vessels['kettle']?.hasOnlyBoiledDownSinceFull, false)
})

test('savedState_fromBeforePuddlesHadATemperature_findsThemAtRoomTemperature', () => {
  const ritual = TestRitual.begun()
  ritual.pour('kettle', null, 2.5)
  const savedState = ritual.savedState as { puddles: Record<string, Record<string, unknown>> }
  for (const puddle of Object.values(savedState.puddles)) delete puddle['temperatureC']

  const resumed = TestRitual.resumedFrom(savedState)

  assert.equal(resumed.state.puddles['table']?.temperatureC, 20)
})

function catalogWithAFourthCup(): Catalog {
  const catalog = testCatalog()
  const room = catalog.rooms['testRoom']
  if (room === undefined) throw new Error('the test catalog lost its room')
  const fourthCup = { id: 'cup4', definitionId: 'testCup', initialWaterMl: 0, startsAt: { placeId: 'table', x: 10, y: 0, z: 0 } }
  return { ...catalog, rooms: { testRoom: { ...room, vessels: [...room.vessels, fourthCup] } } }
}
