import { definitionIn } from '../Definitions/Catalog.ts'
import type { HandIndex } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { isInvolvedInPour, note, refuse, type Draft } from './Draft.ts'
import { liftOffTheHeater } from './HeatingCommands.ts'
import { closeTheLidAsItIsLifted } from './LidCommands.ts'
import { finishPour } from './PouringCommands.ts'
import { liftTheClothOutOfThePuddle } from './CleanupCommands.ts'
import { liftOutOfTheSink } from './SinkCommands.ts'
import { clothItemId, isWithinReach, spoonItemId, locationOfItem, moveItem, whereIs, whereTheKeeperStands } from './Reach.ts'
import { doesTheSpoonCrumble, isTooHotToHold } from '../Physics/Heat.ts'

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
  const location = locationOfItem(draft, command.itemId)
  if (location === undefined) return refuse(draft, command, 'unknownItem')
  if (location.kind === 'inHand') return refuse(draft, command, 'alreadyInHand')
  if (location.kind === 'gone') return refuse(draft, command, 'burntAway')
  if (!isWithinReach(draft, location)) return refuse(draft, command, 'outOfReach', `${command.itemId} is ${whereIs(location)}, ${whereTheKeeperStands(draft)}`)
  if (isInvolvedInPour(draft, command.itemId)) return refuse(draft, command, 'vesselIsBeingPoured')
  const shellHeat = draft.state.vessels[command.itemId]?.shellHeat ?? 0
  if (isTooHotToHold(shellHeat)) return refuse(draft, command, 'tooHotToHold', `${command.itemId}'s metal is at ${(shellHeat * 100).toFixed(0)}% of red heat`)
  const handIndex = freeHandOf(draft)
  if (handIndex === null) return refuse(draft, command, 'handsFull', `holding ${draft.state.keeper.hands.join(' and ')}`)
  if (draft.state.heater.itemIdOnTop === command.itemId) liftOffTheHeater(draft, command.itemId)
  if (command.itemId === spoonItemId && doesTheSpoonCrumble(draft.state.spoon.charring)) return crumbleTheSpoon(draft)
  draft.state.keeper.hands[handIndex] = command.itemId
  if (command.itemId === clothItemId) liftTheClothOutOfThePuddle(draft)
  liftOutOfTheSink(draft, command.itemId)
  moveItem(draft, command.itemId, { kind: 'inHand', handIndex })
  note(draft, `picked up ${command.itemId} from the ${location.spot.placeId} into hand ${handIndex}`)
  draft.events.push({ type: 'pickedUp', itemId: command.itemId, handIndex })
  closeTheLidAsItIsLifted(draft, command.itemId, 'it was picked up')
}

export function putDown(draft: Draft, command: CommandOfType<'putDown'>): void {
  const location = locationOfItem(draft, command.itemId)
  if (location === undefined) return refuse(draft, command, 'unknownItem')
  if (location.kind !== 'inHand') return refuse(draft, command, 'notInHand', `${command.itemId} is ${whereIs(location)}`)
  if (draft.state.keeper.placeId !== command.spot.placeId) {
    return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, not at the ${command.spot.placeId}`)
  }
  if (isInvolvedInPour(draft, command.itemId)) return refuse(draft, command, 'vesselIsBeingPoured')
  draft.state.keeper.hands[location.handIndex] = null
  moveItem(draft, command.itemId, { kind: 'onSurface', spot: command.spot })
  note(draft, `put ${command.itemId} down on the ${command.spot.placeId} at (${command.spot.x.toFixed(2)}, ${command.spot.y.toFixed(2)}, ${command.spot.z.toFixed(2)})`)
  draft.events.push({ type: 'putDown', itemId: command.itemId, spot: command.spot })
}

function crumbleTheSpoon(draft: Draft): void {
  const spoon = draft.state.spoon
  const gramsLost = spoon.grams
  note(draft, `the spoon, ${(spoon.charring * 100).toFixed(0)}% charred, crumbles to ash as it is taken, and ${gramsLost.toFixed(2)} g of leaves on it are lost`)
  spoon.grams = 0
  spoon.location = { kind: 'gone' }
  draft.events.push({ type: 'spoonCrumbled', gramsLost })
}

function freeHandOf(draft: Draft): HandIndex | null {
  const [firstHand, secondHand] = draft.state.keeper.hands
  if (firstHand === null) return 0
  if (secondHand === null) return 1
  return null
}
