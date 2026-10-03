import assert from 'node:assert/strict'
import test from 'node:test'
import { farthestDistanceShare, nearestDistanceShare } from '../../../Apps/Game/Room/Camera/CameraPoses.ts'
import type { TapTarget } from '../../../Apps/Game/Room/TapTarget.ts'
import { middleOfTheFloor, screenShowing, TestRoom } from '../../Support/TestRoom.ts'

const counter: TapTarget = { kind: 'furniture', furnitureId: 'counter' }

test('press_whenTheFingerLiftsWithinTwelvePixels_isATap', () => {
  const room = roomWhereEveryTapHitsTheCounter()

  room.touchInput.fingerDown(1, { x: 0, y: 0 })
  room.touchInput.fingerMoved(1, { x: 12, y: 0 })
  room.touchInput.fingerUp(1)

  assert.deepEqual(room.playerController.view, { kind: 'approaching', furnitureId: 'counter' })
})

test('press_whenTheFingerMovesFurtherThanTwelvePixels_isNotATap', () => {
  const room = roomWhereEveryTapHitsTheCounter()

  room.touchInput.fingerDown(1, { x: 0, y: 0 })
  room.touchInput.fingerMoved(1, { x: 13, y: 0 })
  room.touchInput.fingerUp(1)

  assert.deepEqual(room.playerController.view, { kind: 'overview' })
})

test('press_whenTheBrowserCancelsIt_isNotATap', () => {
  const room = roomWhereEveryTapHitsTheCounter()
  room.touchInput.fingerDown(1, { x: 0, y: 0 })

  room.touchInput.fingerCancelled(1)

  assert.deepEqual(room.playerController.view, { kind: 'overview' })
})

test('press_whenTheLookTurnsTheCrosshairMoreThanTwelvePixels_isNotATap', () => {
  const room = roomWhereEveryTapHitsTheCounter()

  room.touchInput.fingerDown(1, { x: 0, y: 0 })
  room.touchInput.crosshairSwept(13)
  room.touchInput.fingerUp(1)

  assert.deepEqual(room.playerController.view, { kind: 'overview' })
})

test('pinch_whenTheFingersSpreadToTwiceTheirGap_bringsTheCameraToHalfItsDistanceWithoutATap', () => {
  const room = roomWhereEveryTapHitsTheCounter()
  room.touchInput.fingerDown(1, { x: 0, y: 0 })
  room.touchInput.fingerDown(2, { x: 100, y: 0 })

  room.touchInput.fingerMoved(2, { x: 200, y: 0 })
  room.touchInput.fingerUp(2)
  room.touchInput.fingerUp(1)

  assert.equal(room.zoom.distanceShare, 0.5)
  assert.deepEqual(room.playerController.view, { kind: 'overview' })
})

test('wheel_whenTurnedFarUpInTheRoomView_bringsTheCameraToItsNearest', () => {
  const room = roomWhereEveryTapHitsTheCounter()

  room.touchInput.wheelTurned(-2000)

  assert.equal(room.zoom.distanceShare, nearestDistanceShare)
})

test('wheel_whenTurnedFarDownInTheRoomView_takesTheCameraToItsFarthest', () => {
  const room = roomWhereEveryTapHitsTheCounter()

  room.touchInput.wheelTurned(2000)

  assert.equal(room.zoom.distanceShare, farthestDistanceShare)
})

test('tap_isLoggedWithItsPointOnTheScreenWhatTheFingerTouchedAndTheAreasThatHeldIt', () => {
  const room = new TestRoom({ screen: () => ({ tapTargetAt: () => ({ target: counter, touched: { kind: 'floor', point: middleOfTheFloor }, areasHoldingTheFinger: [counter, { kind: 'item', itemId: 'kettle' }], areasSetAside: [] }), aimPointAt: () => middleOfTheFloor }) })

  room.touchInput.fingerDown(1, { x: 212.4, y: 530.6 })
  room.touchInput.fingerUp(1)

  assert.ok(room.logLines.includes('tap on the counter at (212, 531) px, touching the floor, in the areas of the counter, kettle, holding nothing'), room.logLines.join('\n'))
})

function roomWhereEveryTapHitsTheCounter(): TestRoom {
  return new TestRoom({ screen: () => screenShowing(() => counter) })
}
