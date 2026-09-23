import type { Phase } from '../State/SessionState.ts'
import type { Command } from './Command.ts'
import type { RefusalReason } from './RitualEvent.ts'

const commandsWhileSettingUp: ReadonlySet<Command['type']> = new Set(['beginRitual', 'chooseAtmosphere'])
const commandsWhileResting: ReadonlySet<Command['type']> = new Set(['chooseAtmosphere', 'leaveRoom'])

export function refusalInPhase(phase: Phase, commandType: Command['type']): RefusalReason | null {
  switch (phase) {
    case 'settingUp':
      return commandsWhileSettingUp.has(commandType) ? null : 'ritualNotStarted'
    case 'ritual':
      if (commandType === 'beginRitual') return 'ritualAlreadyStarted'
      if (commandType === 'leaveRoom') return 'ritualInProgress'
      return null
    case 'resting':
      return commandsWhileResting.has(commandType) ? null : 'ritualIsOver'
    case 'ended':
      return 'sessionEnded'
  }
}
