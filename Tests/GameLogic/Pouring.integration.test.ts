import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, fullFlowTiltDegrees, TestTeaSession } from '../Support/TestTeaSession.ts'
import { wetMlOnEveryPlace } from '../../Shared/GameLogic/Simulation/Puddles.ts'

test('pour_whenTiltedBelowTheThreshold_movesNoWater', () => {
  const session = new TestTeaSession()

  session.pour('kettle', 'cup1', 5, 8)

  assert.equal(session.vessel('cup1').liquid.volumeMl, 0)
  assert.equal(session.vessel('kettle').liquid.volumeMl, 500)
})

test('pour_whenTiltedHalfwayForFiveSeconds_movesFiftyMillilitres', () => {
  const session = new TestTeaSession()

  const events = session.pour('kettle', 'cup1', 5)

  assertNear(session.vessel('cup1').liquid.volumeMl, 50)
  assertNear(session.vessel('kettle').liquid.volumeMl, 450)
  const [finished] = eventsOfType(events, 'pourFinished')
  assertNear(finished?.pouredMl ?? -1, 50)
  assertNear(finished?.spilledMl ?? -1, 0)
})

test('pour_whenHalfTheStreamMissesTheCup_spillsTheOtherHalfOnTheTable', () => {
  const session = new TestTeaSession()

  const events = session.pour('kettle', 'cup1', 5, undefined, 0.5)

  assertNear(session.vessel('cup1').liquid.volumeMl, 25)
  const [finished] = eventsOfType(events, 'pourFinished')
  assertNear(finished?.spilledMl ?? -1, 25)
  assert.ok(wetMlOnEveryPlace(session.state) > 20, `table holds only ${wetMlOnEveryPlace(session.state)} ml`)
})

test('pour_whenFast_splashesATenthOfTheStream', () => {
  const session = new TestTeaSession()

  const events = session.pour('kettle', 'cup1', 4, fullFlowTiltDegrees)

  assertNear(session.vessel('cup1').liquid.volumeMl, 72)
  assertNear(eventsOfType(events, 'pourFinished')[0]?.spilledMl ?? -1, 8)
})

test('pour_atFullFlowIntoTheWideCaddy_splashesNothing', () => {
  const session = new TestTeaSession()
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })

  const events = session.pour('kettle', 'caddy', 4, fullFlowTiltDegrees)

  assertNear(session.vessel('caddy').liquid.volumeMl, 80)
  assertNear(eventsOfType(events, 'pourFinished')[0]?.spilledMl ?? -1, 0)
})

test('cup_whenPouredPastItsBrim_overflowsOntoTheTableOnce', () => {
  const session = new TestTeaSession()

  const events = session.pour('kettle', 'cup1', 15)

  assertNear(session.vessel('cup1').liquid.volumeMl, 100)
  assertNear(eventsOfType(events, 'pourFinished')[0]?.spilledMl ?? -1, 50)
  assert.deepEqual(eventsOfType(events, 'vesselOverflowed'), [{ type: 'vesselOverflowed', vesselId: 'cup1' }])
})

test('cup_whenFullOfColdWaterAndACupfulOfBoilingWaterIsPouredIn_isWarmerThan60C', () => {
  const session = new TestTeaSession()
  session.pour('kettle', 'cup1', 10)
  session.heatKettleTo(100)

  session.pour('kettle', 'cup1', 10)

  assert.ok(session.vessel('cup1').liquid.temperatureC > 60, `the cup is at ${session.vessel('cup1').liquid.temperatureC} °C`)
})

test('pour_whenStoppedAbruptly_leavesNoStreamRunning', () => {
  const session = new TestTeaSession()
  session.pour('kettle', 'cup1', 3)

  session.wait(5)

  assertNear(session.vessel('cup1').liquid.volumeMl, 30)
  assert.equal(session.state.pour, null)
})

test('pour_whileAnotherPourRuns_isRefusedAndTheFirstGoesOn', () => {
  const session = new TestTeaSession()
  session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  const events = session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup2' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startPouring', reason: 'alreadyPouring' }])
  assert.equal(session.state.pour?.targetId, 'cup1')
})

test('pour_fromAVesselIntoItself_isRefused', () => {
  const session = new TestTeaSession()
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })

  const events = session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startPouring', reason: 'cannotPourIntoItself' }])
})

test('pour_intoAVesselTheRoomDoesNotHave_isRefused', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'teapot' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startPouring', reason: 'unknownVessel' }])
})

test('tilt_withNoPourRunning_isRefused', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'adjustPour', tiltDegrees: 30, streamOnTargetFraction: 1, missedStreamLandsAt: null })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'adjustPour', reason: 'notPouring' }])
})

test('stoppingAPour_withNoPourRunning_isRefused', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'stopPouring' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'stopPouring', reason: 'notPouring' }])
})

test('cup_whileTheKettlePoursIntoIt_cannotBePickedUp', () => {
  const session = new TestTeaSession()
  session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  const events = session.do({ type: 'pickUp', itemId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUp', reason: 'vesselIsBeingPoured' }])
})

test('thermos_whenItsLidIsClosed_refusesWater', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startPouring', reason: 'lidClosed' }])
  assert.equal(session.state.pour, null)
})

test('thermosLid_whileTheKettlePoursIntoIt_cannotBeClosed', () => {
  const session = new TestTeaSession()
  session.do({ type: 'openVesselLid', vesselId: 'thermos' })
  session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'thermos' })

  const events = session.do({ type: 'closeVesselLid', vesselId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'closeVesselLid', reason: 'vesselIsBeingPoured' }])
  assert.equal(session.vessel('thermos').isLidOpen, true)
})

test('kettle_whileOnTheHeater_cannotBePoured', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })

  const events = session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startPouring', reason: 'vesselIsOnTheHeater' }])
})

test('emptyVessel_whenTilted_refusesToPour', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'startPouring', sourceId: 'cup1', targetId: 'cup2' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startPouring', reason: 'sourceIsEmpty' }])
})

test('pouredWater_carriesItsTemperatureIntoTheCup', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  const kettleTemperatureC = session.vessel('kettle').liquid.temperatureC

  session.pour('kettle', 'cup1', 5)

  assertNear(session.vessel('cup1').liquid.temperatureC, kettleTemperatureC)
})

test('cup_whenHotWaterMeetsColdWater_settlesInBetween', () => {
  const session = new TestTeaSession()
  session.pour('kettle', 'cup1', 5)
  session.heatKettleTo(60)

  session.pour('kettle', 'cup1', 5)

  assertNear(session.vessel('cup1').liquid.volumeMl, 100)
  assertNear(session.vessel('cup1').liquid.temperatureC, 40, 0.2)
})

test('thermos_whenFilledAndClosed_keepsWaterHotterThanTheKettle', () => {
  const session = new TestTeaSession(testCatalog({ kettle: 0.003, thermos: 0.0004 }))
  session.heatKettleTo(90)
  session.do({ type: 'openVesselLid', vesselId: 'thermos' })
  session.pour('kettle', 'thermos', 25)
  session.do({ type: 'closeVesselLid', vesselId: 'thermos' })

  session.wait(300)

  const thermosC = session.vessel('thermos').liquid.temperatureC
  const kettleC = session.vessel('kettle').liquid.temperatureC
  assert.ok(thermosC > kettleC + 20, `thermos ${thermosC} °C, kettle ${kettleC} °C`)
})
