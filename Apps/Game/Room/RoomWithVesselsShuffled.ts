import type { RoomDefinition, Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'

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

function shuffled(spots: readonly Spot[], nextRandom: () => number): Spot[] {
  const spotsInNewOrder = [...spots]
  for (let index = spotsInNewOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1))
    const spotHere = spotsInNewOrder[index]
    const spotThere = spotsInNewOrder[swapIndex]
    if (spotHere === undefined || spotThere === undefined) continue
    spotsInNewOrder[index] = spotThere
    spotsInNewOrder[swapIndex] = spotHere
  }
  return spotsInNewOrder
}
