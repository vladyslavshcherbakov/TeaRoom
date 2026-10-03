import assert from 'node:assert/strict'
import test from 'node:test'
import type { FloorPoint, WorldPoint } from '../../../Apps/Engine/Points.ts'
import type { TapTarget } from '../../../Apps/Game/Room/Input/TapTarget.ts'
import { frameSeconds, onTheTeaTable, onTopOf, screenShowing, spotOn, TestRoom, whereTheTeaTableIsSet } from '../../Support/TestRoom.ts'
import { fullFlowTiltDegrees } from '../../Support/TestTeaSession.ts'
import type { FurnitureId } from '../../../Apps/Game/Room/Layout/RoomLayout.ts'
import type { ScreenPoint } from '../../../Apps/Engine/ScreenPoint.ts'
import type { ScreenReader } from '../../../Apps/Game/Room/Input/TouchInput.ts'
import { wetMlOnEveryPlace } from '../../../Shared/GameLogic/Simulation/Puddles.ts'

const framesInFiveSeconds = 300
const halfASecond = 0.5
const acrossThePuddleFrom = onTopOf('teaTable', -0.5, -0.05)
const acrossThePuddleTo = onTopOf('teaTable', 0.25, -0.05)
const farFromThePuddleFrom = onTopOf('teaTable', 0.3, -0.35)
const farFromThePuddleTo = onTopOf('teaTable', 0.6, -0.35)
const inTheTablesFarRightCorner = onTopOf('teaTable', 0.45, -0.15)
const inThePuddle = onTopOf('teaTable', -0.5, 0.1)
const acrossTheCountersPuddleFrom = onTopOf('counter', -0.3, 0.1)
const acrossTheCountersPuddleTo = onTopOf('counter', 0.1, 0.1)

test('table_whenStrokedWithTheClothOneAndAHalfMetresInTenSeconds_isWipedSlowlyAllOver', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.testSession.pour('kettle', null, 2)
  room.take('cloth')
  const wetMlBeforeTheStroke = wetMlOnEveryPlace(room.state)

  strokeTheTeaTable(room, [acrossThePuddleFrom, acrossThePuddleTo, acrossThePuddleFrom], 10)

  assert.ok(wetMlOnEveryPlace(room.state) <= wetMlBeforeTheStroke * 0.2, `${wetMlOnEveryPlace(room.state)} ml of ${wetMlBeforeTheStroke} ml left`)
})

test('counter_whenStrokedWithTheClothOverItsPuddle_isWiped', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  room.take('cloth')
  room.walkTo('counter')
  room.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.testSession.pour('kettle', null, 1)
  const wetMlBeforeTheStroke = wetMlOnEveryPlace(room.state)

  strokeTheTop(room, 'counter', [acrossTheCountersPuddleFrom, acrossTheCountersPuddleTo, acrossTheCountersPuddleFrom], 10)

  assert.ok(wetMlOnEveryPlace(room.state) < wetMlBeforeTheStroke * 0.5, `${wetMlOnEveryPlace(room.state)} ml of ${wetMlBeforeTheStroke} ml left`)
})

test('table_whenStrokedWithTheClothWhileABowlsAreaHoldsTheFinger_isWiped', () => {
  const room = new TestRoom({ screen: () => screenWithTheFingerInTheAreaOfBowl1(fingerOnTheTableAt) })
  room.setTheTeaTable()
  room.testSession.pour('kettle', null, 2)
  room.take('cloth')
  const wetMlBeforeTheStroke = wetMlOnEveryPlace(room.state)

  room.touchInput.fingerDown(1, { x: 0, y: 0 })
  for (let frame = 1; frame <= framesInFiveSeconds; frame += 1) {
    room.advance(frameSeconds)
    room.touchInput.fingerMoved(1, { x: frame, y: 0 })
  }
  room.touchInput.fingerUp(1)

  assert.ok(wetMlOnEveryPlace(room.state) < wetMlBeforeTheStroke * 0.5, `${wetMlOnEveryPlace(room.state)} ml of ${wetMlBeforeTheStroke} ml left`)
})

