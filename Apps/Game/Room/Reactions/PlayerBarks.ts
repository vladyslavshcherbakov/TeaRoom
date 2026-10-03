import type { TeaEvent } from '../../../../Shared/GameLogic/GameLogic.ts'
import { smoulderingFromCharring } from '../../Presentation/WorldPresenter.ts'
import { phraseVariantsOf, type PhraseKey } from '../../Texts/Texts.ts'
import type { CarriedShape } from '../Layout/CarriedShapes.ts'
import type { AppLog } from '../../../Engine/AppLog.ts'
import { everyTime, onceAVisit, Barks, type Bark, type BarkRule } from '../../../Engine/Barks.ts'

export type PlayerBarkKind =
  | 'whyPouring'
  | 'noRoomToPutDown'
  | 'sillIsTheRoomsOwn'
  | 'bowlKeptOffTheHeater'
  | 'caddyKeptOffTheHeater'
  | 'handsFull'
  | 'handsFullOfBowls'
  | 'heaterTester'
  | 'everythingOnTheShelf'
  | 'sip'
  | 'spill'
  | 'tooHotToHold'
  | 'heaterRanLong'
  | 'tapRanLong'
  | 'smoulderingClothTaken'
  | 'spoonCrumbled'
  | 'caddyWashedOut'
  | 'burntClothWashed'
  | 'spoonAndCaddyReturned'
  | 'spoonReturned'
  | 'emptyCaddyRefilled'

export type HeardFact =
  | { readonly kind: 'pourQuestioned' }
  | { readonly kind: 'noRoomToPutDown'; readonly itemId: string }
  | { readonly kind: 'figurineTapped'; readonly figurineId: string }
  | { readonly kind: 'putOnTheHeater'; readonly itemId: string; readonly shape: CarriedShape | undefined; readonly isKeptOff: boolean; readonly isTheHeaterOn: boolean }
  | { readonly kind: 'takenWithFullHands'; readonly itemId: string; readonly holdsOnlyBowls: boolean }
  | { readonly kind: 'putOnTheShelf'; readonly itemId: string; readonly isEverythingOnTheShelf: boolean }
  | { readonly kind: 'teaEvent'; readonly event: TeaEvent; readonly elapsedSeconds: number }

export type PlayerBark = Bark<PlayerBarkKind, HeardFact>

type VisitMemory = {
  readonly isTheItemNewOnTheWorkingHeater: boolean
  readonly itemsTriedOnTheWorkingHeater: number
  readonly heaterItemsBeforeTheTesterJoke: number
}

type Rule = BarkRule<PlayerBarkKind, HeardFact, VisitMemory>

const spillThePlayerBarksOnMl = 5
const spillBarksApartSeconds = 120
const tapRanLongFromSeconds = 120
const heaterRanLongFromSeconds = 120

const barksInOrder: readonly Rule[] = [
  { kind: 'whyPouring', howOften: everyTime, isEarnedBy: (fact) => fact.kind === 'pourQuestioned' },
  { kind: 'noRoomToPutDown', howOften: everyTime, isEarnedBy: (fact) => fact.kind === 'noRoomToPutDown' },
  eachLineOnce('sillIsTheRoomsOwn', (fact) => fact.kind === 'figurineTapped'),
  {
    kind: 'heaterTester',
    howOften: onceAVisit,
    isEarnedBy: (fact, memory) => fact.kind === 'putOnTheHeater' && memory.isTheItemNewOnTheWorkingHeater && memory.itemsTriedOnTheWorkingHeater >= memory.heaterItemsBeforeTheTesterJoke,
  },
  eachLineOnce('bowlKeptOffTheHeater', (fact) => fact.kind === 'putOnTheHeater' && fact.isKeptOff && fact.shape === 'bowl'),
  eachLineOnce('caddyKeptOffTheHeater', (fact) => fact.kind === 'putOnTheHeater' && fact.isKeptOff && fact.shape === 'caddy'),
  eachLineOnce('handsFullOfBowls', (fact) => fact.kind === 'takenWithFullHands' && fact.holdsOnlyBowls),
  eachLineOnce('handsFull', (fact) => fact.kind === 'takenWithFullHands' && !fact.holdsOnlyBowls),
  { kind: 'everythingOnTheShelf', howOften: onceAVisit, isEarnedBy: (fact) => fact.kind === 'putOnTheShelf' && fact.isEverythingOnTheShelf },
  { kind: 'sip', howOften: everyTime, isEarnedBy: onEvent('teaTasted') },
  { kind: 'spill', howOften: { kind: 'apart', seconds: spillBarksApartSeconds }, isEarnedBy: onEvent('pourFinished', (event) => event.spilledMl >= spillThePlayerBarksOnMl) },
  eachLineOnce('tooHotToHold', onEvent('actionRefused', (event) => event.reason === 'tooHotToHold')),
  eachLineOnce('heaterRanLong', onEvent('heaterSwitchedOff', (event) => event.wastedSeconds >= heaterRanLongFromSeconds)),
  eachLineOnce('tapRanLong', onEvent('tapTurnedOff', (event) => event.openSeconds >= tapRanLongFromSeconds)),
  { kind: 'smoulderingClothTaken', howOften: onceAVisit, isEarnedBy: onEvent('clothTakenOffTheHeater', (event) => event.charring >= smoulderingFromCharring) },
  eachLineOnce('spoonCrumbled', onEvent('spoonCrumbled')),
  eachLineOnce('caddyWashedOut', onEvent('lastLeavesWashedOut', (event) => event.isACaddy)),
  { kind: 'burntClothWashed', howOften: onceAVisit, isEarnedBy: onEvent('burntClothWashedBackToNew') },
  { kind: 'spoonAndCaddyReturned', howOften: everyTime, isEarnedBy: onEvent('houseRestocked', (event) => event.spoonReturned && event.wasACaddyEmpty) },
  { kind: 'spoonReturned', howOften: everyTime, isEarnedBy: onEvent('houseRestocked', (event) => event.spoonReturned) },
  { kind: 'emptyCaddyRefilled', howOften: everyTime, isEarnedBy: onEvent('houseRestocked', (event) => event.wasACaddyEmpty) },
]

