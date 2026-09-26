import assert from 'node:assert/strict'
import test from 'node:test'
import { catalogOfAContinuedVisit } from '../../../Apps/Game/Room/GameCatalog.ts'
import { arrangementBeforeRoomsVaried, quietRoomArrangementOf } from '../../../Apps/Game/Room/RoomArrangement.ts'
import { quietRoomArrangedAs } from '../../../Shared/Content/Rooms.ts'
import { TestRitual } from '../../Support/TestRitual.ts'

const bowlNewToTheShelf = 'bowl11'

test('bowl_newToTheShelfOfAContinuedVisit_startsOnItsOwnSpot', () => {
  const catalog = catalogOfAContinuedVisit(arrangementBeforeRoomsVaried, () => {})
  const visitSavedBeforeTheBowl = savedStateWithout(bowlNewToTheShelf, new TestRitual(catalog, 'quietRoom'))

  const continuedVisit = new TestRitual(catalog, 'quietRoom', visitSavedBeforeTheBowl)

  const ownSpot = quietRoomArrangedAs(quietRoomArrangementOf(arrangementBeforeRoomsVaried)).vessels.find((vessel) => vessel.id === bowlNewToTheShelf)?.startsAt
  assert.deepEqual(continuedVisit.vessel(bowlNewToTheShelf).location, { kind: 'onSurface', spot: ownSpot })
})

function savedStateWithout(vesselId: string, ritual: TestRitual): unknown {
  const savedState = ritual.savedState as { vessels: Record<string, unknown> }
  delete savedState.vessels[vesselId]
  return savedState
}
