import { definitionIn } from '../../Engine/Catalog.ts'
import type { HandIndex } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { type Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'
import { commandRule, refuse } from '../../Engine/Commands.ts'
import type { TeaCommandEntry } from './TeaCommandEntry.ts'
import { itemIdsInTheHands, middleHandIndex } from '../State/WhereItemsAre.ts'
import { moveItem } from './MoveItem.ts'
import { finishPour } from './PouringCommands.ts'
import { whereTheItemIs } from './Reach.ts'
import { isCoolEnoughToHold, isInAHand, isKnown, isNotBeingPoured, isNotBurntAway, isNotInAHand, isThePlayerAt, isWithinThePlayersReach, type Check } from './ItemRefusals.ts'

export const standAtRule: TeaCommandEntry<'standAt'> = commandRule({ carryOut: standAt })

export const pickUpRule: TeaCommandEntry<'pickUp'> = commandRule({
  checks: ({ itemId }) => checksToTake(itemId),
  carryOut: pickUp,
})

export const pickUpWithAMiddleHandRule: TeaCommandEntry<'pickUpWithAMiddleHand'> = commandRule({
  checks: ({ itemId }) => [...checksToTake(itemId), areBothHandsFull, hasNoMiddleHandYet],
  carryOut: pickUpWithAMiddleHand,
})

export const putDownRule: TeaCommandEntry<'putDown'> = commandRule({
  checks: ({ itemId, spot }) => [isKnown(itemId), isNotBurntAway(itemId), isWithinThePlayersReach(itemId), isInAHand(itemId), isThePlayerAt(spot.placeId, 'the spot'), isNotBeingPoured(itemId)],
  carryOut: putDown,
})

function standAt(draft: Draft, command: CommandOfType<'standAt'>): void {
  const room = definitionIn(draft.catalog, 'rooms', draft.state.roomId)
  if (command.placeId !== null && !room.places.includes(command.placeId)) {
    return refuse(draft, command, 'unknownPlace', `places: ${room.places.join(', ')}`)
  }
  if (draft.state.pour !== null) finishPour(draft)
  const placeIdBefore = draft.state.player.placeId
  draft.state.player.placeId = command.placeId
  note(draft, command.placeId === null ? `the player walks away${placeIdBefore === null ? '' : ` from the ${placeIdBefore}`}` : `the player stands at the ${command.placeId}`)
  draft.events.push({ type: 'playerMoved', placeId: command.placeId })
}

function pickUp(draft: Draft, command: CommandOfType<'pickUp'>): void {
  const itemId = command.itemId
  const handIndex = freeHandOf(draft)
  if (handIndex === null) return refuse(draft, command, 'handsFull', `holding ${describeWhatTheHandsHold(draft)}`)
  takeIntoTheHand(draft, itemId, handIndex)
}

function pickUpWithAMiddleHand(draft: Draft, command: CommandOfType<'pickUpWithAMiddleHand'>): void {
  const itemId = command.itemId
  if (takeIntoTheHand(draft, itemId, middleHandIndex) === 'crumbled') return note(draft, `no middle hand grows, since ${itemId} crumbled as it was taken`)
  draft.state.player.hasAMiddleHand = true
  note(draft, `a middle hand grows and takes ${itemId}`)
  draft.events.push({ type: 'middleHandGrown', itemId })
}

function putDown(draft: Draft, command: CommandOfType<'putDown'>): void {
  const itemId = command.itemId
  moveItem(draft, itemId, { kind: 'onSurface', spot: command.spot })
  note(draft, `put ${itemId} down on the ${command.spot.placeId} at (${command.spot.x.toFixed(2)}, ${command.spot.y.toFixed(2)}, ${command.spot.z.toFixed(2)})${command.spot.turnRadians === undefined ? '' : `, turned ${command.spot.turnRadians.toFixed(2)} rad`}`)
  draft.events.push({ type: 'putDown', itemId, spot: command.spot })
}

function checksToTake(itemId: string): readonly Check[] {
  return [isKnown(itemId), isNotBurntAway(itemId), isWithinThePlayersReach(itemId), isNotInAHand(itemId), isNotBeingPoured(itemId), isCoolEnoughToHold(itemId)]
}

function takeIntoTheHand(draft: Draft, itemId: string, handIndex: HandIndex): 'whole' | 'crumbled' {
  const whereItWas = whereTheItemIs(draft.state, itemId)
  if (moveItem(draft, itemId, { kind: 'inHand', handIndex }) === 'crumbled') return 'crumbled'
  note(draft, `picked up ${itemId}, which was ${whereItWas}, into hand ${handIndex}`)
  draft.events.push({ type: 'pickedUp', itemId, handIndex })
  return 'whole'
}

const areBothHandsFull: Check = (draft) => {
  const [firstHand, secondHand] = itemIdsInTheHands(draft.state)
  return firstHand !== null && secondHand !== null ? null : { reason: 'aHandIsFree', values: `holding ${describeWhatTheHandsHold(draft)}` }
}

const hasNoMiddleHandYet: Check = (draft) => {
  const player = draft.state.player
  return player.hasAMiddleHand ? { reason: 'middleHandAlreadyGrown', values: `the middle hand holds ${itemIdsInTheHands(draft.state)[middleHandIndex] ?? 'nothing'}` } : null
}

function describeWhatTheHandsHold(draft: Draft): string {
  return itemIdsInTheHands(draft.state).filter((itemId) => itemId !== null).join(' and ') || 'nothing'
}

function freeHandOf(draft: Draft): HandIndex | null {
  const hands = itemIdsInTheHands(draft.state)
  if (hands[0] === null) return 0
  if (hands[1] === null) return 1
  return draft.state.player.hasAMiddleHand && hands[middleHandIndex] === null ? middleHandIndex : null
}
