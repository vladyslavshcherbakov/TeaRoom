import { wetMlAfterWiping } from '../Physics/Table.ts'
import type { CommandOfType } from './Command.ts'
import { note, refuse, type Draft } from './Draft.ts'
import { isKeeperAt, ritualPlaceOf, whereTheKeeperStands } from './Reach.ts'

export function wipeTable(draft: Draft, command: CommandOfType<'wipeTable'>): void {
  if (!isKeeperAt(draft, ritualPlaceOf(draft))) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the cloth is at the ${ritualPlaceOf(draft)}`)
  const wetMlBefore = draft.state.tableWetMl
  draft.state.tableWetMl = wetMlAfterWiping(wetMlBefore, command.strokeSpeedCmPerSecond, command.coveredFraction)
  note(
    draft,
    `table wiped at ${command.strokeSpeedCmPerSecond.toFixed(0)} cm/s over ${(command.coveredFraction * 100).toFixed(0)}%: ` +
      `${wetMlBefore.toFixed(1)} → ${draft.state.tableWetMl.toFixed(1)} ml wet`,
  )
  draft.events.push({ type: 'tableWiped', wetMlLeft: draft.state.tableWetMl })
}
