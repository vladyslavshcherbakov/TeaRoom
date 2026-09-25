import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { SessionState } from '../../../Shared/Simulation/State/SessionState.ts'
import { sipFeeling } from '../Table/TableTexts.ts'
import { carriedShapeOf } from './CarriedShapes.ts'
import type { RoomLog } from './RoomNavigator.ts'
import type { RoomRemarkKind } from './RoomRemarks.ts'

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
  'shiva',
  'died',
  'delphicOracle',
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

export type AchievementStorage = {
  readonly load: () => AchievementRecord
  readonly keep: (record: AchievementRecord) => void
}

export type AchievementUnlocked = (id: AchievementId) => void

type TapTurnedOff = Extract<RitualEvent, { readonly type: 'tapTurnedOff' }>

type HeaterSwitchedOff = Extract<RitualEvent, { readonly type: 'heaterSwitchedOff' }>

const longRunSeconds = 120
const kettleShape = 'kettle'
const puddlesWipedForOcd = 2

const achievementsThatNeedLeaves: readonly AchievementId[] = ['perfectTea', 'teaBrewedInTheBowl']

const achievementByRemark: Partial<Record<RoomRemarkKind, AchievementId>> = {
  bowlKeptOffTheHeater: 'bowlTriedOnTheHeater',
  everythingOnTheShelf: 'everythingOnTheShelf',
  heaterTester: 'heaterTester',
}

export class Achievements {
  private readonly storage: AchievementStorage
  private readonly log: RoomLog
  private readonly unlockedNow: AchievementUnlocked
  private record: AchievementRecord
  private readonly placesWithAPuddleBeingWiped = new Set<string>()

  constructor(storage: AchievementStorage, log: RoomLog, unlockedNow: AchievementUnlocked) {
    this.storage = storage
    this.log = log
    this.unlockedNow = unlockedNow
    this.record = storage.load()
    log(`${this.record.unlocked.length} of ${achievementIds.length} achievements are unlocked`)
  }

  get unlocked(): ReadonlySet<AchievementId> {
    return new Set(this.record.unlocked)
  }

  isUnlocked(id: AchievementId): boolean {
    return this.record.unlocked.includes(id)
  }

  eventsHappened(events: readonly RitualEvent[], state: DeepReadonly<SessionState>): void {
    for (const event of events) {
      if (event.type === 'tableWiped') this.puddleWipedOn(event.placeId)
      if (event.type === 'tapTurnedOff') this.tapTurnedOff(event)
      if (event.type === 'heaterSwitchedOff') this.heaterSwitchedOff(event, state)
      const id = achievementOf(event, state)
      if (id !== null) this.unlock(id, `the ritual reported ${event.type}`)
    }
  }

  remarked(kind: RoomRemarkKind): void {
    const id = achievementByRemark[kind]
    if (id !== undefined) this.unlock(id, `the room remarked ${kind}`)
  }

  roseBushTappedTenTimes(): void {
    this.unlock('roseBushTappedTenTimes', 'the rose bush was tapped ten times in a row')
  }

  prophecySeenWhole(): void {
    this.unlock('delphicOracle', 'the whole prophecy on the beam was on the screen, facing the camera, with nothing in front of it')
  }

  keeperDied(): void {
    this.unlock('died', 'the keeper died of tea straight from the caddy')
  }

  visitBegun(continuesAVisit: boolean): void {
    const earlierVisits = this.record.visitsBegun
    this.keep({ ...this.record, visitsBegun: earlierVisits + 1 })
    this.log(`a visit begins${continuesAVisit ? ', continuing a saved one' : ''}, after ${earlierVisits} visits the achievements saw`)
    if (continuesAVisit && earlierVisits > 0) this.unlock('visitContinued', 'the player came back and continued a visit the achievements saw begin')
  }

  worldAdvanced(state: DeepReadonly<SessionState>): void {
    this.forgetPuddlesThatAreGone(state)
  }

  reset(): void {
    this.keep(nothingUnlocked)
    this.log('every achievement is reset')
  }

  private tapTurnedOff(event: TapTurnedOff): void {
    if (event.openSeconds < longRunSeconds) return
    if (event.hasRunOntoAnItem) return this.log(`the tap ran ${event.openSeconds.toFixed(0)} s but onto something in the sink, so it did not run for nothing`)
    this.log(`the tap ran ${event.openSeconds.toFixed(0)} s into the empty sink and was turned off`)
    this.ranForNothing({ ...this.record, hasTheTapRunForNothing: true })
  }

