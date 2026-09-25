import { definitionIn, type Catalog } from '../Definitions/Catalog.ts'
import type { RoomDefinition } from '../Definitions/RoomDefinition.ts'
import { water } from '../Physics/Liquid.ts'
import type { FigurineState, SessionState, VesselState } from './SessionState.ts'

export function initialSessionState(catalog: Catalog, roomId: string): SessionState {
  const room = definitionIn(catalog, 'rooms', roomId)
  return {
    phase: 'settingUp',
    elapsedSeconds: 0,
    roomId,
    atmosphere: { timeOfDay: firstOf(room.timesOfDay, room), weather: firstOf(room.weathers, room) },
    teaId: null,
    keeper: { placeId: room.keeperStartsAt, hands: [null, null] },
    vessels: vesselsInTheRoom(room),
    heater: { definitionId: room.heaterId, isOn: false, itemIdOnTop: null, hasAnnouncedTargetTemperature: false, hasAnnouncedBoilingAway: false },
    caddy: { teaId: null, grams: room.caddyGrams, isOpen: false, location: { kind: 'onSurface', spot: room.caddyStartsAt } },
    spoon: { grams: 0, capacityGrams: room.spoonCapacityGrams, location: { kind: 'onSurface', spot: room.spoonStartsAt } },
    cloth: { wetMl: 0, teaStain: 0, charring: 0, wasBurntBeforeWashing: false, isSoakingThePuddle: false, location: { kind: 'onSurface', spot: room.clothStartsAt } },
    pour: null,
    sink: { itemIdInside: null, runningWater: null, hasRunOverTheItemInside: false },
    figurines: figurinesOnTheShelf(room),
    puddles: {},
  }
}

function vesselsInTheRoom(room: RoomDefinition): Record<string, VesselState> {
  const vessels: Record<string, VesselState> = {}
  for (const vessel of room.vessels) {
    vessels[vessel.id] = {
      id: vessel.id,
      definitionId: vessel.definitionId,
      liquid: water(vessel.initialWaterMl, room.ambientTemperatureC),
      leaves: null,
      isLidOpen: false,
      shellHeat: 0,
      location: { kind: 'onSurface', spot: vessel.startsAt },
    }
  }
  return vessels
}

function figurinesOnTheShelf(room: RoomDefinition): Record<string, FigurineState> {
  const figurines: Record<string, FigurineState> = {}
  for (const id of room.figurineIds) {
    figurines[id] = { id, satisfaction: 0, wasOfferedTeaThisRitual: false }
  }
  return figurines
}

function firstOf<Value>(values: readonly Value[], room: RoomDefinition): Value {
  const first = values[0]
  if (first === undefined) throw new Error(`room "${room.id}" offers no atmosphere to start with`)
  return first
}
