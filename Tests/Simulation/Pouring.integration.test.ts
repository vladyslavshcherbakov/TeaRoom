import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, fullFlowTiltDegrees, TestRitual } from '../Support/TestRitual.ts'
import { wetMlOnEveryPlace } from '../../Shared/Simulation/Ritual/Puddles.ts'

test('pour_whenTiltedBelowTheThreshold_movesNoWater', () => {
  const ritual = TestRitual.begun()

  ritual.pour('kettle', 'cup1', 5, 8)

  assert.equal(ritual.vessel('cup1').liquid.volumeMl, 0)
  assert.equal(ritual.vessel('kettle').liquid.volumeMl, 500)
})

test('pour_whenTiltedHalfwayForFiveSeconds_movesFiftyMillilitres', () => {
  const ritual = TestRitual.begun()

  const events = ritual.pour('kettle', 'cup1', 5)

  assertNear(ritual.vessel('cup1').liquid.volumeMl, 50)
  assertNear(ritual.vessel('kettle').liquid.volumeMl, 450)
  const [finished] = eventsOfType(events, 'pourFinished')
  assertNear(finished?.pouredMl ?? -1, 50)
  assertNear(finished?.spilledMl ?? -1, 0)
})

test('pour_whenHalfTheStreamMissesTheCup_spillsTheOtherHalfOnTheTable', () => {
  const ritual = TestRitual.begun()

  const events = ritual.pour('kettle', 'cup1', 5, undefined, 0.5)

  assertNear(ritual.vessel('cup1').liquid.volumeMl, 25)
  const [finished] = eventsOfType(events, 'pourFinished')
  assertNear(finished?.spilledMl ?? -1, 25)
  assert.ok(wetMlOnEveryPlace(ritual.state) > 20, `table holds only ${wetMlOnEveryPlace(ritual.state)} ml`)
})

test('pour_whenFast_splashesATenthOfTheStream', () => {
  const ritual = TestRitual.begun()

  const events = ritual.pour('kettle', 'cup1', 4, fullFlowTiltDegrees)

  assertNear(ritual.vessel('cup1').liquid.volumeMl, 72)
  assertNear(eventsOfType(events, 'pourFinished')[0]?.spilledMl ?? -1, 8)
})

test('pour_atFullFlowIntoTheWideCaddy_splashesNothing', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })

  const events = ritual.pour('kettle', 'caddy', 4, fullFlowTiltDegrees)

  assertNear(ritual.vessel('caddy').liquid.volumeMl, 80)
  assertNear(eventsOfType(events, 'pourFinished')[0]?.spilledMl ?? -1, 0)
})

test('cup_whenPouredPastItsBrim_overflowsOntoTheTableOnce', () => {
  const ritual = TestRitual.begun()

  const events = ritual.pour('kettle', 'cup1', 15)

  assertNear(ritual.vessel('cup1').liquid.volumeMl, 100)
  assertNear(eventsOfType(events, 'pourFinished')[0]?.spilledMl ?? -1, 50)
  assert.deepEqual(eventsOfType(events, 'vesselOverflowed'), [{ type: 'vesselOverflowed', vesselId: 'cup1' }])
})

test('cup_whenFullOfColdWaterAndACupfulOfBoilingWaterIsPouredIn_isWarmerThan60C', () => {
  const ritual = TestRitual.begun()
  ritual.pour('kettle', 'cup1', 10)
  ritual.heatKettleTo(100)

  ritual.pour('kettle', 'cup1', 10)

  assert.ok(ritual.vessel('cup1').liquid.temperatureC > 60, `the cup is at ${ritual.vessel('cup1').liquid.temperatureC} °C`)
})

test('pour_whenStoppedAbruptly_leavesNoStreamRunning', () => {
  const ritual = TestRitual.begun()
  ritual.pour('kettle', 'cup1', 3)

  ritual.wait(5)

  assertNear(ritual.vessel('cup1').liquid.volumeMl, 30)
  assert.equal(ritual.state.pour, null)
})

test('thermos_whenItsLidIsClosed_refusesWater', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startPouring', reason: 'lidClosed' }])
  assert.equal(ritual.state.pour, null)
})

test('kettle_whileOnTheHeater_cannotBePoured', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })

  const events = ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startPouring', reason: 'vesselIsOnTheHeater' }])
})

test('emptyVessel_whenTilted_refusesToPour', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'startPouring', sourceId: 'cup1', targetId: 'cup2' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'startPouring', reason: 'sourceIsEmpty' }])
})

test('pouredWater_carriesItsTemperatureIntoTheCup', () => {
  const ritual = TestRitual.begun()
  ritual.heatKettleTo(80)
  const kettleTemperatureC = ritual.vessel('kettle').liquid.temperatureC

  ritual.pour('kettle', 'cup1', 5)

  assertNear(ritual.vessel('cup1').liquid.temperatureC, kettleTemperatureC)
})

test('cup_whenHotWaterMeetsColdWater_settlesInBetween', () => {
  const ritual = TestRitual.begun()
  ritual.pour('kettle', 'cup1', 5)
  ritual.heatKettleTo(60)

  ritual.pour('kettle', 'cup1', 5)

  assertNear(ritual.vessel('cup1').liquid.volumeMl, 100)
  assertNear(ritual.vessel('cup1').liquid.temperatureC, 40, 0.2)
})

test('thermos_whenFilledAndClosed_keepsWaterHotterThanTheKettle', () => {
  const ritual = TestRitual.begun(testCatalog({ kettle: 0.003, thermos: 0.0004 }))
  ritual.heatKettleTo(90)
  ritual.do({ type: 'openVesselLid', vesselId: 'thermos' })
  ritual.pour('kettle', 'thermos', 25)
  ritual.do({ type: 'closeVesselLid', vesselId: 'thermos' })

  ritual.wait(300)

  const thermosC = ritual.vessel('thermos').liquid.temperatureC
  const kettleC = ritual.vessel('kettle').liquid.temperatureC
  assert.ok(thermosC > kettleC + 20, `thermos ${thermosC} °C, kettle ${kettleC} °C`)
})
