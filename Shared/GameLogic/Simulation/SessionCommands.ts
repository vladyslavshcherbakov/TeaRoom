import { definitionIn } from '../../Engine/Catalog.ts'
import type { CommandOfType } from './Command.ts'
import { type Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'
import { commandRule, refuse } from '../../Engine/Commands.ts'
import type { TeaCommandEntry } from './TeaCommandEntry.ts'
import { hoursSinceSunriseOf } from '../Judgement/TimeOfDayJudgement.ts'
import { clampedToShare } from '../../Engine/ClampedToShare.ts'

export const chooseAtmosphereRule: TeaCommandEntry<'chooseAtmosphere'> = commandRule({ carryOut: chooseAtmosphere })

function chooseAtmosphere(draft: Draft, command: CommandOfType<'chooseAtmosphere'>): void {
  const room = definitionIn(draft.catalog, 'rooms', draft.state.roomId)
  const isOffered = room.timesOfDay.includes(command.timeOfDay) && room.weathers.includes(command.weather)
  if (!isOffered) {
    return refuse(draft, command, 'notAvailableInThisRoom', `${room.id} offers ${room.timesOfDay.join('/')} with ${room.weathers.join('/')}`)
  }
  draft.state.atmosphere = { timeOfDay: command.timeOfDay, shareThroughTheTimeOfDay: clampedToShare(command.shareThroughTheTimeOfDay), weather: command.weather }
  note(draft, `atmosphere set to ${command.timeOfDay}, ${hoursSinceSunriseOf(draft.state.atmosphere).toFixed(1)} hours after sunrise, ${command.weather}`)
  draft.events.push({ type: 'atmosphereChanged', atmosphere: draft.state.atmosphere })
}