test('table_whenStrokedOverTwoPuddles_wipesBoth', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.walkTo('teaTable')
  spillOnTheTeaTableAt(room, onTopOf('teaTable', -0.45, -0.05))
  spillOnTheTeaTableAt(room, onTopOf('teaTable', 0.2, -0.05))
  room.take('cloth')
  const wetMlBeforeTheStroke = Object.values(room.state.puddles).map((puddle) => puddle.wetMl)

  strokeTheTeaTable(room, [acrossThePuddleFrom, acrossThePuddleTo, acrossThePuddleFrom], 10)

  const wetMlAfterTheStroke = Object.values(room.state.puddles).map((puddle) => puddle.wetMl)
  assert.equal(wetMlBeforeTheStroke.length, 2)
  assert.ok(wetMlAfterTheStroke.every((wetMl, index) => wetMl < (wetMlBeforeTheStroke[index] ?? 0) * 0.5), `${wetMlAfterTheStroke.join(', ')} ml after ${wetMlBeforeTheStroke.join(', ')} ml`)
})

test('table_whileStrokedWithTheCloth_driesBeforeTheFingerLifts', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.testSession.pour('kettle', null, 2)
  room.take('cloth')
  const wetMlBeforeTheStroke = wetMlOnEveryPlace(room.state)

  moveTheClothOverTheTeaTable(room, [acrossThePuddleFrom, acrossThePuddleTo], 5)

  assert.ok(wetMlOnEveryPlace(room.state) < wetMlBeforeTheStroke * 0.5, `${wetMlOnEveryPlace(room.state)} ml of ${wetMlBeforeTheStroke} ml left`)
  assert.ok((room.state.cloths['cloth']?.wetMl ?? 0) > 0, 'the cloth stayed dry')
})

test('table_whenStrokedWithTheClothAwayFromThePuddle_driesOnlyAsATableLeftAlone', () => {
  const [stroked, leftAlone] = [new TestRoom(), new TestRoom()]
  for (const room of [stroked, leftAlone]) {
    room.setTheTeaTable()
    room.testSession.pour('kettle', null, 2)
    room.take('cloth')
  }

  strokeTheTeaTable(stroked, [farFromThePuddleFrom, farFromThePuddleTo, farFromThePuddleFrom], 10)
  leftAlone.advance(10)

  assert.ok(Math.abs(wetMlOnEveryPlace(stroked.state) - wetMlOnEveryPlace(leftAlone.state)) < 0.01, `${wetMlOnEveryPlace(stroked.state)} ml against ${wetMlOnEveryPlace(leftAlone.state)} ml`)
})

test('cloth_whileTheTableIsPressedWithoutMoving_staysInTheHand', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.take('cloth')

  room.playerController.pressStarted({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable }, null)

  assert.equal(room.playerController.clothWiping, null)
})

test('cloth_whileStrokingTheTable_isUnderTheFinger', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.take('cloth')

  moveTheClothOverTheTeaTable(room, [acrossThePuddleFrom, inTheTablesFarRightCorner], 1)

  assert.deepEqual(room.playerController.clothWiping?.at, inTheTablesFarRightCorner)
})

test('cloth_whenTheTeaTableIsTappedAwayFromThePuddle_isPutDownThereAndWipesNothing', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.testSession.pour('kettle', null, 2)
  room.take('cloth')
  const wetMlBeforeTheTap = wetMlOnEveryPlace(room.state)

  room.tapAndChoose({ kind: 'surface', furnitureId: 'teaTable', point: inTheTablesFarRightCorner }, 'putDownHere', 'cloth')

  assert.equal(room.state.cloths['cloth']?.location.kind, 'onSurface')
  assert.equal(wetMlOnEveryPlace(room.state), wetMlBeforeTheTap)
})

test('cloth_whenPutDownInThePuddle_soaksItUpWhileItLies', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.testSession.pour('kettle', null, 2)
  room.take('cloth')

  room.tapAndChoose({ kind: 'surface', furnitureId: 'teaTable', point: inThePuddle }, 'putDownHere', 'cloth')

  assert.equal(room.state.cloths['cloth']?.location.kind, 'onSurface')
  assert.equal(room.state.cloths['cloth']?.soakingPuddleId, 'puddle1')
})

