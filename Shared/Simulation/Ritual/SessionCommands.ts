import { definitionIn } from '../Definitions/Catalog.ts'
import { godsVerdictOnFinishing } from '../Judgement/GodsMood.ts'
import type { CommandOfType } from './Command.ts'
import { letTheGodsJudge, note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { finishPour } from './PouringCommands.ts'

const tableCountsAsDryBelowMl = 1

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
    draft.state.heater.isOn = false
    note(draft, 'heater switched off because the ritual finished')
    draft.events.push({ type: 'heaterSwitchedOff', waterJudgement: null })
  }
  const openLids = openLidsOf(draft)
  const isTidy = draft.state.tableWetMl < tableCountsAsDryBelowMl && openLids.length === 0
  note(
    draft,
    `ritual finished: table ${draft.state.tableWetMl.toFixed(1)} ml wet, open lids: ${openLids.join(', ') || 'none'}, ${isTidy ? 'tidy' : 'not tidy'}`,
  )
  letTheGodsJudge(draft, godsVerdictOnFinishing(isTidy))
  draft.state.phase = 'resting'
  draft.events.push({ type: 'ritualFinished' })
}

export function leaveRoom(draft: Draft): void {
  draft.state.phase = 'ended'
  note(draft, `room left after ${draft.state.elapsedSeconds.toFixed(1)} s, gods at ${draft.state.godsSatisfaction}`)
  draft.events.push({ type: 'roomLeft' })
}

function openLidsOf(draft: Draft): string[] {
  const openLids = Object.values(draft.state.vessels)
    .filter((vessel) => vesselDefinitionOf(draft, vessel).lid !== null && vessel.isLidOpen)
    .map((vessel) => vessel.id)
  return draft.state.caddy.isOpen ? [...openLids, 'caddy'] : openLids
}
