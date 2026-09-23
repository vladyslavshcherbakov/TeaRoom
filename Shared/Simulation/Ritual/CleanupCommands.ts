import { wetMlAfterWiping } from '../Physics/Table.ts'
import type { CommandOfType } from './Command.ts'
import type { Draft } from './Draft.ts'

export function wipeTable(draft: Draft, command: CommandOfType<'wipeTable'>): void {
  draft.state.tableWetMl = wetMlAfterWiping(draft.state.tableWetMl, command.strokeSpeedCmPerSecond, command.coveredFraction)
  draft.events.push({ type: 'tableWiped', wetMlLeft: draft.state.tableWetMl })
}
