import { clothStainAfterTakingIn, mlTheClothTakesIn, wetMlAfterWiping } from '../Chemistry/Table.ts'
import type { ClothState, PuddleState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { type Draft } from './Draft.ts'
import { note, noteDetail } from '../../Engine/Draft.ts'
import { commandRuleOnASubject, found, refuse, refusedWith, type Found } from '../../Engine/Commands.ts'
import type { TeaCommandEntry } from './TeaCommandEntry.ts'
import type { RefusalReason } from './TeaEvent.ts'
import { isInAHand, isWithinThePlayersReach } from './ItemRefusals.ts'
import { whereTheItemIs, whereThePlayerStands } from './Reach.ts'
import { percent } from '../../Engine/Percent.ts'

const slowestStrokeCmPerSecond = 0

export const wipeTableRule: TeaCommandEntry<'wipeTable'> = commandRuleOnASubject({
  isLoggedOnReceipt: false,
  find: (draft, command) => foundCloth(draft, command.clothId),
  checks: (cloth) => [isWithinThePlayersReach(cloth.id), isInAHand(cloth.id)],
  carryOut: wipeTable,
})

export const soakUpThePuddleRule: TeaCommandEntry<'soakUpThePuddle'> = commandRuleOnASubject({
  find: (draft, command) => foundCloth(draft, command.clothId),
  checks: (cloth) => [isWithinThePlayersReach(cloth.id)],
  carryOut: soakUpThePuddle,
})

export const puddleReachesTheClothRule: TeaCommandEntry<'puddleReachesTheCloth'> = commandRuleOnASubject({
  find: (draft, command) => foundCloth(draft, command.clothId),
  checks: () => [],
  carryOut: soakUpThePuddle,
})

export function takeIntoTheCloth(cloth: ClothState, puddle: PuddleState, offeredMl: number): number {
  const takenMl = mlTheClothTakesIn(cloth.wetMl, offeredMl)
  puddle.wetMl -= takenMl
  cloth.wetMl += takenMl
  cloth.teaStain = clothStainAfterTakingIn(cloth.teaStain, takenMl, puddle.strength)
  return takenMl
}

function wipeTable(draft: Draft, cloth: ClothState, command: CommandOfType<'wipeTable'>): void {
  const puddle = draft.state.puddles[command.puddleId]
  if (puddle === undefined) return refuse(draft, command, 'tableIsDry', `${command.puddleId} is not spilled`)
  const placeId = puddle.centre.placeId
  if (draft.state.player.placeId !== placeId) return refuse(draft, command, 'notAtThatPlace', `${command.puddleId} lies on the ${placeId}, and ${whereThePlayerStands(draft)}`)
  const wetMlBefore = puddle.wetMl
  wipeUp(cloth, puddle, command.strokeSpeedCmPerSecond, command.coveredFraction)
  if (hasFallenPastAPowerOfTwo(wetMlBefore, puddle.wetMl)) noteDetail(
    draft,
    `${command.puddleId} on the ${placeId} wiped at ${command.strokeSpeedCmPerSecond.toFixed(0)} cm/s over ${(command.coveredFraction * 100).toFixed(1)}%: ` +
      `${wetMlBefore.toFixed(2)} → ${puddle.wetMl.toFixed(2)} ml wet at strength ${puddle.strength.toFixed(1)}, ${cloth.id} holds ${cloth.wetMl.toFixed(2)} ml with a tea stain of ${percent(cloth.teaStain)}`,
  )
  draft.events.push({ type: 'tableWiped', puddleId: command.puddleId, placeId, wetMlLeft: puddle.wetMl })
}

function soakUpThePuddle(draft: Draft, cloth: ClothState, command: CommandOfType<'soakUpThePuddle' | 'puddleReachesTheCloth'>): void {
  if (cloth.location.kind !== 'onSurface') return refuse(draft, command, 'alreadyInHand', `${cloth.id} is ${whereTheItemIs(draft.state, cloth.id)}`)
  if (cloth.soakingPuddleId !== null) return refuse(draft, command, 'clothIsAlreadySoaking', `${cloth.id} soaks ${cloth.soakingPuddleId}`)
  const puddle = draft.state.puddles[command.puddleId]
  if (puddle === undefined) return refuse(draft, command, 'tableIsDry', `${command.puddleId} is not spilled`)
  const wetMlBefore = puddle.wetMl
  wipeUp(cloth, puddle, slowestStrokeCmPerSecond, command.coveredFraction)
  cloth.soakingPuddleId = command.puddleId
  note(draft, `${cloth.id} lies in ${percent(command.coveredFraction)} of ${command.puddleId} on the ${puddle.centre.placeId}, takes it from ${wetMlBefore.toFixed(2)} to ${puddle.wetMl.toFixed(2)} ml at once and soaks up the rest: ${cloth.id} holds ${cloth.wetMl.toFixed(2)} ml`)
  draft.events.push({ type: 'clothStartedSoaking', clothId: cloth.id })
}

function wipeUp(cloth: ClothState, puddle: PuddleState, strokeSpeedCmPerSecond: number, coveredFraction: number): void {
  const wipedMl = puddle.wetMl - wetMlAfterWiping(puddle.wetMl, strokeSpeedCmPerSecond, coveredFraction)
  const takenMl = mlTheClothTakesIn(cloth.wetMl, wipedMl)
  puddle.wetMl -= wipedMl
  cloth.wetMl += takenMl
  cloth.teaStain = clothStainAfterTakingIn(cloth.teaStain, takenMl, puddle.strength)
}

function foundCloth(draft: Draft, clothId: string): Found<ClothState, RefusalReason> {
  const cloth = draft.state.cloths[clothId]
  return cloth === undefined ? refusedWith('unknownItem', `the room has no cloth ${clothId}`) : found(cloth)
}

function hasFallenPastAPowerOfTwo(wetMlBefore: number, wetMlAfter: number): boolean {
  return Math.floor(Math.log2(wetMlBefore)) !== Math.floor(Math.log2(wetMlAfter))
}
