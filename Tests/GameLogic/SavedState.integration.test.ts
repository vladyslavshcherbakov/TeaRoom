import assert from 'node:assert/strict'
import test from 'node:test'
import type { Catalog } from '../../Shared/GameLogic/Definitions/Catalog.ts'
import { TeaSession } from '../../Shared/GameLogic/Simulation/TeaSession.ts'
import { sessionStateVersion } from '../../Shared/GameLogic/State/FittedSavedState.ts'
import { itemIdsInTheHands } from '../../Shared/GameLogic/State/WhereItemsAre.ts'
import { RecordingLog } from '../Support/RecordingLog.ts'
import { catalogWithRoomChanges, testCatalog, withAFourthCup, withASecondCloth } from '../Support/TestCatalog.ts'
import { TestTeaSession } from '../Support/TestTeaSession.ts'

test('savedState_missingAFieldTheGameReads_doesNotFit', () => {
  const savedState = new TestTeaSession().savedState as { cloths: Record<string, Record<string, unknown>> }
  delete savedState.cloths['cloth']?.['teaStain']

  const resuming = TeaSession.resume(testCatalog(), savedState, sessionStateVersion, new RecordingLog(), true)

  assert.deepEqual(resuming, { kind: 'savedStateDoesNotFit', problems: ['state.cloths.cloth.teaStain is not a number'] })
})

test('savedState_withLeavesOfATeaTheCatalogNoLongerHas_doesNotFit', () => {
  const savedState = new TestTeaSession().savedState as { vessels: Record<string, { leaves: Record<string, unknown> }> }
  const caddy = savedState.vessels['caddy']
  if (caddy !== undefined) caddy.leaves['gramsByTeaId'] = { earlGrey: 50 }

  const resuming = TeaSession.resume(testCatalog(), savedState, sessionStateVersion, new RecordingLog(), true)

  assert.deepEqual(resuming, { kind: 'savedStateDoesNotFit', problems: ['caddy holds leaves of earlGrey, which is not in the catalog'] })
})

test('savedState_ofAnotherVersion_doesNotFit', () => {
  const resuming = TeaSession.resume(testCatalog(), new TestTeaSession().savedState, sessionStateVersion + 1, new RecordingLog(), true)

  assert.equal(resuming.kind, 'savedStateDoesNotFit')
})

test('savedState_whenTheRoomGainedAVessel_doesNotFit', () => {
  const problems = problemsResuming(new TestTeaSession().savedState, withAFourthCup(testCatalog()))

  assert.deepEqual(problems, ['the room has the vessel cup4 (testCup), which the save lacks'])
})

test('savedState_whenTheRoomLostAVessel_doesNotFit', () => {
  const problems = problemsResuming(new TestTeaSession(withAFourthCup(testCatalog())).savedState, testCatalog())

  assert.deepEqual(problems, ['the save has the vessel cup4 (testCup), which the room no longer has'])
})

test('savedState_whenTheRoomGainedACloth_doesNotFit', () => {
  const problems = problemsResuming(new TestTeaSession().savedState, withASecondCloth(testCatalog()))

  assert.deepEqual(problems, ['the room has the cloth cloth2, which the save lacks'])
})

test('savedState_whoseHeaterLeftTheCatalog_doesNotFit', () => {
  const problems = problemsResuming(new TestTeaSession().savedState, catalogWithANewHeater())

  assert.deepEqual(problems, ['the saved heater is testHeater, and the room has newHeater'])
})

test('savedState_atATimeOfDayTheRoomNoLongerOffers_doesNotFit', () => {
  const session = new TestTeaSession()
  session.do({ type: 'chooseAtmosphere', timeOfDay: 'dawn', shareThroughTheTimeOfDay: 0.5, weather: 'rain' })

  const problems = problemsResuming(session.savedState, catalogWithRoomChanges({ timesOfDay: ['night', 'sunset'] }))

  assert.deepEqual(problems, ['the room does not offer the time of day dawn'])
})

test('savedState_inAnUnknownWeather_doesNotFit', () => {
  const savedState = new TestTeaSession().savedState as { atmosphere: Record<string, unknown> }
  savedState.atmosphere['weather'] = 'hail'

  const problems = problemsResuming(savedState)

  assert.deepEqual(problems, ['the room does not offer the weather hail'])
})

test('savedState_withAPuddleOnAPlaceTheRoomLost_doesNotFit', () => {
  const session = new TestTeaSession(catalogWithRoomChanges({ places: ['table', 'window'] }))
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'standAt', placeId: 'window' })
  session.pour('kettle', null, 2.5)
  session.do({ type: 'standAt', placeId: 'table' })

  const problems = problemsResuming(session.savedState)

  assert.deepEqual(problems, ['puddle1 lies on window, which the room no longer has'])
})

