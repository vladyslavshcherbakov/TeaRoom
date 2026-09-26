import assert from 'node:assert/strict'
import test from 'node:test'
import type { ScreenPoint } from '../../../Apps/Game/Room/RoomGestures.ts'
import type { RoomTapTarget } from '../../../Apps/Game/Room/RoomPlay.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { onTopOf, TestRoom, withoutTheTurn } from '../../Support/TestRoom.ts'
import { wetMlOnEveryPlace } from '../../../Shared/Simulation/Ritual/Puddles.ts'

const onTheCounter = onTopOf('counter', 0.4, 0.05)
const onTheCounterBesideTheBowl = onTopOf('counter', 1, 0.05)
const pixelsPerMetre = 100
const whereTheFingerStarts: ScreenPoint = { x: 0, y: 0 }
const onTheCounterLeftOfTheHeater: ScreenPoint = { x: 40, y: 700 }
const counterLeftOfTheHeater = onTopOf('counter', -0.2, 0.15)

test('bowl_whenTappedWithTheKettleChosen_isAimedAtWithoutPouring', () => {
  const room = new TestRoom()
  bringABowlToTheCounterAndTakeTheKettle(room)
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.equal(room.play.aimedPourView?.targetId, 'bowl1')
  assert.equal(room.state.pour, null)
})

test('pour_whileTiltIsHeldWithTheSpoutMovedOverTheBowl_landsEntirelyInTheBowl', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)
  room.moveTheSpout({ x: 0.22, z: 0 })

  room.play.tiltPressed()
  room.advance(2)

  assert.equal(room.state.pour?.streamOnTargetFraction, 1)
  assert.ok((room.state.vessels['bowl1']?.liquid.volumeMl ?? 0) > 0)
})

test('pour_whenTheSpoutIsMovedOverAnotherBowl_fillsThatBowl', () => {
  const room = new TestRoom()
  aimTheKettleAtTheFirstOfTwoBowls(room)
  room.moveTheSpout({ x: 0.22 + onTheCounterBesideTheBowl.x - onTheCounter.x, z: 0 })

  room.play.tiltPressed()
  room.advance(2)

  assert.equal(room.play.aimedPourView?.targetId, 'bowl2')
  assert.equal(room.state.vessels['bowl1']?.liquid.volumeMl, 0)
  assert.ok((room.state.vessels['bowl2']?.liquid.volumeMl ?? 0) > 0)
})

test('pour_whenTheSpoutMovesToAnotherBowlWhilePouring_carriesOnIntoThatBowl', () => {
  const room = new TestRoom()
  aimTheKettleAtTheFirstOfTwoBowls(room)
  room.moveTheSpout({ x: 0.22, z: 0 })
  room.play.tiltPressed()
  room.advance(2)

  room.moveTheSpout({ x: onTheCounterBesideTheBowl.x - onTheCounter.x, z: 0 })
  room.advance(2)

  assert.ok((room.state.vessels['bowl1']?.liquid.volumeMl ?? 0) > 0)
  assert.ok((room.state.vessels['bowl2']?.liquid.volumeMl ?? 0) > 0)
  assert.equal(room.state.pour?.targetId, 'bowl2')
})

test('pour_whileTiltIsHeldWithTheSpoutBesideTheBowl_wetsTheTableAndNotTheBowl', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.play.tiltPressed()
  room.advance(2)

  assert.equal(room.state.vessels['bowl1']?.liquid.volumeMl, 0)
  assert.ok(wetMlOnEveryPlace(room.state) > 0)
})

test('pour_whileTiltIsHeldWithTheSpoutBesideTheBowl_puddlesUnderTheSpoutAndNotAroundTheBowl', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)
  const spout = room.play.aimedPourView?.spout

  room.play.tiltPressed()
  room.advance(2)

  const puddleCentre = room.state.puddles['counter']?.spilledAround
  assertNear(puddleCentre?.x ?? Infinity, spout?.x ?? 0)
  assertNear(puddleCentre?.z ?? Infinity, spout?.z ?? 0)
})

test('pour_whenTheTiltButtonIsReleased_stopsAsTheKettleTiltsBack', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)
  room.moveTheSpout({ x: 0.22, z: 0 })
  room.play.tiltPressed()
  room.advance(2)

  room.play.tiltReleased()
  room.advance(1)

  assert.equal(room.state.pour, null)
  assert.equal(room.play.aimedPourView?.tiltDegrees, 0)
})

