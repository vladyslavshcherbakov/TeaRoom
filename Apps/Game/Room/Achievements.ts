import { isEmpty, shareOfTheStrengthByTeaId, totalLeafGrams, type DeepReadonly, type Liquid, type TeaEvent, type SessionState } from '../../../Shared/GameLogic/GameLogic.ts'
import { sipFeeling } from '../Presentation/SipTexts.ts'
import { carriedShapeOf } from './CarriedShapes.ts'
import type { AppLog } from '../../Engine/AppLog.ts'
import type { PlayerBarkKind } from './PlayerBarks.ts'
import { AchievementBook, type AchievementStorage as StorageOfAchievements } from '../../Engine/AchievementBook.ts'

export const achievementIds = [
  'burntClothWashed',
  'spoonBurnt',
  'bowlTriedOnTheHeater',
  'everythingOnTheShelf',
  'tableWiped',
  'thermosGlowing',
  'heaterTester',
  'roseBushTappedTenTimes',
  'perfectTea',
  'teaBrewedInTheBowl',
  'visitContinued',
  'tapAndHeaterLeftOn',
  'kettleBoiledDry',
  'died',
  'delphicOracle',
  'gourmet',
] as const

export type AchievementId = (typeof achievementIds)[number]

export type AchievementRecord = {
  readonly unlocked: readonly AchievementId[]
  readonly hasTheTapRunForNothing: boolean
  readonly hasTheHeaterRunForNothing: boolean
  readonly puddlesWiped: number
  readonly visitsBegun: number
}

export const nothingUnlocked: AchievementRecord = { unlocked: [], hasTheTapRunForNothing: false, hasTheHeaterRunForNothing: false, puddlesWiped: 0, visitsBegun: 0 }

export type AchievementStorage = StorageOfAchievements<AchievementRecord>

export type AchievementUnlocked = (id: AchievementId) => void

type TapTurnedOff = Extract<TeaEvent, { readonly type: 'tapTurnedOff' }>

type TeaTasted = Extract<TeaEvent, { readonly type: 'teaTasted' }>

type HeaterSwitchedOff = Extract<TeaEvent, { readonly type: 'heaterSwitchedOff' }>

const longRunSeconds = 120
const puddlesWipedForOcd = 2
const returnsForTheUsual = 2
const teasInOneVesselForGourmet = 3
const shareOfTheStrengthThatCountsATea = 0.1

const achievementsThatNeedLeaves: readonly AchievementId[] = ['perfectTea', 'teaBrewedInTheBowl']

const achievementByBark: Partial<Record<PlayerBarkKind, AchievementId>> = {
  bowlKeptOffTheHeater: 'bowlTriedOnTheHeater',
  everythingOnTheShelf: 'everythingOnTheShelf',
  heaterTester: 'heaterTester',
}

export class Achievements {
  private readonly book: AchievementBook<AchievementId, AchievementRecord>
  private readonly log: AppLog
  private readonly puddleIdsWiped = new Set<string>()

  constructor(storage: AchievementStorage, log: AppLog, unlockedNow: AchievementUnlocked) {
    this.book = new AchievementBook(storage, achievementIds, log, unlockedNow)
    this.log = log
  }

  get unlocked(): ReadonlySet<AchievementId> {
    return this.book.unlocked
  }

  isUnlocked(id: AchievementId): boolean {
    return this.book.isUnlocked(id)
  }

  eventsHappened(events: readonly TeaEvent[], state: DeepReadonly<SessionState>): void {
    for (const event of events) {
      if (event.type === 'tableWiped') this.puddleWiped(event.puddleId, event.placeId)
      if (event.type === 'tapTurnedOff') this.tapTurnedOff(event)
      if (event.type === 'heaterSwitchedOff') this.heaterSwitchedOff(event)
      for (const id of achievementsOf(event, state)) this.unlock(id, `the simulation reported ${event.type}`)
    }
  }

