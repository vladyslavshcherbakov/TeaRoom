import type { Catalog } from './Catalog.ts'
import type { RoomDefinition } from './RoomDefinition.ts'
import type { TeaDefinition } from './TeaDefinition.ts'
import { caddyItemId, spoonItemId } from '../Ritual/Reach.ts'

export function problemsOpeningRoom(catalog: Catalog, roomId: string): string[] {
  const room = catalog.rooms[roomId]
  if (room === undefined) return [`room "${roomId}" is not in the catalog`]
  return [
    ...problemsWithRoom(catalog, room),
    ...Object.values(catalog.teas).flatMap(problemsWithTea),
    ...problemsWithFigurineTastes(catalog),
  ]
}

function problemsWithRoom(catalog: Catalog, room: RoomDefinition): string[] {
  const problems: string[] = [...problemsWithPlaces(room)]
  if (room.timesOfDay.length === 0) problems.push(`room "${room.id}" offers no time of day`)
  if (room.weathers.length === 0) problems.push(`room "${room.id}" offers no weather`)
  if (catalog.heaters[room.heaterId] === undefined) problems.push(`room "${room.id}" uses unknown heater "${room.heaterId}"`)
  for (const vessel of room.vessels) {
    if (catalog.vessels[vessel.definitionId] === undefined) {
      problems.push(`room "${room.id}" uses unknown vessel "${vessel.definitionId}" for "${vessel.id}"`)
    }
  }
  const vesselIds = room.vessels.map((vessel) => vessel.id)
  if (!vesselIds.includes(caddyItemId)) problems.push(`room "${room.id}" has no vessel "${caddyItemId}" to keep its tea in`)
  for (const repeatedId of new Set(vesselIds.filter((id, index) => vesselIds.indexOf(id) !== index))) {
    problems.push(`room "${room.id}" repeats vessel id "${repeatedId}"`)
  }
  const clothIds = room.cloths.map((cloth) => cloth.id)
  const takenIds = new Set([...vesselIds, spoonItemId])
  for (const clashingId of new Set(clothIds.filter((id, index) => clothIds.indexOf(id) !== index || takenIds.has(id)))) {
    problems.push(`room "${room.id}" gives the cloth "${clashingId}" an id another item has`)
  }
  for (const figurineId of room.figurineIds) {
    if (catalog.figurines[figurineId] === undefined) problems.push(`room "${room.id}" uses unknown figurine "${figurineId}"`)
  }
  return problems
}

function problemsWithPlaces(room: RoomDefinition): string[] {
  const knownPlaces = new Set(room.places)
  const namedPlaces = [
    { what: 'the keeper starts at', placeId: room.keeperStartsAt },
    { what: 'the ritual happens at', placeId: room.ritualPlaceId },
    { what: 'the heater stands at', placeId: room.heaterSpot.placeId },
    { what: 'the sink is at', placeId: room.tap?.sinkSpot.placeId ?? null },
    { what: 'the spoon starts at', placeId: room.spoonStartsAt.placeId },
    ...room.cloths.map((cloth) => ({ what: `the cloth "${cloth.id}" starts at`, placeId: cloth.startsAt.placeId })),
    ...room.vessels.map((vessel) => ({ what: `"${vessel.id}" starts at`, placeId: vessel.startsAt.placeId })),
  ]
  return namedPlaces
    .filter(({ placeId }) => placeId !== null && !knownPlaces.has(placeId))
    .map(({ what, placeId }) => `room "${room.id}": ${what} unknown place "${placeId}"`)
}

function problemsWithTea(tea: TeaDefinition): string[] {
  const problems: string[] = []
  const { idealC, good, acceptable } = tea.water
  const areRangesNested =
    acceptable.lowestC <= good.lowestC && good.lowestC <= idealC && idealC <= good.highestC && good.highestC <= acceptable.highestC
  if (!areRangesNested) problems.push(`tea "${tea.id}" water ranges are not nested around its ideal ${idealC} °C`)
  if (acceptable.highestC > 100) problems.push(`tea "${tea.id}" accepts water up to ${acceptable.highestC} °C, above boiling`)
  const { lowest, highest } = tea.balancedStrength
  if (!(0 < lowest && lowest < highest && highest < 100)) {
    problems.push(`tea "${tea.id}" balanced strength ${lowest}..${highest} is not an ordered range inside 0..100`)
  }
  return problems
}

function problemsWithFigurineTastes(catalog: Catalog): string[] {
  return Object.values(catalog.figurines).flatMap((figurine) =>
    Object.keys(figurine.affinityByTeaId)
      .filter((teaId) => catalog.teas[teaId] === undefined)
      .map((teaId) => `figurine "${figurine.id}" likes unknown tea "${teaId}"`),
  )
}