test('pourAim_whenDone_endsWithTheKettleStillInHand', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.play.pourDone()

  assert.equal(room.play.aimedPourView, null)
  assert.equal(room.state.keeper.hands[0], 'kettle')
})

test('kettle_whenASurfaceIsTappedWhileAiming_isPutDownThere', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.play.aimingTapped({ kind: 'surface', furnitureId: 'counter', point: { x: -2, y: 0.9, z: -2.5 } })

  assert.equal(room.play.aimedPourView, null)
  assert.deepEqual(withoutTheTurn(room.state.vessels['kettle']?.location), { kind: 'onSurface', spot: { placeId: 'counter', x: -2, y: 0.9, z: -2.5 } })
})

test('kettle_whenTheBowlIsTappedWhileAiming_returnsToItsHand', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.play.aimingTapped({ kind: 'item', itemId: 'bowl1' })

  assert.equal(room.play.aimedPourView, null)
  assert.equal(room.state.keeper.hands[0], 'kettle')
})

test('pour_whenAimedAtABowlOnTheShelf_startsFromTheLeftOfTheScreenAndNotFromBehindTheShelf', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.walkTo('shelf')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'item', itemId: 'bowl1' })

  const spout = room.play.aimedPourView?.spout
  assertNear(spout?.x ?? 0, -2.772, 0.001)
  assertNear(spout?.z ?? 0, 0.319, 0.001)
})

test('pour_whenTheTiltIsHeldOverTheMiddleOfAnEmptyBowl_spillsNothingOnTheTable', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)
  room.moveTheSpout({ x: 0.22, z: 0 })

  room.play.tiltPressed()
  room.advance(3)

  assert.equal(wetMlOnEveryPlace(room.state), 0)
  assert.ok((room.state.vessels['bowl1']?.liquid.volumeMl ?? 0) > 0, 'the bowl stayed empty')
})

test('thermosLid_whenTheClosedThermosIsAimedAtABowl_opens', () => {
  const room = new TestRoom()

  aimTheClosedThermosAtTheBowl(room)

  assert.equal(room.state.vessels['thermos']?.isLidOpen, true)
  assert.equal(room.play.aimedPourView?.targetId, 'bowl1')
})

test('thermosLid_whenTappedWhileAiming_closesAndKeepsTheAim', () => {
  const room = new TestRoom()
  aimTheClosedThermosAtTheBowl(room)

  room.play.aimingTapped({ kind: 'lid', itemId: 'thermos' })

  assert.equal(room.state.vessels['thermos']?.isLidOpen, false)
  assert.equal(room.play.aimedPourView?.sourceId, 'thermos')
})

test('lids_whenTheClosedThermosIsAimedAtTheClosedKettle_bothOpen', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'thermos' })
  room.fillInTheSink('thermos')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.state.vessels['thermos']?.isLidOpen, true)
  assert.equal(room.state.vessels['kettle']?.isLidOpen, true)
  assert.equal(room.play.aimedPourView?.targetId, 'kettle')
})

test('kettleLid_whenTappedWithTheClosedThermosChosen_opensBothLidsAndAimsAtTheKettle', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'thermos' })
  room.fillInTheSink('thermos')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'lid', itemId: 'kettle' })

  assert.equal(room.state.vessels['thermos']?.isLidOpen, true)
  assert.equal(room.state.vessels['kettle']?.isLidOpen, true)
  assert.equal(room.play.aimedPourView?.targetId, 'kettle')
})

test('thermos_whenTappedAfterATapOnTheLidOfTheKettleInHand_isAimedAtAndNotTaken', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.session.dispatch({ type: 'closeVesselLid', vesselId: 'kettle' })
  room.tap({ kind: 'lid', itemId: 'kettle' })

  room.tap({ kind: 'item', itemId: 'thermos' })

  assert.equal(room.play.aimedPourView?.targetId, 'thermos')
  assert.deepEqual(room.state.keeper.hands, ['kettle', null, null])
})

test('kettle_whenTappedWithTheEmptyThermosChosen_isAimedAtAndNotTaken', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'thermos' })

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.play.aimedPourView?.targetId, 'kettle')
  assert.deepEqual(room.state.keeper.hands, ['thermos', null, null])
})