  barked(kind: PlayerBarkKind): void {
    const id = achievementByBark[kind]
    if (id !== undefined) this.unlock(id, `the room barked ${kind}`)
  }

  roseBushTappedTenTimes(): void {
    this.unlock('roseBushTappedTenTimes', 'the rose bush was tapped ten times in a row')
  }

  prophecySeenWhole(): void {
    this.unlock('delphicOracle', 'the whole prophecy on the beam was on the screen, facing the camera, with nothing in front of it')
  }

  visitBegun(continuesAVisit: boolean): void {
    const earlierVisits = this.book.record.visitsBegun
    this.keep({ ...this.book.record, visitsBegun: earlierVisits + 1 })
    this.log(`a visit begins${continuesAVisit ? ', continuing a saved one' : ''}, after ${earlierVisits} visits the achievements saw`)
    if (continuesAVisit && earlierVisits >= returnsForTheUsual) this.unlock('visitContinued', `the player came back ${earlierVisits} times and continued a visit`)
  }

  worldAdvanced(state: DeepReadonly<SessionState>): void {
    this.unlockGourmetForAVesselOfEnoughTeas(state)
  }

  reset(): void {
    this.keep(nothingUnlocked)
    this.log('every achievement is reset')
  }

  private tapTurnedOff(event: TapTurnedOff): void {
    if (event.openSeconds < longRunSeconds) return
    if (event.hasRunOntoAnItem) return this.log(`the tap that ran ${event.openSeconds.toFixed(0)} s does not count toward tapAndHeaterLeftOn, because it ran onto something in the sink`)
    this.log(`the tap that ran ${event.openSeconds.toFixed(0)} s into the empty sink counts toward tapAndHeaterLeftOn`)
    this.ranForNothing({ ...this.book.record, hasTheTapRunForNothing: true })
  }

  private heaterSwitchedOff(event: HeaterSwitchedOff): void {
    if (event.wastedSeconds < longRunSeconds) return
    this.log(`the heater that wasted ${event.wastedSeconds.toFixed(0)} s on the air or on things not made for it counts toward tapAndHeaterLeftOn`)
    this.ranForNothing({ ...this.book.record, hasTheHeaterRunForNothing: true })
  }

  private ranForNothing(record: AchievementRecord): void {
    this.keep(record)
    this.log(`over every visit, the tap has ${record.hasTheTapRunForNothing ? '' : 'not '}run for nothing and the heater has ${record.hasTheHeaterRunForNothing ? '' : 'not '}worked for nothing`)
    if (record.hasTheTapRunForNothing && record.hasTheHeaterRunForNothing) this.unlock('tapAndHeaterLeftOn', 'the tap ran two minutes into the empty sink and the heater worked two minutes without the kettle, each then switched off')
  }

  private puddleWiped(puddleId: string, placeId: string): void {
    if (this.puddleIdsWiped.has(puddleId)) return
    this.puddleIdsWiped.add(puddleId)
    const puddlesWiped = this.book.record.puddlesWiped + 1
    this.keep({ ...this.book.record, puddlesWiped })
    this.log(`${puddleId} on the ${placeId} is wiped, the ${puddlesWiped}th different puddle over every visit`)
    if (puddlesWiped >= puddlesWipedForOcd) this.unlock('tableWiped', `${puddlesWiped} different puddles have been wiped`)
  }

  private unlockGourmetForAVesselOfEnoughTeas(state: DeepReadonly<SessionState>): void {
    if (this.isUnlocked('gourmet')) return
    for (const vessel of Object.values(state.vessels)) {
      const teaIds = teasThatCountIn(vessel.liquid)
      if (teaIds.length < teasInOneVesselForGourmet) continue
      return this.unlock('gourmet', `${vessel.id} holds a liquid of ${teaIds.join(', ')}, each giving at least ${shareOfTheStrengthThatCountsATea * 100}% of its strength`)
    }
  }

