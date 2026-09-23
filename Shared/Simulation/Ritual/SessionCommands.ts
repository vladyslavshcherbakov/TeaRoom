import { definitionIn } from '../Definitions/Catalog.ts'
import { godsVerdictOnFinishing } from '../Judgement/GodsMood.ts'
import type { CommandOfType } from './Command.ts'
import { letTheGodsJudge, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { finishPour } from './PouringCommands.ts'

const tableCountsAsDryBelowMl = 1

export function beginRitual(draft: Draft, command: CommandOfType<'beginRitual'>): void {
  if (draft.catalog.teas[command.teaId] === undefined) return refuse(draft, command, 'unknownTea')
  draft.state.phase = 'ritual'
  draft.state.teaId = command.teaId
  draft.state.caddy.teaId = command.teaId
  draft.events.push({ type: 'ritualBegan', teaId: command.teaId })
}

export function chooseAtmosphere(draft: Draft, command: CommandOfType<'chooseAtmosphere'>): void {
  const room = definitionIn(draft.catalog, 'rooms', draft.state.roomId)
  const isOffered = room.timesOfDay.includes(command.timeOfDay) && room.weathers.includes(command.weather)
  if (!isOffered) return refuse(draft, command, 'notAvailableInThisRoom')
  draft.state.atmosphere = { timeOfDay: command.timeOfDay, weather: command.weather }
  draft.events.push({ type: 'atmosphereChanged', atmosphere: draft.state.atmosphere })
}

export function finishRitual(draft: Draft): void {
  if (draft.state.pour !== null) finishPour(draft)
  if (draft.state.heater.isOn) {
    draft.state.heater.isOn = false
    draft.events.push({ type: 'heaterSwitchedOff', waterJudgement: null })
  }
  letTheGodsJudge(draft, godsVerdictOnFinishing(isTableTidy(draft)))
  draft.state.phase = 'resting'
  draft.events.push({ type: 'ritualFinished' })
}

export function leaveRoom(draft: Draft): void {
  draft.state.phase = 'ended'
  draft.events.push({ type: 'roomLeft' })
}

function isTableTidy(draft: Draft): boolean {
  const isDry = draft.state.tableWetMl < tableCountsAsDryBelowMl
  const areLidsClosed = Object.values(draft.state.vessels).every(
    (vessel) => vesselDefinitionOf(draft, vessel).lid === null || !vessel.isLidOpen,
  )
  return isDry && areLidsClosed && !draft.state.caddy.isOpen
}
