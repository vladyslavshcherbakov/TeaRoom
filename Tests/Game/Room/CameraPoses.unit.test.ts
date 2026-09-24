import assert from 'node:assert/strict'
import test from 'node:test'
import { closeUpPose, visibleWidthMetres } from '../../../Apps/Game/Room/Camera/CameraPoses.ts'
import { furniture } from '../../../Apps/Game/Room/RoomLayout.ts'

const iPhonePortraitAspect = 390 / 844

test('closeUp_onAPortraitPhone_showsTheWholeWidthOfEachPieceOfFurniture', () => {
  for (const piece of furniture) {
    const pose = closeUpPose(piece.closeUp, iPhonePortraitAspect)
    const distance = Math.hypot(pose.position.x - pose.target.x, pose.position.y - pose.target.y, pose.position.z - pose.target.z)

    assert.ok(visibleWidthMetres(distance, iPhonePortraitAspect) >= piece.closeUp.widthMetres - 0.001, piece.id)
  }
})

test('closeUp_ofTheTeaTable_looksDownFromAbove', () => {
  const teaTable = furniture.find((piece) => piece.id === 'teaTable')
  if (teaTable === undefined) throw new Error('the layout lost the tea table')

  const pose = closeUpPose(teaTable.closeUp, iPhonePortraitAspect)

  const downwardAngleDegrees = (Math.atan2(pose.position.y - pose.target.y, Math.hypot(pose.position.x - pose.target.x, pose.position.z - pose.target.z)) * 180) / Math.PI
  assert.ok(downwardAngleDegrees > 45, `the camera looks down at only ${downwardAngleDegrees.toFixed(0)}°`)
})
