import { isTheHeaterInUse } from '../Judgement/HeaterModes.ts'
import type { DeepReadonly } from '../../Engine/DeepReadonly.ts'
import type { ItemLocation } from '../State/SessionState.ts'
import { itemWithItsLocationIn } from '../State/WhereItemsAre.ts'
import { type Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'
import { describeOnTheHeater, rulesFor } from './ItemKinds.ts'
import { runningWaterOver } from './RunningWater.ts'

export type ItemMoved = 'moved' | 'crumbled' | 'notInTheRoom'

export function moveItem(draft: Draft, itemId: string, destination: ItemLocation): ItemMoved {
  const item = itemWithItsLocationIn(draft.state, itemId)
  if (item === undefined) {
    note(draft, `${itemId} is not moved, since the room does not have it`)
    return 'notInTheRoom'
  }
  const origin = item.location
  leave(draft, itemId, origin)
  if (isLiftedFrom(origin) && isLiftedTo(destination) && rulesFor(draft.state, itemId)?.takeIntoAHand(draft, itemId) === 'crumbled') {
    item.location = { kind: 'gone' }
    return 'crumbled'
  }
  item.location = destination
  return 'moved'
}

function leave(draft: Draft, itemId: string, origin: DeepReadonly<ItemLocation>): void {
  switch (origin.kind) {
    case 'onTheHeater':
      return takeOffTheHeater(draft, itemId)
    case 'inTheSink':
      return takeOutOfTheSink(draft, itemId)
    case 'inHand':
    case 'inTheInventory':
    case 'onSurface':
    case 'gone':
      return
  }
}

function isLiftedFrom(origin: DeepReadonly<ItemLocation>): boolean {
  switch (origin.kind) {
    case 'onSurface':
    case 'onTheHeater':
    case 'inTheSink':
      return true
    case 'inHand':
    case 'inTheInventory':
    case 'gone':
      return false
  }
}

function isLiftedTo(destination: DeepReadonly<ItemLocation>): boolean {
  switch (destination.kind) {
    case 'inHand':
    case 'inTheInventory':
    case 'onTheHeater':
      return true
    case 'onSurface':
    case 'inTheSink':
    case 'gone':
      return false
  }
}

function takeOffTheHeater(draft: Draft, itemId: string): void {
  note(draft, `lifted off the ${isTheHeaterInUse(draft.state.heater.mode) ? 'working' : 'cold'} heater: ${describeOnTheHeater(draft, itemId)}`)
  draft.events.push({ type: 'takenOffHeater', itemId })
  rulesFor(draft.state, itemId)?.takeOffTheHeater(draft, itemId)
}

function takeOutOfTheSink(draft: Draft, itemId: string): void {
  const sink = draft.state.sink
  rulesFor(draft.state, itemId)?.liftOutOfTheSink(draft, itemId)
  sink.hasRinsedTheItemInside = false
  const runningWater = sink.runningWater
  if (runningWater === null) return note(draft, `${itemId} lifted out of the sink, the tap is closed`)
  note(draft, `${itemId} lifted out of the sink after ${runningWater.filledMl.toFixed(1)} ml went in, the tap keeps running into the empty sink`)
  sink.runningWater = runningWaterOver(draft, null, false, runningWater.use, runningWater)
}
