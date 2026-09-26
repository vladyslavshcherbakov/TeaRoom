import { definitionIn } from '../Definitions/Catalog.ts'
import type { HandIndex } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { note, refuse, type Draft } from './Draft.ts'
import { liftOffTheHeater } from './HeatingCommands.ts'
import { closeTheLidAsItIsLifted } from './LidCommands.ts'
import { finishPour } from './PouringCommands.ts'
import { liftOutOfTheSink } from './SinkCommands.ts'
import { emptyTheHand, middleHandIndex, locationOfItem, moveItem, whereIs } from './Reach.ts'
import { rulesFor } from './ItemKinds.ts'
import { isCoolEnoughToHold, isInAHand, isKnown, isNotBeingPoured, isNotBurntAway, isNotInAHand, isTheKeeperAt, isWithinTheKeepersReach, wasRefusedByAnyOf } from './ItemRefusals.ts'

export function standAt(draft: Draft, command: CommandOfType<'standAt'>): void {
  const room = definitionIn(draft.catalog, 'rooms', draft.state.roomId)
  if (command.placeId !== null && !room.places.includes(command.placeId)) {
    return refuse(draft, command, 'unknownPlace', `places: ${room.places.join(', ')}`)
  }
  if (draft.state.pour !== null) finishPour(draft)
  draft.state.keeper.placeId = command.placeId
  note(draft, command.placeId === null ? 'the keeper walks away' : `the keeper stands at the ${command.placeId}`)
  draft.events.push({ type: 'keeperMoved', placeId: command.placeId })
}

export function pickUp(draft: Draft, command: CommandOfType<'pickUp'>): void {
  const itemId = command.itemId
  if (wasRefusedByAnyOf(draft, command, [isKnown(itemId), isNotBurntAway(itemId), isWithinTheKeepersReach(itemId), isNotInAHand(itemId), isNotBeingPoured(itemId), isCoolEnoughToHold(itemId)])) return
  const whereItWas = whereIs(locationOfItem(draft, itemId))
  const handIndex = freeHandOf(draft)
  if (handIndex === null) return refuse(draft, command, 'handsFull', `holding ${draft.state.keeper.hands.filter((heldItemId) => heldItemId !== null).join(' and ')}`)
  if (draft.state.heater.itemIdOnTop === itemId) liftOffTheHeater(draft, itemId)
  if (rulesFor(draft.state, itemId)?.takeIntoAHand(draft, itemId) === 'crumbled') return
  draft.state.keeper.hands[handIndex] = itemId
  liftOutOfTheSink(draft, itemId)
  moveItem(draft, itemId, { kind: 'inHand', handIndex })
  note(draft, `picked up ${itemId}, which was ${whereItWas}, into hand ${handIndex}`)
  draft.events.push({ type: 'pickedUp', itemId, handIndex })
  closeTheLidAsItIsLifted(draft, itemId, 'it was picked up')
}

export function pickUpWithAMiddleHand(draft: Draft, command: CommandOfType<'pickUpWithAMiddleHand'>): void {
  const keeper = draft.state.keeper
  if (keeper.hands[0] === null || keeper.hands[1] === null) return refuse(draft, command, 'aHandIsFree', `holding ${keeper.hands.filter((itemId) => itemId !== null).join(' and ') || 'nothing'}`)
  if (keeper.hasAMiddleHand) return refuse(draft, command, 'middleHandAlreadyGrown', `the middle hand holds ${keeper.hands[middleHandIndex] ?? 'nothing'}`)
  keeper.hasAMiddleHand = true
  pickUp(draft, { type: 'pickUp', itemId: command.itemId })
  if (keeper.hands[middleHandIndex] !== command.itemId) {
    keeper.hasAMiddleHand = false
    return note(draft, `no middle hand grows, since ${command.itemId} could not be taken into it`)
  }
  note(draft, `a middle hand grows and takes ${command.itemId}`)
  draft.events.push({ type: 'middleHandGrown', itemId: command.itemId })
}

export function putDown(draft: Draft, command: CommandOfType<'putDown'>): void {
  const itemId = command.itemId
  if (wasRefusedByAnyOf(draft, command, [isKnown(itemId), isNotBurntAway(itemId), isWithinTheKeepersReach(itemId), isInAHand(itemId), isTheKeeperAt(command.spot.placeId, 'the spot'), isNotBeingPoured(itemId)])) return
  const location = locationOfItem(draft, itemId)
  if (location?.kind === 'inHand') emptyTheHand(draft, location.handIndex)
  moveItem(draft, itemId, { kind: 'onSurface', spot: command.spot })
  note(draft, `put ${itemId} down on the ${command.spot.placeId} at (${command.spot.x.toFixed(2)}, ${command.spot.y.toFixed(2)}, ${command.spot.z.toFixed(2)})${command.spot.turnRadians === undefined ? '' : `, turned ${command.spot.turnRadians.toFixed(2)} rad`}`)
  draft.events.push({ type: 'putDown', itemId, spot: command.spot })
}

function freeHandOf(draft: Draft): HandIndex | null {
  const { hands, hasAMiddleHand } = draft.state.keeper
  if (hands[0] === null) return 0
  if (hands[1] === null) return 1
  return hasAMiddleHand && hands[middleHandIndex] === null ? middleHandIndex : null
}
