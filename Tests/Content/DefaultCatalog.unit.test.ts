import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'
import { problemsOpeningRoom } from '../../Shared/Simulation/Definitions/CatalogProblems.ts'

test('everyDefaultRoom_opensWithNoContentProblems', () => {
  for (const roomId of Object.keys(defaultCatalog.rooms)) {
    assert.deepEqual(problemsOpeningRoom(defaultCatalog, roomId), [], roomId)
  }
})
