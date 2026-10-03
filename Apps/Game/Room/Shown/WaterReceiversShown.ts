import type { WorldViewState } from '../../Presentation/WorldViewState.ts'

export type WaterReceiver = {
  readonly itemId: string
  readonly secondsWaterTakesToLand: number
}

type ViewAt = {
  readonly timeSeconds: number
  readonly view: WorldViewState
}

const viewsKeptForSeconds = 2

export class WaterReceiversShown {
  private viewsOldestFirst: ViewAt[] = []

  viewAfterAFrame(view: WorldViewState, receivers: readonly WaterReceiver[], timeSeconds: number): WorldViewState {
    this.viewsOldestFirst = [...this.viewsOldestFirst.filter((kept) => kept.timeSeconds >= timeSeconds - viewsKeptForSeconds), { timeSeconds, view }]
    return receivers.reduce((shown, receiver) => withTheReceiverAsItWas(shown, receiver.itemId, this.viewWhenTheWaterLeft(timeSeconds - receiver.secondsWaterTakesToLand)), view)
  }

  private viewWhenTheWaterLeft(landedBySeconds: number): WorldViewState | null {
    const viewsLeftBefore = this.viewsOldestFirst.filter((kept) => kept.timeSeconds <= landedBySeconds)
    return (viewsLeftBefore.at(-1) ?? this.viewsOldestFirst[0])?.view ?? null
  }
}

function withTheReceiverAsItWas(view: WorldViewState, itemId: string, viewThen: WorldViewState | null): WorldViewState {
  if (viewThen === null) return view
  return {
    ...view,
    vessels: withTheEntryOf(view.vessels, viewThen.vessels, itemId),
    looseLeavesByItem: withTheEntryOf(view.looseLeavesByItem, viewThen.looseLeavesByItem, itemId),
    cloths: withTheEntryOf(view.cloths, viewThen.cloths, itemId),
    charringByItem: withTheEntryOf(view.charringByItem, viewThen.charringByItem, itemId),
  }
}

function withTheEntryOf<Entry>(entries: Readonly<Record<string, Entry>>, entriesThen: Readonly<Record<string, Entry>>, itemId: string): Readonly<Record<string, Entry>> {
  const entryThen = entriesThen[itemId]
  return entryThen === undefined ? entries : { ...entries, [itemId]: entryThen }
}
