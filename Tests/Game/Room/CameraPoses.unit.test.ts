import assert from 'node:assert/strict'
import test from 'node:test'
import { closeUpPose, distanceShareAfterPinch, visibleWidthMetres, zoomedPose } from '../../../Apps/Game/Room/Camera/CameraPoses.ts'
import { kitchenBesideTheWindow } from '../../../Apps/Game/Room/RoomLayout.ts'

const iPhonePortraitAspect = 390 / 844

test('closeUp_onAPortraitPhone_showsTheWholeWidthOfEachPieceOfFurnitureFromEachSide', () => {
  for (const piece of kitchenBesideTheWindow.furniture) {
    for (const side of piece.sides) {
      const pose = closeUpPose(side.closeUp, iPhonePortraitAspect)
      const distance = Math.hypot(pose.position.x - pose.target.x, pose.position.y - pose.target.y, pose.position.z - pose.target.z)

      assert.ok(visibleWidthMetres(distance, iPhonePortraitAspect) >= side.closeUp.widthMetres - 0.001, `${piece.id} from its ${side.name}`)
    }
  }
})

test('closeUp_ofTheTeaTableFromEachSide_looksDownFromAbove', () => {
  const teaTable = kitchenBesideTheWindow.furniture.find((piece) => piece.id === 'teaTable')
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
