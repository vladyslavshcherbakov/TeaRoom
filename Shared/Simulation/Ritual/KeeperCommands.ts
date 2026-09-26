import { definitionIn } from '../Definitions/Catalog.ts'
import type { HandIndex } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { note, refuse, type Draft } from './Draft.ts'
import { liftOffTheHeater } from './HeatingCommands.ts'
import { finishPour } from './PouringCommands.ts'
import { liftTheItem } from './LiftTheItem.ts'
import { emptyTheHand, middleHandIndex, locationOfItem, moveItem, whereIs } from './Reach.ts'
import { isCoolEnoughToHold, isInAHand, isKnown, isNotBeingPoured, isNotBurntAway, isNotInAHand, isTheKeeperAt, isWithinTheKeepersReach, wasRefusedByAnyOf, type Check } from './ItemRefusals.ts'

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
  if (wasRefusedByAnyOf(draft, command, checksToTake(itemId))) return
  const handIndex = freeHandOf(draft)
  if (handIndex === null) return refuse(draft, command, 'handsFull', `holding ${describeWhatTheHandsHold(draft)}`)
  takeIntoTheHand(draft, itemId, handIndex)
}

export function pickUpWithAMiddleHand(draft: Draft, command: CommandOfType<'pickUpWithAMiddleHand'>): void {
  const itemId = command.itemId
  if (wasRefusedByAnyOf(draft, command, [...checksToTake(itemId), areBothHandsFull, hasNoMiddleHandYet])) return
  if (takeIntoTheHand(draft, itemId, middleHandIndex) === 'crumbled') return note(draft, `no middle hand grows, since ${itemId} crumbled as it was taken`)
  draft.state.keeper.hasAMiddleHand = true
  note(draft, `a middle hand grows and takes ${itemId}`)
  draft.events.push({ type: 'middleHandGrown', itemId })
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

function checksToTake(itemId: string): readonly Check[] {
  return [isKnown(itemId), isNotBurntAway(itemId), isWithinTheKeepersReach(itemId), isNotInAHand(itemId), isNotBeingPoured(itemId), isCoolEnoughToHold(itemId)]
}

function takeIntoTheHand(draft: Draft, itemId: string, handIndex: HandIndex): 'whole' | 'crumbled' {
  const whereItWas = whereIs(locationOfItem(draft, itemId))
  if (draft.state.heater.itemIdOnTop === itemId) liftOffTheHeater(draft, itemId)
  if (liftTheItem(draft, itemId) === 'crumbled') return 'crumbled'
  draft.state.keeper.hands[handIndex] = itemId
  moveItem(draft, itemId, { kind: 'inHand', handIndex })
  note(draft, `picked up ${itemId}, which was ${whereItWas}, into hand ${handIndex}`)
  draft.events.push({ type: 'pickedUp', itemId, handIndex })
  return 'whole'
}

const areBothHandsFull: Check = (draft) => {
  const [firstHand, secondHand] = draft.state.keeper.hands
  return firstHand !== null && secondHand !== null ? null : { reason: 'aHandIsFree', values: `holding ${describeWhatTheHandsHold(draft)}` }
}

const hasNoMiddleHandYet: Check = (draft) => {
  const keeper = draft.state.keeper
  return keeper.hasAMiddleHand ? { reason: 'middleHandAlreadyGrown', values: `the middle hand holds ${keeper.hands[middleHandIndex] ?? 'nothing'}` } : null
}

function describeWhatTheHandsHold(draft: Draft): string {
  return draft.state.keeper.hands.filter((itemId) => itemId !== null).join(' and ') || 'nothing'
}

function freeHandOf(draft: Draft): HandIndex | null {
  const { hands, hasAMiddleHand } = draft.state.keeper
  if (hands[0] === null) return 0
  if (hands[1] === null) return 1
  return hasAMiddleHand && hands[middleHandIndex] === null ? middleHandIndex : null
}
