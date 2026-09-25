import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'
import { quietRoomArrangedAs, quietRoomArrangements } from '../../Shared/Content/Rooms.ts'
import { problemsOpeningRoom } from '../../Shared/Simulation/Definitions/CatalogProblems.ts'

test('everyDefaultRoom_opensWithNoContentProblems', () => {
  for (const roomId of Object.keys(defaultCatalog.rooms)) {
    assert.deepEqual(problemsOpeningRoom(defaultCatalog, roomId), [], roomId)
  }
})

test('quietRoom_inEveryArrangement_opensWithNoContentProblems', () => {
  for (const arrangement of quietRoomArrangements) {
    const room = quietRoomArrangedAs(arrangement)
    const catalog = { ...defaultCatalog, rooms: { ...defaultCatalog.rooms, [room.id]: room } }

    assert.deepEqual(problemsOpeningRoom(catalog, room.id), [], JSON.stringify(arrangement))
  }
})

test('quietRoom_withTwoCloths_startsWithBothOfThem', () => {
  const room = quietRoomArrangedAs({ window: 'alongTheLeftWall', besideTheWindow: 'shelf', table: 'againstTheFrontEdge', tools: 'apart', clothCount: 2 })

  assert.deepEqual(room.cloths.map((cloth) => cloth.id), ['cloth', 'cloth2'])
})
