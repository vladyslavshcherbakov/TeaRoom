import assert from 'node:assert/strict'
import test from 'node:test'
import { CameraZoom } from '../../../Apps/Game/Room/Camera/CameraZoom.ts'
import { RoomGestures, type ScreenPoint } from '../../../Apps/Game/Room/RoomGestures.ts'
import { RoomPlay, type RoomTapTarget } from '../../../Apps/Game/Room/RoomPlay.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { TestRitual } from '../../Support/TestRitual.ts'

test('press_whenTheFingerLiftsWithinTwelvePixels_isATap', () => {
  const room = new GestureRoom()

  room.gestures.fingerDown(1, { x: 0, y: 0 })
  room.gestures.fingerMoved(1, { x: 12, y: 0 })
  room.gestures.fingerUp(1)

  assert.deepEqual(room.play.view, { kind: 'approaching', furnitureId: 'counter' })
})

test('press_whenTheFingerMovesFurtherThanTwelvePixels_isNotATap', () => {
  const room = new GestureRoom()

  room.gestures.fingerDown(1, { x: 0, y: 0 })
  room.gestures.fingerMoved(1, { x: 13, y: 0 })
  room.gestures.fingerUp(1)

  assert.deepEqual(room.play.view, { kind: 'overview' })
})

test('pinch_whenTheFingersSpreadToTwiceTheirGap_bringsTheCameraToHalfItsDistanceWithoutATap', () => {
  const room = new GestureRoom()
  room.gestures.fingerDown(1, { x: 0, y: 0 })
  room.gestures.fingerDown(2, { x: 100, y: 0 })

  room.gestures.fingerMoved(2, { x: 200, y: 0 })
  room.gestures.fingerUp(2)
  room.gestures.fingerUp(1)

  assert.equal(room.zoom.distanceShare, 0.5)
  assert.deepEqual(room.play.view, { kind: 'overview' })
})

class GestureRoom {
  readonly ritual = TestRitual.begun(defaultCatalog, 'sencha', 'quietRoom')
  readonly play = new RoomPlay(this.ritual.session, defaultCatalog, () => {}, 4, { remarked: () => {}, debugMenuAsked: () => {}, achievementsAsked: () => {}, settingsAsked: () => {}, mayGrowAMiddleHand: () => true, keeperDied: () => {} })
  readonly zoom = new CameraZoom()
  readonly gestures = new RoomGestures(this.play, this.zoom, { tapTargetAt: counterAt, aimPointAt: () => ({ x: 0, z: 0 }) }, () => {})
}

function counterAt(_point: ScreenPoint): RoomTapTarget {
  return { kind: 'furniture', furnitureId: 'counter' }
}
