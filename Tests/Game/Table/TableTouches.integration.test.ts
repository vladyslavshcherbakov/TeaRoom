import assert from 'node:assert/strict'
import test from 'node:test'
import {
  caddyHome,
  clothHome,
  figurineHomes,
  heaterPlate,
  heaterSwitch,
  kettleOnHeater,
  puddleCentre,
  spoonHome,
  vesselHomes,
  type ScenePoint,
} from '../../../Apps/Game/Table/TableLayout.ts'
import { TableTouches } from '../../../Apps/Game/Table/Touch/TableTouches.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { RitualSession } from '../../../Shared/Simulation/Ritual/RitualSession.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { RecordingLog } from '../../Support/RecordingLog.ts'
import { Finger } from './Finger.ts'

function place(point: ScenePoint | undefined): ScenePoint {
  if (point === undefined) throw new Error('the layout lost a place the test relies on')
  return { x: point.x, y: point.y }
}

const kettle = place(vesselHomes.kettle)
const thermos = place(vesselHomes.thermos)
const bowl1 = place(vesselHomes.bowl1)
const toadSaucer = { x: place(figurineHomes.toad).x, y: place(figurineHomes.toad).y + 44 }
const pressingIntoBowl1At30Degrees = { x: bowl1.x, y: bowl1.y + 6 }

function tableInQuietRoom() {
  const log = new RecordingLog()
  const opening = RitualSession.open(defaultCatalog, 'quietRoom', log, true)
  if (opening.kind !== 'opened') throw new Error('the quiet room did not open')
  const session = opening.session
  session.dispatch({ type: 'beginRitual', teaId: 'sencha' })
  const touches = new TableTouches(session)
  return { session, touches, finger: new Finger(touches), log }
}

function vessel(session: RitualSession, id: string) {
  const found = session.state.vessels[id]
  if (found === undefined) throw new Error(`the quiet room has no vessel "${id}"`)
  return found
}

test('kettle_whenTapped_opensItsLidAndClosesItOnTheNextTap', () => {
  const { session, finger } = tableInQuietRoom()

  finger.tap(kettle)
  const isOpenAfterFirstTap = vessel(session, 'kettle').isLidOpen
  finger.tap(kettle)

  assert.equal(isOpenAfterFirstTap, true)
  assert.equal(vessel(session, 'kettle').isLidOpen, false)
})

test('touch_whenItMovesLessThanTheDragThreshold_countsAsATap', () => {
  const { session, finger } = tableInQuietRoom()

  finger.drag([kettle, { x: kettle.x + 5, y: kettle.y + 3 }])

  assert.equal(vessel(session, 'kettle').isLidOpen, true)
})

test('caddy_whenTapped_opens', () => {
  const { session, finger } = tableInQuietRoom()

  finger.tap(caddyHome)

  assert.equal(session.state.caddy.isOpen, true)
})

test('heaterSwitch_whenTapped_switchesTheHeaterOnAndThenOff', () => {
  const { session, finger } = tableInQuietRoom()

  finger.tap(heaterSwitch)
  const isOnAfterFirstTap = session.state.heater.isOn
  finger.tap(heaterSwitch)

  assert.equal(isOnAfterFirstTap, true)
  assert.equal(session.state.heater.isOn, false)
})

test('kettle_whenDraggedOntoTheHeater_standsOnIt', () => {
  const { session, touches, finger } = tableInQuietRoom()

  finger.drag([kettle, heaterPlate])

  assert.equal(session.state.heater.vesselIdOnTop, 'kettle')
  assert.deepEqual(touches.poseOf('kettle'), { ...kettleOnHeater, tiltDegrees: 0, isHeld: false })
})

test('kettle_whenLiftedOffTheHeater_isTakenOffAndGoesHome', () => {
  const { session, touches, finger } = tableInQuietRoom()
  finger.drag([kettle, heaterPlate])

  finger.drag([kettleOnHeater, { x: 200, y: 300 }])

  assert.equal(session.state.heater.vesselIdOnTop, null)
  assert.deepEqual(touches.poseOf('kettle'), { ...kettle, tiltDegrees: 0, isHeld: false })
})

test('kettle_whenPressedDownIntoABowl_tiltsAndPoursWhileHeld', () => {
  const { session, touches, finger } = tableInQuietRoom()
  finger.press(kettle)
  finger.slideThrough([kettle, pressingIntoBowl1At30Degrees], 400)
  const tiltWhilePressed = touches.poseOf('kettle').tiltDegrees

  session.advance(2)
  finger.lift(pressingIntoBowl1At30Degrees)

  assertNear(tiltWhilePressed, 30)
  assertNear(vessel(session, 'bowl1').liquid.volumeMl, 28.571, 0.01)
  assert.equal(session.state.pour, null)
})

test('kettle_whenCarriedOverBowlsWithoutPressing_poursNothing', () => {
  const { session, finger } = tableInQuietRoom()

  finger.drag([kettle, { x: 195, y: 620 }, { x: 110, y: 620 }, { x: 280, y: 620 }])

  for (const bowlId of ['bowl1', 'bowl2', 'bowl3']) assert.equal(vessel(session, bowlId).liquid.volumeMl, 0, bowlId)
  assert.equal(session.state.pour, null)
})

