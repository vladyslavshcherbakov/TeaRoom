import assert from 'node:assert/strict'
import test from 'node:test'
import { quietRoomArrangements } from '../../../Shared/Content/Rooms.ts'
import { poseWatchingTheGears } from '../../../Apps/Game/Room/Camera/CameraPoses.ts'
import { roomLayoutFor, type FloorPoint, type RoomLayout } from '../../../Apps/Game/Room/RoomLayout.ts'

const portraitSquareAndLandscapeAspects = [0.46, 0.98, 1.6]
const sightLineStepMetres = 0.05

test('gearsWatched_inEveryArrangementOnEveryScreen_areSeenPastNoFurniture', () => {
  for (const arrangement of quietRoomArrangements) {
    const layout = roomLayoutFor(arrangement)
    for (const aspect of portraitSquareAndLandscapeAspects) {
      const pose = poseWatchingTheGears(layout, aspect)

      const blocking = furnitureOnTheLineBetween(layout, pose.position, pose.target)
      assert.equal(blocking, null, `${JSON.stringify(arrangement)} at aspect ${aspect}: the camera at (${pose.position.x.toFixed(2)}, ${pose.position.y.toFixed(2)}, ${pose.position.z.toFixed(2)}) sees the gears through the ${blocking}`)
    }
  }
})

function furnitureOnTheLineBetween(layout: RoomLayout, from: FloorPoint, to: FloorPoint): string | null {
  const length = Math.hypot(to.x - from.x, to.z - from.z)
  for (let along = 0; along <= length; along += sightLineStepMetres) {
    const point = { x: from.x + ((to.x - from.x) * along) / length, z: from.z + ((to.z - from.z) * along) / length }
    const piece = layout.furniture.find(({ footprint }) => Math.abs(point.x - footprint.x) <= footprint.width / 2 && Math.abs(point.z - footprint.z) <= footprint.depth / 2)
    if (piece !== undefined) return piece.id
  }
  return null
}