  private heaterSwitchedOff(event: HeaterSwitchedOff, state: DeepReadonly<SessionState>): void {
    if (event.onSeconds < longRunSeconds) return
    if (!event.wasSwitchedOffByTheKeeper) return this.log(`the heater worked ${event.onSeconds.toFixed(0)} s but the end of the ritual switched it off, not the keeper`)
    const kettleIdsHeated = Object.keys(event.secondsHeatedByItemId).filter((itemId) => carriedShapeOf(state, itemId) === kettleShape)
    if (kettleIdsHeated.length > 0) return this.log(`the heater worked ${event.onSeconds.toFixed(0)} s but heated ${kettleIdsHeated.join(', ')}, so it did not work for nothing`)
    this.log(`the heater worked ${event.onSeconds.toFixed(0)} s without the kettle and was switched off`)
    this.ranForNothing({ ...this.record, hasTheHeaterRunForNothing: true })
  }

  private ranForNothing(record: AchievementRecord): void {
    this.keep(record)
    this.log(`over every visit, the tap has ${record.hasTheTapRunForNothing ? '' : 'not '}run for nothing and the heater has ${record.hasTheHeaterRunForNothing ? '' : 'not '}worked for nothing`)
    if (record.hasTheTapRunForNothing && record.hasTheHeaterRunForNothing) this.unlock('tapAndHeaterLeftOn', 'the tap ran two minutes into the empty sink and the heater worked two minutes without the kettle, each then switched off')
  }

  private puddleWipedOn(placeId: string): void {
    if (this.placesWithAPuddleBeingWiped.has(placeId)) return
    this.placesWithAPuddleBeingWiped.add(placeId)
    const puddlesWiped = this.record.puddlesWiped + 1
    this.keep({ ...this.record, puddlesWiped })
    this.log(`the puddle on the ${placeId} is wiped, the ${puddlesWiped}th different puddle over every visit`)
    if (puddlesWiped >= puddlesWipedForOcd) this.unlock('tableWiped', `${puddlesWiped} different puddles have been wiped`)
  }

  private forgetPuddlesThatAreGone(state: DeepReadonly<SessionState>): void {
    for (const placeId of this.placesWithAPuddleBeingWiped) {
      if (state.puddles[placeId] !== undefined) continue
      this.placesWithAPuddleBeingWiped.delete(placeId)
      this.log(`the wiped puddle on the ${placeId} is gone, so a new one there is another puddle`)
    }
  }

  private unlock(id: AchievementId, reason: string): void {
    if (this.record.unlocked.includes(id)) return
    this.keep({ ...this.record, unlocked: [...this.record.unlocked, id] })
    this.log(`achievement ${id} unlocked: ${reason}`)
    this.unlockedNow(id)
  }

  private keep(record: AchievementRecord): void {
    this.record = record
    this.storage.keep(record)
  }
}

export function achievementsOutOfReach(state: DeepReadonly<SessionState>, room: { readonly hasTheProphecy: boolean }): ReadonlySet<AchievementId> {
  const outOfReach = new Set<AchievementId>()
  if (!room.hasTheProphecy) outOfReach.add('delphicOracle')
  const leafGramsInTheCaddies = Object.values(state.vessels).filter((vessel) => carriedShapeOf(state, vessel.id) === 'caddy').reduce((grams, caddy) => grams + (caddy.leaves?.grams ?? 0), 0)
  const leafGramsElsewhere = state.spoon.grams + Object.values(state.vessels).filter((vessel) => carriedShapeOf(state, vessel.id) !== 'caddy').reduce((grams, vessel) => grams + (vessel.leaves?.grams ?? 0), 0)
  if (leafGramsInTheCaddies + state.spoon.grams === 0) outOfReach.add('died')
  if (leafGramsInTheCaddies + leafGramsElsewhere === 0) for (const id of achievementsThatNeedLeaves) outOfReach.add(id)
  if (state.spoon.location.kind === 'gone') outOfReach.add('spoonBurnt')
  return outOfReach
}

function achievementOf(event: RitualEvent, state: DeepReadonly<SessionState>): AchievementId | null {
  switch (event.type) {
    case 'burntClothWashedBackToNew':
      return 'burntClothWashed'
    case 'spoonCrumbled':
      return 'spoonBurnt'
    case 'middleHandGrown':
      return 'shiva'
    case 'metalGlowsTooHotToHold':
      return carriedShapeOf(state, event.vesselId) === 'thermos' ? 'thermosGlowing' : null
    case 'boiledDry':
      return carriedShapeOf(state, event.vesselId) === 'kettle' ? 'kettleBoiledDry' : null
    case 'teaTasted':
      if (sipFeeling(event.verdict) === 'justRight') return 'perfectTea'
      return event.cupHeldLeaves && event.verdict.strength !== 'none' && carriedShapeOf(state, event.cupId) === 'bowl' ? 'teaBrewedInTheBowl' : null
    default:
      return null
  }
}