export class PlayerBarks {
  private readonly barks: Barks<PlayerBarkKind, HeardFact, VisitMemory>
  private readonly heaterItemsBeforeTheTesterJoke: number
  private readonly itemsTriedOnTheWorkingHeater = new Set<string>()

  constructor(heaterItemsBeforeTheTesterJoke: number, log: AppLog) {
    this.barks = new Barks(barksInOrder, { describe: describeFact, secondsOf: (fact) => (fact.kind === 'teaEvent' ? fact.elapsedSeconds : null) }, log)
    this.heaterItemsBeforeTheTesterJoke = heaterItemsBeforeTheTesterJoke
  }

  heard(facts: readonly HeardFact[]): readonly PlayerBark[] {
    return facts.flatMap((fact) => {
      const bark = this.barks.barkEarnedBy(fact, this.rememberWhatWasTriedOnTheHeater(fact))
      return bark === null ? [] : [bark]
    })
  }

  private rememberWhatWasTriedOnTheHeater(fact: HeardFact): VisitMemory {
    const isTheItemNewOnTheWorkingHeater = fact.kind === 'putOnTheHeater' && fact.isTheHeaterOn && !this.itemsTriedOnTheWorkingHeater.has(fact.itemId)
    if (fact.kind === 'putOnTheHeater' && isTheItemNewOnTheWorkingHeater) this.itemsTriedOnTheWorkingHeater.add(fact.itemId)
    return { isTheItemNewOnTheWorkingHeater, itemsTriedOnTheWorkingHeater: this.itemsTriedOnTheWorkingHeater.size, heaterItemsBeforeTheTesterJoke: this.heaterItemsBeforeTheTesterJoke }
  }
}

function eachLineOnce(kind: PlayerBarkKind & PhraseKey, isEarnedBy: (fact: HeardFact) => boolean): Rule {
  return { kind, howOften: { kind: 'upTo', timesAVisit: phraseVariantsOf(kind) }, isEarnedBy }
}

function onEvent<Type extends TeaEvent['type']>(type: Type, isWorthABark: (event: Extract<TeaEvent, { readonly type: Type }>) => boolean = () => true): (fact: HeardFact) => boolean {
  return (fact) => fact.kind === 'teaEvent' && fact.event.type === type && isWorthABark(fact.event as Extract<TeaEvent, { readonly type: Type }>)
}

function describeFact(fact: HeardFact): string {
  switch (fact.kind) {
    case 'pourQuestioned':
      return 'the question why a pour is aimed'
    case 'noRoomToPutDown':
      return `no room to put ${fact.itemId} down`
    case 'figurineTapped':
      return `a tap on ${fact.figurineId}`
    case 'putOnTheHeater':
      return `${fact.itemId} tried on the ${fact.isTheHeaterOn ? 'working' : 'cold'} heater${fact.isKeptOff ? ' and kept off it' : ''}`
    case 'takenWithFullHands':
      return `${fact.itemId} tapped with both hands full${fact.holdsOnlyBowls ? ' of bowls' : ''}`
    case 'putOnTheShelf':
      return `${fact.itemId} put on the shelf${fact.isEverythingOnTheShelf ? ', the last thing out' : ''}`
    case 'teaEvent':
      return `the event ${fact.event.type}`
  }
}
