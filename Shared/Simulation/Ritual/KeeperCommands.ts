import { definitionIn } from '../Definitions/Catalog.ts'
import { judgeWater } from '../Judgement/WaterJudgement.ts'
import type { HandIndex } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { chosenTea, describeLiquid, isInvolvedInPour, note, refuse, type Draft } from './Draft.ts'
import { finishPour } from './PouringCommands.ts'
import { finishFilling } from './TapCommands.ts'
import { isWithinReach, locationOfItem, moveItem, whereIs, whereTheKeeperStands } from './Reach.ts'

export function standAt(draft: Draft, command: CommandOfType<'standAt'>): void {
  const room = definitionIn(draft.catalog, 'rooms', draft.state.roomId)
  if (command.placeId !== null && !room.places.includes(command.placeId)) {
    return refuse(draft, command, 'unknownPlace', `places: ${room.places.join(', ')}`)
  }
  if (draft.state.pour !== null) finishPour(draft)
  if (draft.state.filling !== null) finishFilling(draft, 'the keeper walked away')
  draft.state.keeper.placeId = command.placeId
  note(draft, command.placeId === null ? 'the keeper walks away' : `the keeper stands at the ${command.placeId}`)
  draft.events.push({ type: 'keeperMoved', placeId: command.placeId })
}

export function pickUp(draft: Draft, command: CommandOfType<'pickUp'>): void {
  const location = locationOfItem(draft, command.itemId)
  if (location === undefined) return refuse(draft, command, 'unknownItem')
  if (location.kind === 'inHand') return refuse(draft, command, 'alreadyInHand')
  if (!isWithinReach(draft, location)) return refuse(draft, command, 'outOfReach', `${command.itemId} is ${whereIs(location)}, ${whereTheKeeperStands(draft)}`)
  if (isInvolvedInPour(draft, command.itemId)) return refuse(draft, command, 'vesselIsBeingPoured')
  const handIndex = freeHandOf(draft)
  if (handIndex === null) return refuse(draft, command, 'handsFull', `holding ${draft.state.keeper.hands.join(' and ')}`)
  if (draft.state.heater.vesselIdOnTop === command.itemId) liftOffTheHeater(draft, command.itemId)
  draft.state.keeper.hands[handIndex] = command.itemId
  moveItem(draft, command.itemId, { kind: 'inHand', handIndex })
  note(draft, `picked up ${command.itemId} from the ${location.spot.placeId} into hand ${handIndex}`)
  draft.events.push({ type: 'pickedUp', itemId: command.itemId, handIndex })
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

function freeHandOf(draft: Draft): HandIndex | null {
  const [firstHand, secondHand] = draft.state.keeper.hands
  if (firstHand === null) return 0
  if (secondHand === null) return 1
  return null
}

function liftOffTheHeater(draft: Draft, vesselId: string): void {
  const vessel = draft.state.vessels[vesselId]
  const tea = chosenTea(draft)
  const waterJudgement = draft.state.heater.isOn && vessel !== undefined && tea !== null ? judgeWater(vessel.liquid.temperatureC, tea) : null
  draft.state.heater.vesselIdOnTop = null
  note(draft, `lifted ${vesselId} off the heater${vessel === undefined ? '' : `: ${describeLiquid(vessel)}`}, water ${waterJudgement ?? 'not judged'}`)
  draft.events.push({ type: 'takenOffHeater', vesselId, waterJudgement })
}
