import assert from 'node:assert/strict'
import test from 'node:test'
import type { ScreenPoint } from '../../../Apps/Game/Room/RoomGestures.ts'
import type { RoomTapTarget } from '../../../Apps/Game/Room/RoomPlay.ts'
import { TestRoom } from '../../Support/TestRoom.ts'

test('press_whenTheFingerLiftsWithinTwelvePixels_isATap', () => {
  const room = roomWhereEveryTapHitsTheCounter()

  room.gestures.fingerDown(1, { x: 0, y: 0 })
  room.gestures.fingerMoved(1, { x: 12, y: 0 })
  room.gestures.fingerUp(1)

  assert.deepEqual(room.play.view, { kind: 'approaching', furnitureId: 'counter' })
})

test('press_whenTheFingerMovesFurtherThanTwelvePixels_isNotATap', () => {
  const room = roomWhereEveryTapHitsTheCounter()

  room.gestures.fingerDown(1, { x: 0, y: 0 })
  room.gestures.fingerMoved(1, { x: 13, y: 0 })
  room.gestures.fingerUp(1)

  assert.deepEqual(room.play.view, { kind: 'overview' })
})

test('press_whenTheLookTurnsTheCrosshairMoreThanTwelvePixels_isNotATap', () => {
  const room = roomWhereEveryTapHitsTheCounter()

  room.gestures.fingerDown(1, { x: 0, y: 0 })
  room.gestures.crosshairSwept(13)
  room.gestures.fingerUp(1)

  assert.deepEqual(room.play.view, { kind: 'overview' })
})

test('pinch_whenTheFingersSpreadToTwiceTheirGap_bringsTheCameraToHalfItsDistanceWithoutATap', () => {
  const room = roomWhereEveryTapHitsTheCounter()
  room.gestures.fingerDown(1, { x: 0, y: 0 })
  room.gestures.fingerDown(2, { x: 100, y: 0 })

  room.gestures.fingerMoved(2, { x: 200, y: 0 })
  room.gestures.fingerUp(2)
  room.gestures.fingerUp(1)

  assert.equal(room.zoom.distanceShare, 0.5)
  assert.deepEqual(room.play.view, { kind: 'overview' })
})

function roomWhereEveryTapHitsTheCounter(): TestRoom {
  return new TestRoom({ screen: () => ({ tapTargetAt: counterAt, aimPointAt: () => ({ x: 0, z: 0 }) }) })
}

function counterAt(_point: ScreenPoint): RoomTapTarget {
  return { kind: 'furniture', furnitureId: 'counter' }
}
