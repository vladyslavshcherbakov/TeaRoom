import { definitionIn, type Catalog } from '../Definitions/Catalog.ts'
import type { RoomDefinition } from '../Definitions/RoomDefinition.ts'
import { water } from '../Physics/Liquid.ts'
import type { FigurineState, SessionState, VesselState } from './SessionState.ts'

export const initialGodsSatisfaction = 50

export function initialSessionState(catalog: Catalog, roomId: string): SessionState {
  const room = definitionIn(catalog, 'rooms', roomId)
  return {
    phase: 'settingUp',
    elapsedSeconds: 0,
    roomId,
    atmosphere: { timeOfDay: firstOf(room.timesOfDay, room), weather: firstOf(room.weathers, room) },
    teaId: null,
    vessels: vesselsOnTheTable(room),
    heater: { definitionId: room.heaterId, isOn: false, vesselIdOnTop: null, hasAnnouncedTargetTemperature: false },
    caddy: { teaId: null, grams: room.caddyGrams, isOpen: false },
    spoon: { grams: 0, capacityGrams: room.spoonCapacityGrams },
    pour: null,
    figurines: figurinesOnTheShelf(room),
    tableWetMl: 0,
    godsSatisfaction: initialGodsSatisfaction,
    godsJudgementsMade: { water: false, firstSip: false },
  }
}

function vesselsOnTheTable(room: RoomDefinition): Record<string, VesselState> {
  const vessels: Record<string, VesselState> = {}
  for (const vessel of room.vessels) {
    vessels[vessel.id] = {
      id: vessel.id,
      definitionId: vessel.definitionId,
      liquid: water(vessel.initialWaterMl, room.ambientTemperatureC),
      leaves: null,
      isLidOpen: false,
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
