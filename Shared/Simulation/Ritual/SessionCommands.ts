import { definitionIn } from '../Definitions/Catalog.ts'
import type { CommandOfType } from './Command.ts'
import { note, refuse, type Draft } from './Draft.ts'
import { hoursSinceSunriseOf } from '../Judgement/TimeOfDayJudgement.ts'
import { clampedToShare } from '../Physics/ClampedToShare.ts'

export function chooseAtmosphere(draft: Draft, command: CommandOfType<'chooseAtmosphere'>): void {
  const room = definitionIn(draft.catalog, 'rooms', draft.state.roomId)
  const isOffered = room.timesOfDay.includes(command.timeOfDay) && room.weathers.includes(command.weather)
  if (!isOffered) {
    return refuse(draft, command, 'notAvailableInThisRoom', `${room.id} offers ${room.timesOfDay.join('/')} with ${room.weathers.join('/')}`)
  }
  draft.state.atmosphere = { timeOfDay: command.timeOfDay, shareThroughTheTimeOfDay: clampedToShare(command.shareThroughTheTimeOfDay), weather: command.weather }
  note(draft, `atmosphere set to ${command.timeOfDay}, ${hoursSinceSunriseOf(draft.state.atmosphere).toFixed(1)} hours after sunrise, ${command.weather}`)
  draft.events.push({ type: 'atmosphereChanged', atmosphere: draft.state.atmosphere })
}
