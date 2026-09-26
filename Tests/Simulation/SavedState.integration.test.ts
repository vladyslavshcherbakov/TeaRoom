import assert from 'node:assert/strict'
import test from 'node:test'
import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'
import { RitualSession } from '../../Shared/Simulation/Ritual/RitualSession.ts'
import { sessionStateVersion } from '../../Shared/Simulation/State/FittedSavedState.ts'
import { RecordingLog } from '../Support/RecordingLog.ts'
import { testCatalog, testHouseCatalog, withASecondCloth } from '../Support/TestCatalog.ts'
import { TestRitual } from '../Support/TestRitual.ts'

test('savedState_missingAFieldTheGameReads_doesNotFit', () => {
  const savedState = new TestRitual().savedState as { cloths: Record<string, Record<string, unknown>> }
  delete savedState.cloths['cloth']?.['teaStain']

  const resuming = RitualSession.resume(testCatalog(), savedState, 1, new RecordingLog(), true)

  assert.deepEqual(resuming, { kind: 'savedStateDoesNotFit', problems: ['state.cloths.cloth.teaStain is not a number'] })
})

test('savedState_withLeavesOfATeaTheCatalogNoLongerHas_doesNotFit', () => {
  const savedState = new TestRitual().savedState as { vessels: Record<string, { leaves: Record<string, unknown> }> }
  const caddy = savedState.vessels['caddy']
  if (caddy !== undefined) caddy.leaves['teaId'] = 'earlGrey'

  const resuming = RitualSession.resume(testCatalog(), savedState, 1, new RecordingLog(), true)

  assert.deepEqual(resuming, { kind: 'savedStateDoesNotFit', problems: ['caddy holds leaves of earlGrey, which is not in the catalog'] })
})

test('savedState_ofAnotherVersion_doesNotFit', () => {
  const resuming = RitualSession.resume(testCatalog(), new TestRitual().savedState, 0, new RecordingLog(), true)

  assert.equal(resuming.kind, 'savedStateDoesNotFit')
})

test('savedState_whenTheRoomGainedAVessel_placesTheNewVesselAtItsStart', () => {
  const savedState = new TestRitual().savedState

  const resumed = TestRitual.resumedFrom(savedState, catalogWithAFourthCup())

  assert.deepEqual(resumed.vessel('cup4').location, { kind: 'onSurface', spot: { placeId: 'table', x: 10, y: 0, z: 0 } })
})

test('savedState_whenTheRoomLostAVesselHeldInAHand_emptiesThatHand', () => {
  const ritual = new TestRitual(catalogWithAFourthCup())
  ritual.do({ type: 'pickUp', itemId: 'cup4' })

  const resumed = TestRitual.resumedFrom(ritual.savedState, testCatalog())

  assert.deepEqual(resumed.state.keeper.hands, [null, null, null])
  assert.equal(resumed.state.vessels['cup4'], undefined)
})

test('savedState_fromBeforeTheMiddleHand_resumesWithAnEmptyMiddleHand', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  const savedState = ritual.savedState as { keeper: { hands: unknown[]; hasAMiddleHand?: boolean } }
  savedState.keeper.hands = savedState.keeper.hands.slice(0, 2)
  delete savedState.keeper.hasAMiddleHand

  const resumed = TestRitual.resumedFrom(savedState)

  assert.deepEqual(resumed.state.keeper, { placeId: 'table', hands: ['kettle', null, null], hasAMiddleHand: false })
})

test('savedState_withAnItemInTheMiddleHand_resumesWithTheMiddleHandHoldingIt', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'pickUp', itemId: 'thermos' })
  ritual.do({ type: 'pickUpWithAMiddleHand', itemId: 'cup1' })

  const resumed = TestRitual.resumedFrom(ritual.savedState)

  assert.deepEqual(resumed.state.keeper, { placeId: 'table', hands: ['kettle', 'thermos', 'cup1'], hasAMiddleHand: true })
  assert.deepEqual(resumed.vessel('cup1').location, { kind: 'inHand', handIndex: 2 })
})

test('savedState_fromBeforeARoomCouldHoldSeveralCloths_resumesWithItsOneClothUnderTheIdCloth', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'pickUp', itemId: 'cloth' })
  const savedState = ritual.savedState as { cloth?: unknown; cloths?: Record<string, { id?: string }> }
  savedState.cloth = Object.fromEntries(Object.entries(savedState.cloths?.['cloth'] ?? {}).filter(([key]) => key !== 'id'))
  delete savedState.cloths

  const resumed = TestRitual.resumedFrom(savedState)

  assert.deepEqual(resumed.cloth().location, { kind: 'inHand', handIndex: 0 })
  assert.deepEqual(resumed.state.keeper.hands, ['cloth', null, null])
})

