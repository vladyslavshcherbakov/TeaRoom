import { clothStainAfterTakingIn, wetMlAfterWiping } from '../Physics/Table.ts'
import type { PuddleState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { note, noteDetail, refuse, type Draft } from './Draft.ts'
import { isKeeperAt, isWithinReach, whereIs, whereTheKeeperStands } from './Reach.ts'

export function wipeTable(draft: Draft, command: CommandOfType<'wipeTable'>): void {
  const cloth = draft.state.cloth
  const placeId = draft.state.keeper.placeId
  if (cloth.location.kind !== 'inHand') return refuse(draft, command, 'notInHand', `the cloth is ${whereIs(cloth.location)}`)
  if (placeId === null) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  const puddle = draft.state.puddles[placeId]
  if (puddle === undefined) return refuse(draft, command, 'tableIsDry', `nothing is spilled on the ${placeId}`)
  const wetMlBefore = puddle.wetMl
  takeIntoTheCloth(draft, puddle, wetMlBefore - wetMlAfterWiping(wetMlBefore, command.strokeSpeedCmPerSecond, command.coveredFraction))
  noteDetail(
    draft,
    `the ${placeId} wiped at ${command.strokeSpeedCmPerSecond.toFixed(0)} cm/s over ${(command.coveredFraction * 100).toFixed(1)}%: ` +
      `${wetMlBefore.toFixed(2)} → ${puddle.wetMl.toFixed(2)} ml wet at strength ${puddle.strength.toFixed(1)}, the cloth holds ${cloth.wetMl.toFixed(2)} ml with a tea stain of ${(cloth.teaStain * 100).toFixed(0)}%`,
  )
  draft.events.push({ type: 'tableWiped', placeId, wetMlLeft: puddle.wetMl })
}

export function soakUpThePuddle(draft: Draft, command: CommandOfType<'soakUpThePuddle'>): void {
  const cloth = draft.state.cloth
  if (!isWithinReach(draft, cloth.location)) return refuse(draft, command, 'outOfReach', `the cloth is ${whereIs(cloth.location)}, ${whereTheKeeperStands(draft)}`)
  if (cloth.location.kind !== 'onSurface') return refuse(draft, command, 'notAtThatPlace', `the cloth is ${whereIs(cloth.location)}, not lying on a surface`)
  const placeId = cloth.location.spot.placeId
  if (!isKeeperAt(draft, placeId)) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the cloth lies on the ${placeId}`)
  if (cloth.isSoakingThePuddle) return refuse(draft, command, 'clothIsAlreadySoaking')
  const puddle = draft.state.puddles[placeId]
  if (puddle === undefined) return refuse(draft, command, 'tableIsDry', `nothing is spilled on the ${placeId}`)
  cloth.isSoakingThePuddle = true
  note(draft, `the cloth lies in the puddle on the ${placeId} and starts soaking it up: ${puddle.wetMl.toFixed(2)} ml wet, the cloth holds ${cloth.wetMl.toFixed(2)} ml`)
  draft.events.push({ type: 'clothLaidInThePuddle' })
}

export function liftTheClothOutOfThePuddle(draft: Draft): void {
  const cloth = draft.state.cloth
  if (!cloth.isSoakingThePuddle) return
  cloth.isSoakingThePuddle = false
  note(draft, `the cloth is lifted out of the puddle holding ${cloth.wetMl.toFixed(2)} ml`)
}

export function takeIntoTheCloth(draft: Draft, puddle: PuddleState, takenMl: number): void {
  const cloth = draft.state.cloth
  puddle.wetMl -= takenMl
  cloth.wetMl += takenMl
  cloth.teaStain = clothStainAfterTakingIn(cloth.teaStain, takenMl, puddle.strength)
}
