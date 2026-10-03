import { defaultCatalog } from '../../../../Shared/Content/DefaultCatalog.ts'
import { quietRoomArrangedAs } from '../../../../Shared/Content/Rooms.ts'
import type { Catalog, RoomDefinition } from '../../../../Shared/GameLogic/GameLogic.ts'
import { quietRoomArrangementOf, type RoomArrangement } from './RoomArrangement.ts'
import type { AppLog } from '../../../Engine/AppLog.ts'
import { roomWithVesselsShuffled } from './RoomWithVesselsShuffled.ts'

const shuffledVesselDefinitionId = 'teaBowl'

export function catalogOfANewGame(arrangement: RoomArrangement, nextRandom: () => number, log: AppLog): Catalog {
  const shuffledRoom = roomWithVesselsShuffled(quietRoomArrangedAs(quietRoomArrangementOf(arrangement)), shuffledVesselDefinitionId, nextRandom)
  const shelfOrder = shuffledRoom.vessels.filter((vessel) => vessel.definitionId === shuffledVesselDefinitionId).map((vessel) => `${vessel.id} at ${vessel.startsAt.placeId} (${vessel.startsAt.x.toFixed(2)}, ${vessel.startsAt.y.toFixed(2)}, ${vessel.startsAt.z.toFixed(2)})`)
  log(`the bowls of this new game stand in a random order: ${shelfOrder.join(', ')}`)
  return catalogWith(shuffledRoom)
}

export function catalogOfAContinuedVisit(arrangement: RoomArrangement, log: AppLog): Catalog {
  log('the bowls of the continued visit stand where the visit left them')
  return catalogWith(quietRoomArrangedAs(quietRoomArrangementOf(arrangement)))
}

function catalogWith(room: RoomDefinition): Catalog {
  return { ...defaultCatalog, rooms: { ...defaultCatalog.rooms, [room.id]: room } }
}