test('puddle_whenTheClothIsPutDownInIt_shrinksAtOnce', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.testSession.pour('kettle', null, 2)
  room.take('cloth')
  const wetMlBeforeTheCloth = wetMlOnEveryPlace(room.state)

  room.tapAndChoose({ kind: 'surface', furnitureId: 'teaTable', point: inThePuddle }, 'putDownHere', 'cloth')

  assert.ok(wetMlOnEveryPlace(room.state) < wetMlBeforeTheCloth * 0.8, `${wetMlOnEveryPlace(room.state)} ml of ${wetMlBeforeTheCloth} ml left`)
})

test('cloth_lyingWhereAPuddleSpreads_startsSoakingItUp', () => {
  const room = roomWithTheClothLyingBesideASmallPuddle()

  room.testSession.pour('kettle', null, 1, fullFlowTiltDegrees)
  room.advance(frameSeconds)

  assert.equal(room.state.cloths['cloth']?.soakingPuddleId, 'puddle1')
})

test('cloth_lyingBesideASmallPuddle_staysDry', () => {
  const room = roomWithTheClothLyingBesideASmallPuddle()

  room.advance(frameSeconds)

  assert.equal(room.state.cloths['cloth']?.soakingPuddleId, null)
})

test('cloth_strokedUnderABowl_isUnderTheFingerAndLiesFlat', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.take('cloth')
  const bowl = whereTheTeaTableIsSet.bowl

  moveTheClothOverTheTeaTable(room, [{ x: bowl.x - 0.3, z: bowl.z }, bowl], 1)
  room.advance(halfASecond)

  const wiping = room.playerController.clothWiping
  assert.deepEqual({ x: wiping?.at.x, z: wiping?.at.z }, { x: bowl.x, z: bowl.z })
  assert.ok((wiping?.flatShare ?? 0) > 0.95, `flat share ${wiping?.flatShare}`)
})

test('cloth_strokedOutFromUnderABowl_rumplesAgain', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.take('cloth')
  const bowl = whereTheTeaTableIsSet.bowl

  moveTheClothOverTheTeaTable(room, [bowl, { x: bowl.x - 0.3, z: bowl.z }], 1)
  room.advance(halfASecond)

  assert.ok((room.playerController.clothWiping?.flatShare ?? 1) < 0.05, `flat share ${room.playerController.clothWiping?.flatShare}`)
})

test('table_whenTheCrosshairSweepsOverThePuddleWhileTheMouseButtonIsHeld_isWiped', () => {
  let crosshairOn: FloorPoint = acrossThePuddleFrom
  const room = new TestRoom({ screen: () => screenShowing(() => surfaceOfTheTeaTableAt(crosshairOn)) })
  room.setTheTeaTable()
  room.testSession.pour('kettle', null, 2)
  room.take('cloth')
  const wetMlBeforeTheStroke = wetMlOnEveryPlace(room.state)

  room.touchInput.fingerDown(1, { x: 0, y: 0 })
  for (let frame = 1; frame <= framesInFiveSeconds; frame += 1) {
    room.advance(frameSeconds)
    crosshairOn = { x: acrossThePuddleFrom.x + ((acrossThePuddleTo.x - acrossThePuddleFrom.x) * frame) / framesInFiveSeconds, z: acrossThePuddleFrom.z }
    room.touchInput.crosshairSwept(2)
  }
  room.touchInput.fingerUp(1)

  assert.ok(wetMlOnEveryPlace(room.state) < wetMlBeforeTheStroke * 0.5, `${wetMlOnEveryPlace(room.state)} ml of ${wetMlBeforeTheStroke} ml left`)
})

test('wipingSound_whileTheClothIsMovedAcrossAPuddle_isHeard', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.testSession.pour('kettle', null, 2)
  room.take('cloth')

  moveTheClothOverTheTeaTable(room, [acrossThePuddleFrom, acrossThePuddleTo], 1)

  assert.equal(room.visit.isWaterBeingWipedUp, true)
})

