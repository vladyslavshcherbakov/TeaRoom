import { wetMlAfterWiping } from '../Physics/Table.ts'
import type { CommandOfType } from './Command.ts'
import { note, refuse, type Draft } from './Draft.ts'
import { isKeeperAt, ritualPlaceOf, whereIs, whereTheKeeperStands } from './Reach.ts'

export function wipeTable(draft: Draft, command: CommandOfType<'wipeTable'>): void {
  const cloth = draft.state.cloth
  if (cloth.location.kind !== 'inHand') return refuse(draft, command, 'notInHand', `the cloth is ${whereIs(cloth.location)}`)
  if (!isKeeperAt(draft, ritualPlaceOf(draft))) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the wet table is at the ${ritualPlaceOf(draft)}`)
  const wetMlBefore = draft.state.tableWetMl
  draft.state.tableWetMl = wetMlAfterWiping(wetMlBefore, command.strokeSpeedCmPerSecond, command.coveredFraction)
  note(
    draft,
    `table wiped at ${command.strokeSpeedCmPerSecond.toFixed(0)} cm/s over ${(command.coveredFraction * 100).toFixed(0)}%: ` +
      `${wetMlBefore.toFixed(1)} → ${draft.state.tableWetMl.toFixed(1)} ml wet`,
  )
  draft.events.push({ type: 'tableWiped', wetMlLeft: draft.state.tableWetMl })
}
