import assert from 'node:assert/strict'
import test from 'node:test'
import { roomWithVesselsShuffled } from '../../../Apps/Game/Room/RoomWithVesselsShuffled.ts'
import { quietRoom } from '../../../Shared/Content/Rooms.ts'

test('shuffledRoom_whenBowlsAreShuffled_keepsEveryShelfSpotTakenOnce', () => {
  const shuffledRoom = roomWithVesselsShuffled(quietRoom, 'teaBowl', () => 0)

  const spotsBefore = quietRoom.vessels.filter((vessel) => vessel.definitionId === 'teaBowl').map((vessel) => JSON.stringify(vessel.startsAt)).sort()
  const spotsAfter = shuffledRoom.vessels.filter((vessel) => vessel.definitionId === 'teaBowl').map((vessel) => JSON.stringify(vessel.startsAt)).sort()
  assert.deepEqual(spotsAfter, spotsBefore)
})

test('shuffledRoom_whenBowlsAreShuffled_movesTheFirstBowl', () => {
  const shuffledRoom = roomWithVesselsShuffled(quietRoom, 'teaBowl', () => 0)

  assert.notDeepEqual(shuffledRoom.vessels.find((vessel) => vessel.id === 'bowl1')?.startsAt, quietRoom.vessels.find((vessel) => vessel.id === 'bowl1')?.startsAt)
})

test('shuffledRoom_whenBowlsAreShuffled_leavesTheKettleAndTheThermosWhereTheyWere', () => {
  const shuffledRoom = roomWithVesselsShuffled(quietRoom, 'teaBowl', () => 0)

  const others = (vessels: typeof quietRoom.vessels) => vessels.filter((vessel) => vessel.definitionId !== 'teaBowl')
  assert.deepEqual(others(shuffledRoom.vessels), others(quietRoom.vessels))
})
