import type { RoomDefinition } from '../../../Shared/GameLogic/GameLogic.ts'
import { shuffled } from '../../../Shared/Engine/Shuffled.ts'

export function roomWithVesselsShuffled(room: RoomDefinition, definitionId: string, nextRandom: () => number): RoomDefinition {
  const shuffledSpots = shuffled(room.vessels.filter((vessel) => vessel.definitionId === definitionId).map((vessel) => vessel.startsAt), nextRandom)
  let nextSpotIndex = 0
  const vessels = room.vessels.map((vessel) => {
    if (vessel.definitionId !== definitionId) return vessel
    const startsAt = shuffledSpots[nextSpotIndex] ?? vessel.startsAt
    nextSpotIndex += 1
    return { ...vessel, startsAt }
  })
  return { ...room, vessels }
}