test('pour_fromTheClosedThermosIntoTheClosedKettle_starts', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'thermos' })
  room.fillInTheSink('thermos')
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.play.tiltPressed()
  room.advance(2)

  assert.equal(room.state.pour?.sourceId, 'thermos')
})

test('kettleLid_whenTheKettleIsAimedAtTheClosedThermos_staysClosedWhileTheThermosOpens', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.session.dispatch({ type: 'closeVesselLid', vesselId: 'kettle' })
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'item', itemId: 'thermos' })

  assert.equal(room.state.vessels['kettle']?.isLidOpen, false)
  assert.equal(room.state.vessels['thermos']?.isLidOpen, true)
})

test('aimingFinger_whenMovedFurtherThanTwelvePixels_movesTheSpoutAndKeepsTheAim', () => {
  const room = roomWithAScreen()
  aimTheKettleAtTheBowl(room)
  const spoutBefore = room.play.aimedPourView?.spout ?? { x: Number.NaN, z: Number.NaN }

  room.gestures.fingerDown(1, whereTheFingerStarts)
  room.gestures.fingerMoved(1, { x: 22, y: 0 })
  room.gestures.fingerUp(1)

  assertNear(room.play.aimedPourView?.spout.x ?? Number.NaN, spoutBefore.x + 0.22)
  assert.equal(room.state.keeper.hands[0], 'kettle')
})

test('aimingFinger_whenLiftedWithoutMoving_putsTheKettleDownWhereItTouched', () => {
  const room = roomWithAScreen()
  aimTheKettleAtTheBowl(room)

  room.gestures.fingerDown(1, onTheCounterLeftOfTheHeater)
  room.gestures.fingerUp(1)

  assert.equal(room.play.aimedPourView, null)
  assert.deepEqual(withoutTheTurn(room.state.vessels['kettle']?.location), { kind: 'onSurface', spot: { placeId: 'counter', ...counterLeftOfTheHeater } })
})

test('secondFinger_whileAFingerAims_isIgnored', () => {
  const room = roomWithAScreen()
  aimTheKettleAtTheBowl(room)
  const spoutBefore = room.play.aimedPourView?.spout ?? { x: Number.NaN, z: Number.NaN }
  room.gestures.fingerDown(1, whereTheFingerStarts)

  room.gestures.fingerDown(2, onTheCounterLeftOfTheHeater)
  room.gestures.fingerUp(2)
  room.gestures.fingerMoved(1, { x: 22, y: 0 })
  room.gestures.fingerUp(1)

  assertNear(room.play.aimedPourView?.spout.x ?? Number.NaN, spoutBefore.x + 0.22)
  assert.equal(room.state.keeper.hands[0], 'kettle')
})

function bringABowlToTheCounterAndTakeTheKettle(room: TestRoom): void {
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')
  room.putDown(0, onTheCounter)
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
}

function aimTheKettleAtTheFirstOfTwoBowls(room: TestRoom): void {
  room.carryFromTheShelf('bowl1', 'bowl2')
  room.walkTo('counter')
  room.putDown(0, onTheCounter)
  room.putDown(1, onTheCounterBesideTheBowl)
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'item', itemId: 'bowl1' })
}

function aimTheClosedThermosAtTheBowl(room: TestRoom): void {
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')
  room.putDown(0, onTheCounter)
  room.session.dispatch({ type: 'pickUp', itemId: 'thermos' })
  room.fillInTheSink('thermos')
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'item', itemId: 'bowl1' })
}

function aimTheKettleAtTheBowl(room: TestRoom): void {
  bringABowlToTheCounterAndTakeTheKettle(room)
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'item', itemId: 'bowl1' })
}

function roomWithAScreen(): TestRoom {
  return new TestRoom({ screen: () => ({ tapTargetAt: targetOnTheScreenAt, aimPointAt: (point) => ({ x: point.x / pixelsPerMetre, z: point.y / pixelsPerMetre }) }) })
}

function targetOnTheScreenAt(point: ScreenPoint): RoomTapTarget {
  const isOnTheCounter = point.x === onTheCounterLeftOfTheHeater.x && point.y === onTheCounterLeftOfTheHeater.y
  return isOnTheCounter ? { kind: 'surface', furnitureId: 'counter', point: counterLeftOfTheHeater } : { kind: 'nothing' }
}