test('savedState_fromBeforeTheTapRememberedWhatItRanOnto_resumesCountingTheItemInTheSinkAsRunOnto', () => {
  const ritual = new TestRitual(testHouseCatalog(), 'testHouse')
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
  const savedState = new TestRitual().savedState

  const resumed = TestRitual.resumedFrom(savedState, withASecondCloth(testCatalog()))

  assert.deepEqual(resumed.cloth('cloth2').location, { kind: 'onSurface', spot: { placeId: 'table', x: 11, y: 0, z: 0 } })
})

test('savedState_fromBeforeTheLightWasKept_standsHalfwayThroughItsTimeOfDay', () => {
  const savedState = new TestRitual().savedState as { atmosphere: Record<string, unknown> }
  delete savedState.atmosphere['shareThroughTheTimeOfDay']

  const resumed = TestRitual.resumedFrom(savedState)

  assert.deepEqual(resumed.state.atmosphere, { timeOfDay: 'sunset', shareThroughTheTimeOfDay: 0.5, weather: 'rain' })
})

test('savedState_fromBeforeTheHeaterCountedItsWaste_startsCountingItAtNothing', () => {
  const savedState = new TestRitual().savedState as { heater: Record<string, unknown> }
  delete savedState.heater['secondsWasted']

  const resumed = TestRitual.resumedFrom(savedState)

  assert.equal(resumed.state.heater.secondsWasted, 0)
})

test('savedState_fromBeforeTheThermostat_getsOneAtAHundredDegreesNotWorking', () => {
  const savedState = new TestRitual().savedState as { heater: Record<string, unknown> }
  delete savedState.heater['thermostat']
  delete savedState.heater['secondsHeating']

  const resumed = TestRitual.resumedFrom(savedState)

  assert.deepEqual(resumed.state.heater.thermostat, { targetC: 100, isOn: false })
  assert.equal(resumed.state.heater.secondsHeating, 0)
})

test('savedState_fromBeforeTheHeaterCouldHoldItsTarget_boilsByHandAsItDid', () => {
  const savedState = new TestRitual().savedState as { heater: Record<string, unknown> }
  delete savedState.heater['holdsTheThermostatsTarget']

  const resumed = TestRitual.resumedFrom(savedState)

  assert.equal(resumed.state.heater.holdsTheThermostatsTarget, false)
})

test('savedState_fromBeforeVesselsRememberedBeingFull_countsNoneAsFull', () => {
  const savedState = new TestRitual().savedState as { vessels: Record<string, Record<string, unknown>> }
  for (const vessel of Object.values(savedState.vessels)) delete vessel['hasOnlyBoiledDownSinceFull']

  const resumed = TestRitual.resumedFrom(savedState)

  assert.equal(resumed.state.vessels['kettle']?.hasOnlyBoiledDownSinceFull, false)
})

test('savedState_fromBeforePuddlesHadATemperature_findsThemAtRoomTemperature', () => {
  const ritual = new TestRitual()
  ritual.pour('kettle', null, 2.5)
  const savedState = ritual.savedState as { puddles: Record<string, Record<string, unknown>> }
  for (const puddle of Object.values(savedState.puddles)) delete puddle['temperatureC']

  const resumed = TestRitual.resumedFrom(savedState)

  assert.equal(resumed.state.puddles['table']?.temperatureC, 20)
})

test('savedState_fromBeforeTheSpoonKnewItsTea_findsTheRitualsTeaOnAFullSpoon', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'pickUp', itemId: 'spoon' })
  ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })
  ritual.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })
  const savedState = { ...(ritual.savedState as { spoon: Record<string, unknown> }), teaId: 'testGreen' }
  delete savedState.spoon['teaId']

  const resumed = TestRitual.resumedFrom(savedState)

  assert.equal(resumed.state.spoon.teaId, 'testGreen')
})

test('savedState_fromBeforeLiquidsKnewTheirTeas_givesTheStrengthOfEveryLiquidToTheRitualsTea', () => {
  const ritual = new TestRitual()
  ritual.heatKettleTo(80)
  ritual.addLeavesToKettle(5)
  ritual.wait(60)
  ritual.pour('kettle', 'cup1', 5)
  const savedState = { ...(ritual.savedState as { vessels: Record<string, { liquid: Record<string, unknown> }> }), teaId: 'testGreen' }
  for (const vessel of Object.values(savedState.vessels)) delete vessel.liquid['strengthByTeaId']

  const resumed = TestRitual.resumedFrom(savedState)

  const tea = resumed.vessel('cup1').liquid
  assert.deepEqual(Object.keys(tea.strengthByTeaId), ['testGreen'])
  assert.equal(tea.strengthByTeaId['testGreen'], tea.strength)
  assert.deepEqual(resumed.vessel('cup2').liquid.strengthByTeaId, {})
})

