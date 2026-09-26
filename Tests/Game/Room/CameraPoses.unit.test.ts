import assert from 'node:assert/strict'
import test from 'node:test'
import { closeUpPose, distanceShareAfterPinch, poseWatchingBesideASheet, visibleWidthMetres, zoomedPose } from '../../../Apps/Game/Room/Camera/CameraPoses.ts'
import { quietRoomLayout } from '../../../Apps/Game/Room/RoomLayout.ts'
import { assertNear } from '../../Support/Assertions.ts'

const iPhonePortraitAspect = 390 / 844

test('closeUp_onAPortraitPhone_showsTheWholeWidthOfEachPieceOfFurnitureFromEachSide', () => {
  for (const piece of quietRoomLayout.furniture) {
    for (const side of piece.sides) {
      const pose = closeUpPose(side.closeUp, iPhonePortraitAspect)
      const distance = Math.hypot(pose.position.x - pose.target.x, pose.position.y - pose.target.y, pose.position.z - pose.target.z)

      assert.ok(visibleWidthMetres(distance, iPhonePortraitAspect) >= side.closeUp.widthMetres - 0.001, `${piece.id} from its ${side.name}`)
    }
  }
})

test('closeUp_ofTheTeaTableFromEachSide_looksDownFromAbove', () => {
  const teaTable = quietRoomLayout.furniture.find((piece) => piece.id === 'teaTable')
  if (teaTable === undefined) throw new Error('the layout lost the tea table')

  const downwardAnglesDegrees = teaTable.sides.map((side) => {
    const pose = closeUpPose(side.closeUp, iPhonePortraitAspect)
    return (Math.atan2(pose.position.y - pose.target.y, Math.hypot(pose.position.x - pose.target.x, pose.position.z - pose.target.z)) * 180) / Math.PI
  })

  assert.ok(downwardAnglesDegrees.every((angle) => angle > 45), `the camera looks down at only ${downwardAnglesDegrees.map((angle) => angle.toFixed(0)).join('° and ')}°`)
})

test('pinch_whenTheFingersSpreadToTwiceTheirGap_bringsTheCameraToHalfItsDistance', () => {
  const distanceShare = distanceShareAfterPinch(1, 100, 200)

  assert.equal(distanceShare, 0.5)
})

test('pinch_whenTheFingersSpreadFurtherThanTheNearestZoom_stopsAtHalfTheDistance', () => {
  const distanceShare = distanceShareAfterPinch(1, 100, 400)

  assert.equal(distanceShare, 0.5)
})

test('pinch_whenTheFingersCloseToAQuarterOfTheirGap_stopsAtTheFarthestZoom', () => {
  const distanceShare = distanceShareAfterPinch(1, 400, 100)

  assert.equal(distanceShare, 1.6)
})

test('zoomedPose_atHalfTheDistance_keepsTheTargetAndHalvesTheWayToIt', () => {
  const pose = { position: { x: 4, y: 6, z: 8 }, target: { x: 0, y: 2, z: 0 } }

  const zoomed = zoomedPose(pose, 0.5)

  assert.deepEqual(zoomed, { position: { x: 2, y: 4, z: 4 }, target: { x: 0, y: 2, z: 0 } })
})

test('gearsWatched_onAPortraitScreen_areFacedStraightAndShownAboveTheSheet', () => {
  const pose = poseWatchingBesideASheet({ centre: { x: 0, y: 1, z: -3 }, towardsTheRoom: { x: 0, y: 0, z: 1 }, sizeMetres: 0.5 }, 0.5)

  assertNear(pose.position.x, pose.target.x)
  assertNear(pose.position.y, pose.target.y)
  assert.ok(pose.target.y < 1, `the camera looks at ${pose.target.y.toFixed(2)} m, not below the gears`)
})

test('gearsWatched_onALandscapeScreen_areShownLeftOfTheSheet', () => {
  const pose = poseWatchingBesideASheet({ centre: { x: 0, y: 1, z: -3 }, towardsTheRoom: { x: 0, y: 0, z: 1 }, sizeMetres: 0.5 }, 1.6)

  assertNear(pose.target.y, 1)
  assert.ok(pose.target.x > 0, `the camera looks at x ${pose.target.x.toFixed(2)}, not right of the gears`)
})