  private unlock(id: AchievementId, reason: string): void {
    this.book.unlock(id, reason)
  }

  private keep(record: AchievementRecord): void {
    this.book.keep(record)
  }
}

export function achievementsOutOfReach(state: DeepReadonly<SessionState>, room: { readonly hasTheProphecy: boolean }): ReadonlySet<AchievementId> {
  const outOfReach = new Set<AchievementId>()
  if (!room.hasTheProphecy) outOfReach.add('delphicOracle')
  const leafGramsOnTheSpoon = totalLeafGrams(state.spoon.gramsByTeaId)
  const leafGramsInTheCaddies = Object.values(state.vessels).filter((vessel) => carriedShapeOf(state, vessel.id) === 'caddy').reduce((grams, caddy) => grams + totalLeafGrams(caddy.leaves?.gramsByTeaId ?? {}), 0)
  const leafGramsElsewhere = leafGramsOnTheSpoon + Object.values(state.vessels).filter((vessel) => carriedShapeOf(state, vessel.id) !== 'caddy').reduce((grams, vessel) => grams + totalLeafGrams(vessel.leaves?.gramsByTeaId ?? {}), 0)
  if (leafGramsInTheCaddies + leafGramsOnTheSpoon === 0) outOfReach.add('died')
  if (leafGramsInTheCaddies + leafGramsElsewhere === 0) for (const id of achievementsThatNeedLeaves) outOfReach.add(id)
  if (state.spoon.location.kind === 'gone') outOfReach.add('spoonBurnt')
  if (teasAnywhereIn(state).size < teasInOneVesselForGourmet) outOfReach.add('gourmet')
  return outOfReach
}

function teasAnywhereIn(state: DeepReadonly<SessionState>): ReadonlySet<string> {
  const vessels = Object.values(state.vessels)
  const leafGramsByTeaIdEverywhere = [state.spoon.gramsByTeaId, ...vessels.map((vessel) => vessel.leaves?.gramsByTeaId ?? {})]
  const teasInLeaves = leafGramsByTeaIdEverywhere.flatMap((gramsByTeaId) => Object.entries(gramsByTeaId).filter(([, grams]) => grams > 0).map(([teaId]) => teaId))
  const teasInLiquids = vessels.filter((vessel) => !isEmpty(vessel.liquid)).flatMap((vessel) => teasThatCountIn(vessel.liquid))
  return new Set([...teasInLeaves, ...teasInLiquids])
}

function teasThatCountIn(liquid: Liquid): readonly string[] {
  return Object.entries(shareOfTheStrengthByTeaId(liquid)).filter(([, share]) => share >= shareOfTheStrengthThatCountsATea).map(([teaId]) => teaId)
}

function achievementsOf(event: TeaEvent, state: DeepReadonly<SessionState>): readonly AchievementId[] {
  switch (event.type) {
    case 'burntClothWashedBackToNew':
      return ['burntClothWashed']
    case 'spoonCrumbled':
      return ['spoonBurnt']
    case 'playerDied':
      return ['died']
    case 'metalGlowsTooHotToHold':
      return carriedShapeOf(state, event.vesselId) === 'thermos' ? ['thermosGlowing'] : []
    case 'boiledDry':
      return event.wasFullAndOnlyBoiledDown && carriedShapeOf(state, event.vesselId) === 'kettle' ? ['kettleBoiledDry'] : []
    case 'teaTasted':
      return achievementsOfASip(event, state)
    default:
      return []
  }
}

function achievementsOfASip(sip: TeaTasted, state: DeepReadonly<SessionState>): readonly AchievementId[] {
  const earned: AchievementId[] = []
  if (sipFeeling(sip.verdict, sip.cupHeldLeaves) === 'justRight') earned.push('perfectTea')
  if (sip.cupHeldLeaves && sip.verdict.strength !== 'none' && carriedShapeOf(state, sip.cupId) === 'bowl') earned.push('teaBrewedInTheBowl')
  return earned
}
