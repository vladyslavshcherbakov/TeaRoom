import assert from 'node:assert/strict'
import test from 'node:test'
import type { FloorPoint } from '../../../Apps/Game/Room/RoomLayout.ts'
import type { RoomTapTarget } from '../../../Apps/Game/Room/RoomPlay.ts'
import { onTopOf, TestRoom } from '../../Support/TestRoom.ts'
import { wetMlOnEveryPlace } from '../../../Shared/Simulation/Ritual/Puddles.ts'

const frameSeconds = 1 / 60
const framesInFiveSeconds = 300
const onTheTeaTable = onTopOf('teaTable', 0, 0.05)

test('table_whenStrokedWithTheClothOneAndAHalfMetresInTenSeconds_isWipedSlowlyAllOver', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.ritual.pour('kettle', null, 2)
  room.takeAndChoose('cloth')
  const wetMlBeforeTheStroke = wetMlOnEveryPlace(room.state)

  strokeTheTeaTable(room, [{ x: 0.5, z: -1.6 }, { x: 1.25, z: -1.6 }, { x: 0.5, z: -1.6 }], 10)

  assert.ok(wetMlOnEveryPlace(room.state) <= wetMlBeforeTheStroke * 0.2, `${wetMlOnEveryPlace(room.state)} ml of ${wetMlBeforeTheStroke} ml left`)
})

test('table_whileStrokedWithTheCloth_driesBeforeTheFingerLifts', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.ritual.pour('kettle', null, 2)
  room.takeAndChoose('cloth')
  const wetMlBeforeTheStroke = wetMlOnEveryPlace(room.state)

  moveTheClothOverTheTeaTable(room, [{ x: 0.5, z: -1.6 }, { x: 1.25, z: -1.6 }], 5)

  assert.ok(wetMlOnEveryPlace(room.state) < wetMlBeforeTheStroke * 0.5, `${wetMlOnEveryPlace(room.state)} ml of ${wetMlBeforeTheStroke} ml left`)
  assert.ok((room.state.cloths['cloth']?.wetMl ?? 0) > 0, 'the cloth stayed dry')
})

test('table_whenStrokedWithTheClothAwayFromThePuddle_driesOnlyAsATableLeftAlone', () => {
  const [stroked, leftAlone] = [new TestRoom(), new TestRoom()]
  for (const room of [stroked, leftAlone]) {
    setTheTeaTable(room)
    room.ritual.pour('kettle', null, 2)
    room.takeAndChoose('cloth')
  }

  strokeTheTeaTable(stroked, [{ x: 1.3, z: -1.9 }, { x: 1.6, z: -1.9 }, { x: 1.3, z: -1.9 }], 10)
  leftAlone.advance(10)

  assert.ok(Math.abs(wetMlOnEveryPlace(stroked.state) - wetMlOnEveryPlace(leftAlone.state)) < 0.01, `${wetMlOnEveryPlace(stroked.state)} ml against ${wetMlOnEveryPlace(leftAlone.state)} ml`)
})

test('cloth_whileTheTableIsPressedWithoutMoving_staysInTheHand', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.takeAndChoose('cloth')

  room.play.pressStarted({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.equal(room.play.clothWiping, null)
})

test('cloth_whileStrokingTheTable_isUnderTheFinger', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.takeAndChoose('cloth')

  moveTheClothOverTheTeaTable(room, [{ x: 0.5, z: -1.6 }, { x: 0.9, z: -1.4 }], 1)

  assert.deepEqual(room.play.clothWiping, { clothId: 'cloth', at: { x: 0.9, y: onTheTeaTable.y, z: -1.4 } })
})

test('cloth_whenTheTeaTableIsTappedAwayFromThePuddle_isPutDownThereAndWipesNothing', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.ritual.pour('kettle', null, 2)
  room.takeAndChoose('cloth')
  const wetMlBeforeTheTap = wetMlOnEveryPlace(room.state)

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: { x: 1.45, y: onTheTeaTable.y, z: -1.7 } })

  assert.equal(room.state.cloths['cloth']?.location.kind, 'onSurface')
  assert.equal(wetMlOnEveryPlace(room.state), wetMlBeforeTheTap)
})

test('cloth_whenPutDownInThePuddle_soaksItUpWhileItLies', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.ritual.pour('kettle', null, 2)
  room.takeAndChoose('cloth')

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: { x: 0.5, y: onTheTeaTable.y, z: -1.45 } })

  assert.equal(room.state.cloths['cloth']?.location.kind, 'onSurface')
  assert.equal(room.state.cloths['cloth']?.isSoakingThePuddle, true)
})

test('table_whenTheCrosshairSweepsOverThePuddleWhileTheMouseButtonIsHeld_isWiped', () => {
  let crosshairOn: FloorPoint = { x: 0.5, z: -1.6 }
  const room = new TestRoom({ screen: () => ({ tapTargetAt: () => surfaceOfTheTeaTableAt(crosshairOn), aimPointAt: () => ({ x: 0, z: 0 }) }) })
  setTheTeaTable(room)
  room.ritual.pour('kettle', null, 2)
  room.takeAndChoose('cloth')
  const wetMlBeforeTheStroke = wetMlOnEveryPlace(room.state)

  room.gestures.fingerDown(1, { x: 0, y: 0 })
  for (let frame = 1; frame <= framesInFiveSeconds; frame += 1) {
    room.advance(frameSeconds)
    crosshairOn = { x: 0.5 + (0.75 * frame) / framesInFiveSeconds, z: -1.6 }
    room.gestures.crosshairSwept(2)
  }
  room.gestures.fingerUp(1)

  assert.ok(wetMlOnEveryPlace(room.state) < wetMlBeforeTheStroke * 0.5, `${wetMlOnEveryPlace(room.state)} ml of ${wetMlBeforeTheStroke} ml left`)
})

function setTheTeaTable(room: TestRoom): void {
  room.carryFromTheShelf('bowl1', 'caddy')
  room.walkTo('teaTable')
  room.putDown(0, { x: 0.8, y: 0.42, z: -1.5 })
  room.putDown(1, { x: 1.2, y: 0.42, z: -1.5 })
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.walkTo('teaTable')
  room.putDown(0, { x: 1, y: 0.42, z: -1.8 })
}

function strokeTheTeaTable(room: TestRoom, corners: readonly FloorPoint[], seconds: number): void {
  moveTheClothOverTheTeaTable(room, corners, seconds)
  room.play.pressEnded()
}

function moveTheClothOverTheTeaTable(room: TestRoom, corners: readonly FloorPoint[], seconds: number): void {
  const [start, ...rest] = corners
  if (start === undefined) return
  room.play.pressStarted(surfaceOfTheTeaTableAt(start))
  const framesPerLeg = Math.round(seconds / frameSeconds / rest.length)
  let from = start
  for (const to of rest) {
    for (let frame = 1; frame <= framesPerLeg; frame += 1) {
      room.advance(frameSeconds)
      room.play.pressMovedAway()
      room.play.pressMovedOver(surfaceOfTheTeaTableAt({ x: from.x + ((to.x - from.x) * frame) / framesPerLeg, z: from.z + ((to.z - from.z) * frame) / framesPerLeg }))
    }
    from = to
  }
}

function surfaceOfTheTeaTableAt(point: FloorPoint): RoomTapTarget {
  return { kind: 'surface', furnitureId: 'teaTable', point: { x: point.x, y: onTheTeaTable.y, z: point.z } }
}
