import { clothStainAfterTakingIn, wetMlAfterWiping } from '../Physics/Table.ts'
import type { CommandOfType } from './Command.ts'
import { note, noteDetail, refuse, type Draft } from './Draft.ts'
import { isKeeperAt, isWithinReach, ritualPlaceOf, whereIs, whereTheKeeperStands } from './Reach.ts'

export function wipeTable(draft: Draft, command: CommandOfType<'wipeTable'>): void {
  const cloth = draft.state.cloth
  if (cloth.location.kind !== 'inHand') return refuse(draft, command, 'notInHand', `the cloth is ${whereIs(cloth.location)}`)
  if (!isKeeperAt(draft, ritualPlaceOf(draft))) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the wet table is at the ${ritualPlaceOf(draft)}`)
  const wetMlBefore = draft.state.tableWetMl
  takeIntoTheCloth(draft, wetMlBefore - wetMlAfterWiping(wetMlBefore, command.strokeSpeedCmPerSecond, command.coveredFraction))
  noteDetail(
    draft,
    `table wiped at ${command.strokeSpeedCmPerSecond.toFixed(0)} cm/s over ${(command.coveredFraction * 100).toFixed(1)}%: ` +
      `${wetMlBefore.toFixed(2)} → ${draft.state.tableWetMl.toFixed(2)} ml wet at strength ${draft.state.puddleStrength.toFixed(1)}, the cloth holds ${cloth.wetMl.toFixed(2)} ml with a tea stain of ${(cloth.teaStain * 100).toFixed(0)}%`,
  )
  draft.events.push({ type: 'tableWiped', wetMlLeft: draft.state.tableWetMl })
}

export function soakUpThePuddle(draft: Draft, command: CommandOfType<'soakUpThePuddle'>): void {
  const cloth = draft.state.cloth
  const ritualPlaceId = ritualPlaceOf(draft)
  if (!isWithinReach(draft, cloth.location)) return refuse(draft, command, 'outOfReach', `the cloth is ${whereIs(cloth.location)}, ${whereTheKeeperStands(draft)}`)
  if (cloth.location.kind !== 'onSurface' || cloth.location.spot.placeId !== ritualPlaceId) return refuse(draft, command, 'notAtThatPlace', `the cloth is ${whereIs(cloth.location)}, the wet table is at the ${ritualPlaceId}`)
  if (!isKeeperAt(draft, ritualPlaceId)) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the wet table is at the ${ritualPlaceId}`)
  if (cloth.isSoakingThePuddle) return refuse(draft, command, 'clothIsAlreadySoaking')
  if (draft.state.tableWetMl === 0) return refuse(draft, command, 'tableIsDry')
  cloth.isSoakingThePuddle = true
  note(draft, `the cloth lies in the puddle and starts soaking it up: the table is ${draft.state.tableWetMl.toFixed(2)} ml wet, the cloth holds ${cloth.wetMl.toFixed(2)} ml`)
  draft.events.push({ type: 'clothLaidInThePuddle' })
}

export function liftTheClothOutOfThePuddle(draft: Draft): void {
  const cloth = draft.state.cloth
  if (!cloth.isSoakingThePuddle) return
  cloth.isSoakingThePuddle = false
  note(draft, `the cloth is lifted out of the puddle holding ${cloth.wetMl.toFixed(2)} ml, the table is ${draft.state.tableWetMl.toFixed(2)} ml wet`)
}

export function takeIntoTheCloth(draft: Draft, takenMl: number): void {
  const cloth = draft.state.cloth
  draft.state.tableWetMl -= takenMl
  cloth.wetMl += takenMl
  cloth.teaStain = clothStainAfterTakingIn(cloth.teaStain, takenMl, draft.state.puddleStrength)
}