test('closedThermos_whenPouredInto_refusesOnceForTheWholePress', () => {
  const { finger, log } = tableInQuietRoom()
  const pressingIntoTheThermos = { x: thermos.x, y: thermos.y - 40 }
  const aboveTheThermos = { x: thermos.x, y: thermos.y - 150 }

  finger.drag([kettle, aboveTheThermos, pressingIntoTheThermos, { x: thermos.x + 4, y: thermos.y - 30 }, pressingIntoTheThermos])

  const refusals = log.messagesAt('info').filter((message) => message.includes('startPouring refused (lidClosed)'))
  assert.equal(refusals.length, 1)
})

test('spoon_whenDippedIntoTheOpenCaddyAndTippedOverTheOpenKettle_addsLeaves', () => {
  const { session, finger } = tableInQuietRoom()
  finger.tap(caddyHome)
  finger.tap(kettle)
  const caddyBottomOfMouth = { x: caddyHome.x, y: caddyHome.y - caddyHome.height / 2 + 40 }
  const overTheKettle = { x: kettle.x, y: kettle.y - 45 }

  finger.drag([spoonHome, { x: caddyHome.x, y: caddyHome.y - 60 }, caddyBottomOfMouth, { x: caddyHome.x, y: 520 }, overTheKettle])

  assertNear(vessel(session, 'kettle').leaves?.grams ?? 0, 3)
  assert.equal(session.state.spoon.grams, 0)
})

function wetTableAfterWipingAcrossThePuddleIn(strokeMs: number): number {
  const { session, finger } = tableInQuietRoom()
  session.dispatch({ type: 'startPouring', sourceId: 'kettle', targetId: null })
  session.dispatch({ type: 'adjustPour', tiltDegrees: 27.5, streamOnTargetFraction: 1 })
  session.advance(2)
  session.dispatch({ type: 'stopPouring' })
  const besideThePuddle = { x: puddleCentre.x - 70, y: puddleCentre.y }
  const pastThePuddle = { x: puddleCentre.x + 70, y: puddleCentre.y }
  finger.press(clothHome)
  finger.slideThrough([clothHome, besideThePuddle], 300)
  finger.slideThrough([besideThePuddle, pastThePuddle], strokeMs)
  finger.lift(pastThePuddle)
  return session.state.tableWetMl
}

test('cloth_whenDrawnSlowlyAcrossThePuddle_wipesMoreThanAQuickSwipe', () => {
  const wetAfterSlowStrokeMl = wetTableAfterWipingAcrossThePuddleIn(1200)
  const wetAfterQuickSwipeMl = wetTableAfterWipingAcrossThePuddleIn(200)

  assert.ok(wetAfterSlowStrokeMl < 10, `slow stroke left ${wetAfterSlowStrokeMl} ml of 25`)
  assert.ok(wetAfterQuickSwipeMl > 15, `quick swipe left ${wetAfterQuickSwipeMl} ml of 25`)
})

test('bowl_whenSetBeforeAFigurine_isOfferedToIt', () => {
  const { session, finger } = tableInQuietRoom()
  finger.press(kettle)
  finger.slideThrough([kettle, pressingIntoBowl1At30Degrees], 400)
  session.advance(3)
  finger.lift(pressingIntoBowl1At30Degrees)

  finger.drag([bowl1, toadSaucer])

  assert.equal(session.state.figurines.toad?.wasOfferedTeaThisRitual, true)
  assert.equal(vessel(session, 'bowl1').liquid.volumeMl, 0)
})

test('bowl_whenRaisedToTheViewer_isTasted', () => {
  const { session, finger } = tableInQuietRoom()
  finger.press(kettle)
  finger.slideThrough([kettle, pressingIntoBowl1At30Degrees], 400)
  session.advance(3)
  finger.lift(pressingIntoBowl1At30Degrees)
  const volumeBeforeSipMl = vessel(session, 'bowl1').liquid.volumeMl

  finger.drag([bowl1, { x: 195, y: 150 }])

  assertNear(vessel(session, 'bowl1').liquid.volumeMl, volumeBeforeSipMl - 20)
})

test('kettle_whenLiftedOffTheHeater_staysUnderTheFinger', () => {
  const { touches, finger } = tableInQuietRoom()
  finger.drag([kettle, heaterPlate])
  const liftedTo = { x: 140, y: 380 }

  finger.press(kettleOnHeater)
  finger.slideThrough([kettleOnHeater, liftedTo], 300)

  assert.deepEqual(touches.poseOf('kettle'), { ...liftedTo, tiltDegrees: 0, isHeld: true })
})

test('bowl_whenCarriedUpwardThroughTheOpenKettle_poursNothingIntoIt', () => {
  const { session, finger, log } = tableInQuietRoom()
  finger.press(kettle)
  finger.slideThrough([kettle, pressingIntoBowl1At30Degrees], 400)
  session.advance(3)
  finger.lift(pressingIntoBowl1At30Degrees)
  finger.tap(kettle)

  finger.drag([bowl1, { x: 195, y: 150 }])

  assert.ok(!log.messagesAt('info').some((message) => message.includes('pour started from bowl1')), log.messagesAt('info').join('\n'))
})

test('spoon_whenPassingUpThroughTheOpenCaddy_scoopsNothing', () => {
  const { session, finger } = tableInQuietRoom()
  finger.tap(caddyHome)

  finger.drag([spoonHome, { x: caddyHome.x, y: spoonHome.y }, { x: caddyHome.x, y: 480 }])

  assert.equal(session.state.spoon.grams, 0)
})
