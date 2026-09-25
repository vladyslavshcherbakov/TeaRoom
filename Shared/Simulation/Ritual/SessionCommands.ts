import { definitionIn } from '../Definitions/Catalog.ts'
import type { CommandOfType } from './Command.ts'
import { note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { switchTheHeaterOff } from './HeatingCommands.ts'
import { finishPour } from './PouringCommands.ts'
import { wetMlOnEveryPlace } from './Puddles.ts'

export function beginRitual(draft: Draft, command: CommandOfType<'beginRitual'>): void {
  if (draft.catalog.teas[command.teaId] === undefined) {
    return refuse(draft, command, 'unknownTea', `known teas: ${Object.keys(draft.catalog.teas).join(', ')}`)
  }
  draft.state.phase = 'ritual'
  draft.state.teaId = command.teaId
  draft.state.caddy.teaId = command.teaId
  note(draft, `ritual began with ${command.teaId}, caddy holds ${draft.state.caddy.grams} g`)
  draft.events.push({ type: 'ritualBegan', teaId: command.teaId })
}

export function chooseAtmosphere(draft: Draft, command: CommandOfType<'chooseAtmosphere'>): void {
  const room = definitionIn(draft.catalog, 'rooms', draft.state.roomId)
  const isOffered = room.timesOfDay.includes(command.timeOfDay) && room.weathers.includes(command.weather)
  if (!isOffered) {
    return refuse(draft, command, 'notAvailableInThisRoom', `${room.id} offers ${room.timesOfDay.join('/')} with ${room.weathers.join('/')}`)
  }
  draft.state.atmosphere = { timeOfDay: command.timeOfDay, weather: command.weather }
  note(draft, `atmosphere set to ${command.timeOfDay}, ${command.weather}`)
  draft.events.push({ type: 'atmosphereChanged', atmosphere: draft.state.atmosphere })
}

export function finishRitual(draft: Draft): void {
  if (draft.state.pour !== null) finishPour(draft)
  if (draft.state.heater.isOn) {
    note(draft, 'heater switched off because the ritual finished')
    switchTheHeaterOff(draft, null)
  }
  const openLids = openLidsOf(draft)
  note(draft, `ritual finished: ${wetMlOnEveryPlace(draft.state).toFixed(1)} ml wet on every place, open lids: ${openLids.join(', ') || 'none'}`)
  draft.state.phase = 'resting'
  draft.events.push({ type: 'ritualFinished' })
}

export function leaveRoom(draft: Draft): void {
  draft.state.phase = 'ended'
  note(draft, `room left after ${draft.state.elapsedSeconds.toFixed(1)} s`)
  draft.events.push({ type: 'roomLeft' })
}

function openLidsOf(draft: Draft): string[] {
  const openLids = Object.values(draft.state.vessels)
    .filter((vessel) => vesselDefinitionOf(draft, vessel).lid !== null && vessel.isLidOpen)
    .map((vessel) => vessel.id)
  return draft.state.caddy.isOpen ? [...openLids, 'caddy'] : openLids
}
