import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { quietRoomArrangedAs } from '../../../Shared/Content/Rooms.ts'
import type { Catalog } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import type { RoomDefinition } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { quietRoomArrangementOf, type RoomArrangement } from './RoomArrangement.ts'
import type { RoomLog } from './RoomNavigator.ts'
import { roomWithVesselsShuffled } from './RoomWithVesselsShuffled.ts'

const shuffledVesselDefinitionId = 'teaBowl'

export function catalogOfANewGame(arrangement: RoomArrangement, nextRandom: () => number, log: RoomLog): Catalog {
  const shuffledRoom = roomWithVesselsShuffled(quietRoomArrangedAs(quietRoomArrangementOf(arrangement)), shuffledVesselDefinitionId, nextRandom)
  const shelfOrder = shuffledRoom.vessels.filter((vessel) => vessel.definitionId === shuffledVesselDefinitionId).map((vessel) => `${vessel.id} at ${vessel.startsAt.placeId} (${vessel.startsAt.y}, ${vessel.startsAt.z})`)
  log(`the bowls of this new game stand in a random order: ${shelfOrder.join(', ')}`)
  return catalogWith(shuffledRoom)
}

export function catalogOfAContinuedVisit(arrangement: RoomArrangement, log: RoomLog): Catalog {
  log('the bowls of the continued visit stand where the visit left them, and a bowl new to the shelf starts on its own spot')
  return catalogWith(quietRoomArrangedAs(quietRoomArrangementOf(arrangement)))
}

function catalogWith(room: RoomDefinition): Catalog {
  return { ...defaultCatalog, rooms: { ...defaultCatalog.rooms, [room.id]: room } }
}
