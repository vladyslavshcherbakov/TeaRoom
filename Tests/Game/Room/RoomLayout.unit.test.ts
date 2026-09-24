import assert from 'node:assert/strict'
import test from 'node:test'
import { carriedShapeOf } from '../../../Apps/Game/Room/RoomLayout.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { carriedItemIdsIn } from '../../../Shared/Simulation/Ritual/Reach.ts'
import { TestRitual } from '../../Support/TestRitual.ts'

test('carriedShape_existsForEveryItemInEveryDefaultRoom', () => {
  for (const roomId of Object.keys(defaultCatalog.rooms)) {
    const state = new TestRitual(defaultCatalog, roomId).state
    for (const itemId of carriedItemIdsIn(state)) assert.notEqual(carriedShapeOf(state, itemId), undefined, `${roomId}: ${itemId}`)
  }
})

test('carriedShape_ofATeaBowl_isABowlWhateverItsId', () => {
  const state = new TestRitual(defaultCatalog, 'quietRoom').state

  assert.equal(carriedShapeOf(state, 'bowl6'), 'bowl')
})
