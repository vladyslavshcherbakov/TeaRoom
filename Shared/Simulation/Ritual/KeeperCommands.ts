import { definitionIn } from '../Definitions/Catalog.ts'
import type { HandIndex } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { isInvolvedInPour, note, refuse, type Draft } from './Draft.ts'
import { liftOffTheHeater } from './HeatingCommands.ts'
import { closeTheLidAsItIsLifted } from './LidCommands.ts'
import { finishPour } from './PouringCommands.ts'
import { liftTheClothOutOfThePuddle } from './CleanupCommands.ts'
import { liftOutOfTheSink } from './SinkCommands.ts'
import { emptyTheHand, middleHandIndex, spoonItemId, locationOfItem, moveItem, whereIs, whereTheKeeperStands } from './Reach.ts'
import { howTheSpoonChars, isBurning } from '../Physics/Charring.ts'
import { isCoolEnoughToHold, isKnown, isNotBeingPoured, isNotBurntAway, isNotInAHand, isWithinTheKeepersReach, wasRefusedByAnyOf } from './ItemRefusals.ts'
import { percent } from './Percent.ts'

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
  if (wasRefusedByAnyOf(draft, command, command.itemId, [isKnown, isNotInAHand, isNotBurntAway, isWithinTheKeepersReach, isNotBeingPoured, isCoolEnoughToHold])) return
  const whereItWas = whereIs(locationOfItem(draft, command.itemId))
  const handIndex = freeHandOf(draft)
  if (handIndex === null) return refuse(draft, command, 'handsFull', `holding ${draft.state.keeper.hands.filter((itemId) => itemId !== null).join(' and ')}`)
  if (draft.state.heater.itemIdOnTop === command.itemId) liftOffTheHeater(draft, command.itemId)
  if (command.itemId === spoonItemId && isBurning(draft.state.spoon.charring, howTheSpoonChars)) return crumbleTheSpoon(draft)
  draft.state.keeper.hands[handIndex] = command.itemId
  const cloth = draft.state.cloths[command.itemId]
  if (cloth !== undefined) liftTheClothOutOfThePuddle(draft, cloth)
  liftOutOfTheSink(draft, command.itemId)
  moveItem(draft, command.itemId, { kind: 'inHand', handIndex })
  note(draft, `picked up ${command.itemId}, which was ${whereItWas}, into hand ${handIndex}`)
  draft.events.push({ type: 'pickedUp', itemId: command.itemId, handIndex })
  closeTheLidAsItIsLifted(draft, command.itemId, 'it was picked up')
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
  const location = locationOfItem(draft, command.itemId)
  if (location === undefined) return refuse(draft, command, 'unknownItem')
  if (location.kind !== 'inHand') return refuse(draft, command, 'notInHand', `${command.itemId} is ${whereIs(location)}`)
  if (draft.state.keeper.placeId !== command.spot.placeId) {
    return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, not at the ${command.spot.placeId}`)
  }
  if (isInvolvedInPour(draft, command.itemId)) return refuse(draft, command, 'vesselIsBeingPoured')
  emptyTheHand(draft, location.handIndex)
  moveItem(draft, command.itemId, { kind: 'onSurface', spot: command.spot })
  note(draft, `put ${command.itemId} down on the ${command.spot.placeId} at (${command.spot.x.toFixed(2)}, ${command.spot.y.toFixed(2)}, ${command.spot.z.toFixed(2)})`)
  draft.events.push({ type: 'putDown', itemId: command.itemId, spot: command.spot })
}

function crumbleTheSpoon(draft: Draft): void {
  const spoon = draft.state.spoon
  const gramsLost = spoon.grams
  note(draft, `the spoon, ${percent(spoon.charring)} charred, crumbles to ash as it is taken, and ${gramsLost.toFixed(2)} g of leaves on it are lost`)
  spoon.grams = 0
  spoon.location = { kind: 'gone' }
  draft.events.push({ type: 'spoonCrumbled', gramsLost })
}

function freeHandOf(draft: Draft): HandIndex | null {
  const { hands, hasAMiddleHand } = draft.state.keeper
  if (hands[0] === null) return 0
  if (hands[1] === null) return 1
  return hasAMiddleHand && hands[middleHandIndex] === null ? middleHandIndex : null
}
