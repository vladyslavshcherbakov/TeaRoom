import assert from 'node:assert/strict'
import test from 'node:test'
import { furnitureWithId, puddleOutlineOn, quietRoomLayout } from '../../../Apps/Game/Room/RoomLayout.ts'

test('drawnPuddle_spreadingPastTheTeaTablesEdge_staysOnTheTable', () => {
  const table = furnitureWithId(quietRoomLayout, 'teaTable')
  const byTheEdge = { x: table.footprint.x + table.footprint.width / 2 - 0.05, z: table.footprint.z }

  const outline = puddleOutlineOn(quietRoomLayout, 'teaTable', byTheEdge, 0.2, 40)

  assert.ok(outline.every((point) => point.x <= table.footprint.x + table.footprint.width / 2), 'a point reaches past the edge')
})

test('drawnPuddle_inTheMiddleOfTheTable_isRound', () => {
  const table = furnitureWithId(quietRoomLayout, 'teaTable')

  const outline = puddleOutlineOn(quietRoomLayout, 'teaTable', { x: table.footprint.x, z: table.footprint.z }, 0.1, 4)

  assert.deepEqual(outline.map((point) => Math.round(Math.hypot(point.x - table.footprint.x, point.z - table.footprint.z) * 1000)), [100, 100, 100, 100])
})