test('savedState_withAnItemInTheMiddleHand_resumesWithTheMiddleHandHoldingIt', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'pickUp', itemId: 'thermos' })
  session.do({ type: 'pickUpWithAMiddleHand', itemId: 'cup1' })

  const resumed = TestTeaSession.resumedFrom(session.savedState)

  assert.deepEqual(resumed.state.player, { placeId: 'table', hasAMiddleHand: true })
  assert.deepEqual(itemIdsInTheHands(resumed.state), ['kettle', 'thermos', 'cup1'])
})

test('savedState_withThePlayerWalking_resumesWithThePlayerWalking', () => {
  const session = new TestTeaSession()
  session.do({ type: 'standAt', placeId: null })

  const resumed = TestTeaSession.resumedFrom(session.savedState)

  assert.equal(resumed.state.player.placeId, null)
})

test('savedState_whosePourNamesItsTargetWithANumber_doesNotFit', () => {
  const session = new TestTeaSession()
  session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })
  const savedState = session.savedState as { pour: Record<string, unknown> }
  savedState.pour['targetId'] = 5

  const problems = problemsResuming(savedState)

  assert.deepEqual(problems.filter((problem) => problem.includes('state.pour.targetId')).length, 1, problems.join('\n'))
})

test('savedState_whoseHandHoldsTwoItems_doesNotFit', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'kettle' })
  const savedState = session.savedState as { vessels: Record<string, Record<string, unknown>> }
  const cup = savedState.vessels['cup1']
  if (cup !== undefined) cup['location'] = { kind: 'inHand', handIndex: 0 }

  const problems = problemsResuming(savedState)

  assert.deepEqual(problems, ['hand 0 holds kettle and cup1 at once'])
})

test('savedState_withTwoItemsOnTheHeater_doesNotFit', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  const savedState = session.savedState as { vessels: Record<string, Record<string, unknown>> }
  const thermos = savedState.vessels['thermos']
  if (thermos !== undefined) thermos['location'] = savedState.vessels['kettle']?.['location']

  const problems = problemsResuming(savedState)

  assert.deepEqual(problems, ['the heater holds kettle and thermos at once'])
})

test('savedState_whosePlayerStandsAtAPlaceTheRoomDoesNotHave_doesNotFit', () => {
  const savedState = new TestTeaSession().savedState as { player: Record<string, unknown> }
  savedState.player['placeId'] = 'attic'

  const problems = problemsResuming(savedState)

  assert.equal(problems.filter((problem) => problem.includes('attic')).length, 1, problems.join('\n'))
})

test('savedState_ofARoomTheCatalogNoLongerHas_doesNotFit', () => {
  const savedState = { ...(new TestTeaSession().savedState as object), roomId: 'attic' }

  const problems = problemsResuming(savedState)

  assert.equal(problems.filter((problem) => problem.includes('attic')).length, 1, problems.join('\n'))
})

test('savedState_withACupOnAPlaceTheRoomLost_doesNotFit', () => {
  const session = new TestTeaSession(catalogWithRoomChanges({ places: ['table', 'window'] }))
  session.do({ type: 'pickUp', itemId: 'cup1' })
  session.do({ type: 'standAt', placeId: 'window' })
  session.do({ type: 'putDown', itemId: 'cup1', spot: { placeId: 'window', x: 0, y: 0, z: 0 } })
  session.do({ type: 'standAt', placeId: 'table' })

  const problems = problemsResuming(session.savedState)

  assert.equal(problems.filter((problem) => problem.includes('cup1') && problem.includes('window')).length, 1, problems.join('\n'))
})

test('savedState_whoseMiddleHandHoldsAnItemBeforeItGrew_doesNotFit', () => {
  const savedState = new TestTeaSession().savedState as { vessels: Record<string, Record<string, unknown>> }
  const cup = savedState.vessels['cup1']
  if (cup !== undefined) cup['location'] = { kind: 'inHand', handIndex: 2 }

  const problems = problemsResuming(savedState)

  assert.deepEqual(problems, ['the middle hand holds cup1, though it has not grown'])
})

function problemsResuming(savedState: unknown, catalog: Catalog = testCatalog()): readonly string[] {
  const resuming = TeaSession.resume(catalog, savedState, sessionStateVersion, new RecordingLog(), true)
  return resuming.kind === 'opened' ? [] : resuming.problems
}

function catalogWithANewHeater(): Catalog {
  const catalog = testCatalog()
  const heater = catalog.heaters['testHeater']
  if (heater === undefined) throw new Error('the test catalog lost its heater')
  return catalogWithRoomChanges({ heaterId: 'newHeater' }, { ...catalog, heaters: { newHeater: { ...heater, id: 'newHeater' } } })
}
