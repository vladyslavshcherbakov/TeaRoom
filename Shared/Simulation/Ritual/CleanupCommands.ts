import { clothStainAfterTakingIn, wetMlAfterWiping } from '../Physics/Table.ts'
import type { ClothState, PuddleState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { note, noteDetail, refuse, type Draft } from './Draft.ts'
import { isKeeperAt, isWithinReach, whereIs, whereTheKeeperStands } from './Reach.ts'
import { percent } from './Percent.ts'

export function wipeTable(draft: Draft, command: CommandOfType<'wipeTable'>): void {
  const cloth = draft.state.cloths[command.clothId]
  const placeId = draft.state.keeper.placeId
  if (cloth === undefined) return refuse(draft, command, 'unknownItem', `the room has no cloth ${command.clothId}`)
  if (cloth.location.kind !== 'inHand') return refuse(draft, command, 'notInHand', `${cloth.id} is ${whereIs(cloth.location)}`)
  if (placeId === null) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  const puddle = draft.state.puddles[placeId]
  if (puddle === undefined) return refuse(draft, command, 'tableIsDry', `nothing is spilled on the ${placeId}`)
  const wetMlBefore = puddle.wetMl
  takeIntoTheCloth(cloth, puddle, wetMlBefore - wetMlAfterWiping(wetMlBefore, command.strokeSpeedCmPerSecond, command.coveredFraction))
  noteDetail(
    draft,
    `the ${placeId} wiped at ${command.strokeSpeedCmPerSecond.toFixed(0)} cm/s over ${(command.coveredFraction * 100).toFixed(1)}%: ` +
      `${wetMlBefore.toFixed(2)} → ${puddle.wetMl.toFixed(2)} ml wet at strength ${puddle.strength.toFixed(1)}, ${cloth.id} holds ${cloth.wetMl.toFixed(2)} ml with a tea stain of ${percent(cloth.teaStain)}`,
  )
  draft.events.push({ type: 'tableWiped', placeId, wetMlLeft: puddle.wetMl })
}

export function soakUpThePuddle(draft: Draft, command: CommandOfType<'soakUpThePuddle'>): void {
  const cloth = draft.state.cloths[command.clothId]
  if (cloth === undefined) return refuse(draft, command, 'unknownItem', `the room has no cloth ${command.clothId}`)
  if (!isWithinReach(draft, cloth.location)) return refuse(draft, command, 'outOfReach', `${cloth.id} is ${whereIs(cloth.location)}, ${whereTheKeeperStands(draft)}`)
  if (cloth.location.kind !== 'onSurface') return refuse(draft, command, 'notAtThatPlace', `${cloth.id} is ${whereIs(cloth.location)}, not lying on a surface`)
  const placeId = cloth.location.spot.placeId
  if (!isKeeperAt(draft, placeId)) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, ${cloth.id} lies on the ${placeId}`)
  if (cloth.isSoakingThePuddle) return refuse(draft, command, 'clothIsAlreadySoaking')
  const puddle = draft.state.puddles[placeId]
  if (puddle === undefined) return refuse(draft, command, 'tableIsDry', `nothing is spilled on the ${placeId}`)
  cloth.isSoakingThePuddle = true
  note(draft, `${cloth.id} lies in the puddle on the ${placeId} and starts soaking it up: ${puddle.wetMl.toFixed(2)} ml wet, ${cloth.id} holds ${cloth.wetMl.toFixed(2)} ml`)
  draft.events.push({ type: 'clothLaidInThePuddle', clothId: cloth.id })
}

export function liftTheClothOutOfThePuddle(draft: Draft, cloth: ClothState): void {
  if (!cloth.isSoakingThePuddle) return
  cloth.isSoakingThePuddle = false
  note(draft, `${cloth.id} is lifted out of the puddle holding ${cloth.wetMl.toFixed(2)} ml`)
}

export function takeIntoTheCloth(cloth: ClothState, puddle: PuddleState, takenMl: number): void {
  puddle.wetMl -= takenMl
  cloth.wetMl += takenMl
  cloth.teaStain = clothStainAfterTakingIn(cloth.teaStain, takenMl, puddle.strength)
}