test('savedState_fromBeforeTheWaterWentUnjudged_forgetsWhetherTheHeaterAnnouncedTheTeasRange', () => {
  const savedState = new TestRitual().savedState as { heater: Record<string, unknown> }
  savedState.heater['hasAnnouncedTargetTemperature'] = true

  const resumed = TestRitual.resumedFrom(savedState)

  assert.equal('hasAnnouncedTargetTemperature' in resumed.state.heater, false)
})

test('savedState_fromBeforeTheRitualLostItsPhases_resumesWithoutAPhase', () => {
  const savedState = { ...(new TestRitual().savedState as object), phase: 'resting' }

  const resumed = TestRitual.resumedFrom(savedState)

  assert.equal('phase' in resumed.state, false)
})

test('savedState_fromBeforeEachCaddyHeldItsOwnTea_resumesWithoutAChosenTea', () => {
  const savedState = { ...(new TestRitual().savedState as object), teaId: 'testGreen' }

  const resumed = TestRitual.resumedFrom(savedState)

  assert.equal('teaId' in resumed.state, false)
})

test('savedState_whoseHeaterLeftTheCatalog_resumesWithTheRoomsHeaterSwitchedOff', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  const resumed = TestRitual.resumedFrom(ritual.savedState, catalogWithANewHeater())

  assert.equal(resumed.state.heater.definitionId, 'newHeater')
  assert.equal(resumed.state.heater.isOn, false)
  assert.equal(resumed.state.heater.itemIdOnTop, 'kettle')
})

test('savedState_withTheKeeperWalking_resumesWithTheKeeperWalking', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'standAt', placeId: null })

  const resumed = TestRitual.resumedFrom(ritual.savedState)

  assert.equal(resumed.state.keeper.placeId, null)
})

test('savedState_whosePourNamesItsTargetWithANumber_doesNotFit', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })
  const savedState = ritual.savedState as { pour: Record<string, unknown> }
  savedState.pour['targetId'] = 5

  const problems = problemsResuming(savedState)

  assert.deepEqual(problems.filter((problem) => problem.includes('state.pour.targetId')).length, 1, problems.join('\n'))
})

test('savedState_whoseHandHoldsACupLyingOnTheTable_doesNotFit', () => {
  const savedState = new TestRitual().savedState as { keeper: { hands: unknown[] } }
  savedState.keeper.hands[0] = 'cup1'

  const problems = problemsResuming(savedState)

  assert.equal(problems.filter((problem) => problem.includes('cup1')).length, 1, problems.join('\n'))
})

test('savedState_whoseCupSaysItIsInAnEmptyHand_doesNotFit', () => {
  const savedState = new TestRitual().savedState as { vessels: Record<string, Record<string, unknown>> }
  const cup = savedState.vessels['cup1']
  if (cup !== undefined) cup['location'] = { kind: 'inHand', handIndex: 1 }

  const problems = problemsResuming(savedState)

  assert.equal(problems.filter((problem) => problem.includes('cup1')).length, 1, problems.join('\n'))
})

test('savedState_whoseHeaterHoldsTheKettleThatIsInAHand_doesNotFit', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  const savedState = ritual.savedState as { heater: Record<string, unknown> }
  savedState.heater['itemIdOnTop'] = 'kettle'

  const problems = problemsResuming(savedState)

  assert.equal(problems.filter((problem) => problem.includes('kettle')).length, 1, problems.join('\n'))
})

test('savedState_whoseKeeperStandsAtAPlaceTheRoomDoesNotHave_doesNotFit', () => {
  const savedState = new TestRitual().savedState as { keeper: Record<string, unknown> }
  savedState.keeper['placeId'] = 'attic'

  const problems = problemsResuming(savedState)

  assert.equal(problems.filter((problem) => problem.includes('attic')).length, 1, problems.join('\n'))
})

function problemsResuming(savedState: unknown): readonly string[] {
  const resuming = RitualSession.resume(testCatalog(), savedState, sessionStateVersion, new RecordingLog(), true)
  return resuming.kind === 'opened' ? [] : resuming.problems
}

function catalogWithANewHeater(): Catalog {
  const catalog = testCatalog()
  const room = catalog.rooms['testRoom']
  const heater = catalog.heaters['testHeater']
  if (room === undefined || heater === undefined) throw new Error('the test catalog lost its room or its heater')
  return { ...catalog, heaters: { newHeater: { ...heater, id: 'newHeater' } }, rooms: { testRoom: { ...room, heaterId: 'newHeater' } } }
}

function catalogWithAFourthCup(): Catalog {
  const catalog = testCatalog()
  const room = catalog.rooms['testRoom']
  if (room === undefined) throw new Error('the test catalog lost its room')
  const fourthCup = { id: 'cup4', definitionId: 'testCup', initialWaterMl: 0, teaStock: null, startsAt: { placeId: 'table', x: 10, y: 0, z: 0 } }
  return { ...catalog, rooms: { testRoom: { ...room, vessels: [...room.vessels, fourthCup] } } }
}
