import { definitionIn } from '../../Engine/Catalog.ts'
import type { HandIndex, InventorySlot } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { type Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'
import { commandRule, refuse } from '../../Engine/Commands.ts'
import type { TeaCommandEntry } from './TeaCommandEntry.ts'
import { itemIdsInTheHands, itemIdsInTheInventory } from '../State/WhereItemsAre.ts'
import { moveItem } from './MoveItem.ts'
import { finishPour } from './PouringCommands.ts'
import { whereTheItemIs } from './Reach.ts'
import { isCoolEnoughToHold, isInAHand, isKnown, isNotBeingPoured, isNotBurntAway, isNotInAHand, isNotPutAway, isThePlayerAt, isWithinReachOrPutAway, isWithinThePlayersReach, type Check } from './ItemRefusals.ts'

export const standAtRule: TeaCommandEntry<'standAt'> = commandRule({ carryOut: standAt })

export const pickUpRule: TeaCommandEntry<'pickUp'> = commandRule({
  checks: ({ itemId }) => checksToTake(itemId),
  carryOut: pickUp,
})

export const putAwayRule: TeaCommandEntry<'putAway'> = commandRule({
  checks: ({ itemId }) => [isKnown(itemId), isNotBurntAway(itemId), isNotPutAway(itemId), isWithinThePlayersReach(itemId), isNotBeingPoured(itemId), isCoolEnoughToHold(itemId)],
  carryOut: putAway,
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

function putAway(draft: Draft, command: CommandOfType<'putAway'>): void {
  const itemId = command.itemId
  const slotIndex = freeInventorySlotOf(draft)
  if (slotIndex === null) return refuse(draft, command, 'inventoryFull', `the inventory holds ${itemIdsInTheInventory(draft.state).join(' and ')}`)
  const whereItWas = whereTheItemIs(draft.state, itemId)
  if (moveItem(draft, itemId, { kind: 'inTheInventory', slotIndex }) === 'crumbled') return
  note(draft, `put ${itemId}, which was ${whereItWas}, away in place ${slotIndex} of the inventory`)
  draft.events.push({ type: 'putAway', itemId, slotIndex })
}

function putDown(draft: Draft, command: CommandOfType<'putDown'>): void {
  const itemId = command.itemId
  moveItem(draft, itemId, { kind: 'onSurface', spot: command.spot })
  note(draft, `put ${itemId} down on the ${command.spot.placeId} at (${command.spot.x.toFixed(2)}, ${command.spot.y.toFixed(2)}, ${command.spot.z.toFixed(2)})${command.spot.turnRadians === undefined ? '' : `, turned ${command.spot.turnRadians.toFixed(2)} rad`}`)
  draft.events.push({ type: 'putDown', itemId, spot: command.spot })
}

function checksToTake(itemId: string): readonly Check[] {
  return [isKnown(itemId), isNotBurntAway(itemId), isWithinReachOrPutAway(itemId), isNotInAHand(itemId), isNotBeingPoured(itemId), isCoolEnoughToHold(itemId)]
}

function takeIntoTheHand(draft: Draft, itemId: string, handIndex: HandIndex): void {
  const whereItWas = whereTheItemIs(draft.state, itemId)
  if (moveItem(draft, itemId, { kind: 'inHand', handIndex }) === 'crumbled') return
  note(draft, `picked up ${itemId}, which was ${whereItWas}, into hand ${handIndex}`)
  draft.events.push({ type: 'pickedUp', itemId, handIndex })
}

function describeWhatTheHandsHold(draft: Draft): string {
  return itemIdsInTheHands(draft.state).filter((itemId) => itemId !== null).join(' and ') || 'nothing'
}

function freeHandOf(draft: Draft): HandIndex | null {
  const hands = itemIdsInTheHands(draft.state)
  if (hands[0] === null) return 0
  return hands[1] === null ? 1 : null
}

function freeInventorySlotOf(draft: Draft): InventorySlot | null {
  const inventory = itemIdsInTheInventory(draft.state)
  if (inventory[0] === null) return 0
  return inventory[1] === null ? 1 : null
}
