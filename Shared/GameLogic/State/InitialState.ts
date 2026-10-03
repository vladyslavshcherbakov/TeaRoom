import { type Catalog } from '../Definitions/Catalog.ts'
import { definitionIn } from '../../Engine/Catalog.ts'
import type { RoomDefinition, Spot } from '../Definitions/RoomDefinition.ts'
import { dryLeaves } from '../Chemistry/Brewing.ts'
import { water } from '../Chemistry/Liquid.ts'
import type { ClothState, SessionState, VesselState } from './SessionState.ts'

export function initialSessionState(catalog: Catalog, roomId: string): SessionState {
  const room = definitionIn(catalog, 'rooms', roomId)
  return {
    elapsedSeconds: 0,
    roomId,
    atmosphere: { timeOfDay: firstOf(room.timesOfDay, room), shareThroughTheTimeOfDay: 0, weather: firstOf(room.weathers, room) },
    player: { placeId: room.playerStartsAt },
    vessels: vesselsInTheRoom(room),
    heater: {
      definitionId: room.heaterId,
      mode: { kind: 'off' },
      thermostatTargetC: definitionIn(catalog, 'heaters', room.heaterId).thermostat.startsAtC,
      switchedOnAtSeconds: 0,
      secondsHeatedByItemId: {},
      secondsWasted: 0,
      secondsHeating: 0,
      hasAnnouncedBoilingAway: false,
    },
    spoon: { gramsByTeaId: {}, capacityGrams: room.spoonCapacityGrams, charring: 0, location: { kind: 'onSurface', spot: room.spoonStartsAt } },
    cloths: clothsInTheRoom(room),
    pour: null,
    sink: { runningWater: null, hasRinsedTheItemInside: false },
    puddles: {},
    puddlesSpilled: 0,
  }
}

function vesselsInTheRoom(room: RoomDefinition): Record<string, VesselState> {
  const vessels: Record<string, VesselState> = {}
  for (const vessel of room.vessels) {
    vessels[vessel.id] = {
      id: vessel.id,
      definitionId: vessel.definitionId,
      liquid: water(vessel.initialWaterMl, room.ambientTemperatureC),
      leaves: vessel.teaStock === null ? null : dryLeaves({ [vessel.teaStock.teaId]: vessel.teaStock.grams }),
      isLidOpen: false,
      shellHeat: 0,
      hasOnlyBoiledDownSinceFull: false,
      location: { kind: 'onSurface', spot: vessel.startsAt },
    }
  }
  return vessels
}


function firstOf<Value>(values: readonly Value[], room: RoomDefinition): Value {
  const first = values[0]
  if (first === undefined) throw new Error(`room "${room.id}" offers no atmosphere to start with`)
  return first
}

function clothsInTheRoom(room: RoomDefinition): Record<string, ClothState> {
  return Object.fromEntries(room.cloths.map((cloth): [string, ClothState] => [cloth.id, newCloth(cloth.id, cloth.startsAt)]))
}

export function newCloth(id: string, startsAt: Spot): ClothState {
  return { id, wetMl: 0, teaStain: 0, charring: 0, wasBurntBeforeWashing: false, soakingPuddleId: null, location: { kind: 'onSurface', spot: startsAt } }
}