test('wipingSound_whileTheClothIsMovedAcrossADryTable_isNotHeard', () => {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.take('cloth')

  moveTheClothOverTheTeaTable(room, [farFromThePuddleFrom, farFromThePuddleTo], 1)

  assert.equal(room.visit.isWaterBeingWipedUp, false)
})

function spillOnTheTeaTableAt(room: TestRoom, landsAt: WorldPoint): void {
  room.testSession.doWithoutARefusal({ type: 'startPouring', sourceId: 'kettle', targetId: null })
  room.testSession.doWithoutARefusal({ type: 'adjustPour', tiltDegrees: fullFlowTiltDegrees, streamOnTargetFraction: 0, missedStreamLandsAt: spotOn('teaTable', landsAt) })
  room.testSession.wait(0.3)
  room.testSession.doWithoutARefusal({ type: 'stopPouring' })
}

function roomWithTheClothLyingBesideASmallPuddle(): TestRoom {
  const room = new TestRoom()
  room.setTheTeaTable()
  room.testSession.pour('kettle', null, 0.1)
  room.take('cloth')
  room.putDown(0, { x: 0.5, y: onTheTeaTable.y, z: -1.45 })
  return room
}

function strokeTheTeaTable(room: TestRoom, corners: readonly FloorPoint[], seconds: number): void {
  strokeTheTop(room, 'teaTable', corners, seconds)
}

function strokeTheTop(room: TestRoom, furnitureId: FurnitureId, corners: readonly FloorPoint[], seconds: number): void {
  moveTheClothOverTheTop(room, furnitureId, corners, seconds)
  room.playerController.pressEnded()
}

function moveTheClothOverTheTeaTable(room: TestRoom, corners: readonly FloorPoint[], seconds: number): void {
  moveTheClothOverTheTop(room, 'teaTable', corners, seconds)
}

function moveTheClothOverTheTop(room: TestRoom, furnitureId: FurnitureId, corners: readonly FloorPoint[], seconds: number): void {
  const [start, ...rest] = corners
  if (start === undefined) return
  const surfaceAt = (point: FloorPoint): TapTarget => ({ kind: 'surface', furnitureId, point: { x: point.x, y: topHeightOf(furnitureId), z: point.z } })
  room.playerController.pressStarted(surfaceAt(start), null)
  const framesPerLeg = Math.round(seconds / frameSeconds / rest.length)
  let from = start
  for (const to of rest) {
    for (let frame = 1; frame <= framesPerLeg; frame += 1) {
      room.advance(frameSeconds)
      room.playerController.pressMovedAway()
      room.playerController.pressMovedOver(surfaceAt({ x: from.x + ((to.x - from.x) * frame) / framesPerLeg, z: from.z + ((to.z - from.z) * frame) / framesPerLeg }))
    }
    from = to
  }
}

function fingerOnTheTableAt(point: ScreenPoint): FloorPoint {
  return { x: acrossThePuddleFrom.x + ((acrossThePuddleTo.x - acrossThePuddleFrom.x) * point.x) / framesInFiveSeconds, z: acrossThePuddleFrom.z }
}

function screenWithTheFingerInTheAreaOfBowl1(floorPointAt: (point: ScreenPoint) => FloorPoint): ScreenReader {
  const bowl1: TapTarget = { kind: 'item', itemId: 'bowl1' }
  return {
    tapTargetAt: (point) => ({ target: bowl1, touched: surfaceOfTheTeaTableAt(floorPointAt(point)), areasHoldingTheFinger: [bowl1], areasSetAside: [] }),
    aimPointAt: () => null,
  }
}

function topHeightOf(furnitureId: FurnitureId): number {
  return onTopOf(furnitureId, 0, 0).y
}

function surfaceOfTheTeaTableAt(point: FloorPoint): TapTarget {
  return { kind: 'surface', furnitureId: 'teaTable', point: { x: point.x, y: onTheTeaTable.y, z: point.z } }
}
