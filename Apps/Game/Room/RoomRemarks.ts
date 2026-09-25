import type { CarriedShape } from './CarriedShapes.ts'
import type { RoomLog } from './RoomNavigator.ts'

export type RoomRemarkKind = 'sillIsTheRoomsOwn' | 'bowlKeptOffTheHeater' | 'caddyKeptOffTheHeater' | 'handsFull' | 'handsFullOfBowls' | 'heaterTester' | 'everythingOnTheShelf'

export type RoomRemark = { readonly kind: RoomRemarkKind; readonly timesTapped: number }

export type HeardFact =
  | { readonly kind: 'figurineTappedFromAfar'; readonly figurineId: string }
  | { readonly kind: 'putOnTheHeater'; readonly itemId: string; readonly shape: CarriedShape | undefined; readonly isKeptOff: boolean; readonly isTheHeaterOn: boolean }
  | { readonly kind: 'takenWithFullHands'; readonly itemId: string; readonly holdsOnlyBowls: boolean }
  | { readonly kind: 'putOnTheShelf'; readonly itemId: string; readonly isEverythingOnTheShelf: boolean }

type VisitMemory = {
  readonly isTheItemNewOnTheWorkingHeater: boolean
  readonly itemsTriedOnTheWorkingHeater: number
  readonly heaterItemsBeforeTheTesterJoke: number
}

type Remark = {
  readonly kind: RoomRemarkKind
  readonly isMadeOncePerVisit: boolean
  readonly isEarnedBy: (fact: HeardFact, memory: VisitMemory) => boolean
}

const remarksInOrder: readonly Remark[] = [
  { kind: 'sillIsTheRoomsOwn', isMadeOncePerVisit: false, isEarnedBy: (fact) => fact.kind === 'figurineTappedFromAfar' },
  {
    kind: 'heaterTester',
    isMadeOncePerVisit: true,
    isEarnedBy: (fact, memory) => fact.kind === 'putOnTheHeater' && memory.isTheItemNewOnTheWorkingHeater && memory.itemsTriedOnTheWorkingHeater >= memory.heaterItemsBeforeTheTesterJoke,
  },
  { kind: 'bowlKeptOffTheHeater', isMadeOncePerVisit: false, isEarnedBy: (fact) => fact.kind === 'putOnTheHeater' && fact.isKeptOff && fact.shape === 'bowl' },
  { kind: 'caddyKeptOffTheHeater', isMadeOncePerVisit: false, isEarnedBy: (fact) => fact.kind === 'putOnTheHeater' && fact.isKeptOff && fact.shape === 'caddy' },
  { kind: 'handsFullOfBowls', isMadeOncePerVisit: false, isEarnedBy: (fact) => fact.kind === 'takenWithFullHands' && fact.holdsOnlyBowls },
  { kind: 'handsFull', isMadeOncePerVisit: false, isEarnedBy: (fact) => fact.kind === 'takenWithFullHands' && !fact.holdsOnlyBowls },
  { kind: 'everythingOnTheShelf', isMadeOncePerVisit: true, isEarnedBy: (fact) => fact.kind === 'putOnTheShelf' && fact.isEverythingOnTheShelf },
]

export class RoomRemarks {
  private readonly log: RoomLog
  private readonly remarked: (remark: RoomRemark) => void
  private readonly heaterItemsBeforeTheTesterJoke: number
  private readonly timesRemarked = new Map<RoomRemarkKind, number>()
  private readonly itemsTriedOnTheWorkingHeater = new Set<string>()

  constructor(heaterItemsBeforeTheTesterJoke: number, log: RoomLog, remarked: (remark: RoomRemark) => void) {
    this.heaterItemsBeforeTheTesterJoke = heaterItemsBeforeTheTesterJoke
    this.log = log
    this.remarked = remarked
  }

  heard(fact: HeardFact): void {
    const memory = this.rememberWhatWasTriedOnTheHeater(fact)
    const remark = remarksInOrder.find((candidate) => this.mayStillBeMade(candidate) && candidate.isEarnedBy(fact, memory))
    if (remark === undefined) return
    const timesTapped = (this.timesRemarked.get(remark.kind) ?? 0) + 1
    this.timesRemarked.set(remark.kind, timesTapped)
    this.log(`${describeFact(fact)} earns the remark ${remark.kind}, made ${timesTapped} times this visit${remark.isMadeOncePerVisit ? ', and only once' : ''}`)
    this.remarked({ kind: remark.kind, timesTapped })
  }

  private rememberWhatWasTriedOnTheHeater(fact: HeardFact): VisitMemory {
    const isTheItemNewOnTheWorkingHeater = fact.kind === 'putOnTheHeater' && fact.isTheHeaterOn && !this.itemsTriedOnTheWorkingHeater.has(fact.itemId)
    if (fact.kind === 'putOnTheHeater' && isTheItemNewOnTheWorkingHeater) this.itemsTriedOnTheWorkingHeater.add(fact.itemId)
    return { isTheItemNewOnTheWorkingHeater, itemsTriedOnTheWorkingHeater: this.itemsTriedOnTheWorkingHeater.size, heaterItemsBeforeTheTesterJoke: this.heaterItemsBeforeTheTesterJoke }
  }

  private mayStillBeMade(remark: Remark): boolean {
    return !remark.isMadeOncePerVisit || !this.timesRemarked.has(remark.kind)
  }
}

function describeFact(fact: HeardFact): string {
  switch (fact.kind) {
    case 'figurineTappedFromAfar':
      return `a tap on ${fact.figurineId} from afar`
    case 'putOnTheHeater':
      return `${fact.itemId} tried on the ${fact.isTheHeaterOn ? 'working' : 'cold'} heater${fact.isKeptOff ? ' and kept off it' : ''}`
    case 'takenWithFullHands':
      return `${fact.itemId} tapped with both hands full${fact.holdsOnlyBowls ? ' of bowls' : ''}`
    case 'putOnTheShelf':
      return `${fact.itemId} put on the shelf${fact.isEverythingOnTheShelf ? ', the last thing out' : ''}`
  }
}
