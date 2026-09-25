import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { SessionState } from '../../../Shared/Simulation/State/SessionState.ts'
import { sipFeeling } from '../Table/TableTexts.ts'
import { carriedShapeOf } from './CarriedShapes.ts'
import type { RoomLog } from './RoomNavigator.ts'
import type { RoomRemarkKind } from './RoomPlay.ts'

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
] as const

export type AchievementId = (typeof achievementIds)[number]

export type AchievementRecord = {
  readonly unlocked: readonly AchievementId[]
  readonly hasTheTapRunLong: boolean
  readonly hasTheHeaterRunLong: boolean
}

export type AchievementStorage = {
  readonly load: () => AchievementRecord
  readonly keep: (record: AchievementRecord) => void
}

export type AchievementUnlocked = (id: AchievementId) => void

const longRunSeconds = 120

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

  eventsHappened(events: readonly RitualEvent[], state: DeepReadonly<SessionState>): void {
    for (const event of events) {
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

  visitContinued(): void {
    this.unlock('visitContinued', 'the player continued a saved visit')
  }

  worldAdvanced(state: DeepReadonly<SessionState>): void {
    const runningWater = state.sink.runningWater
    const hasTheTapRunLong = this.record.hasTheTapRunLong || (runningWater !== null && state.elapsedSeconds - runningWater.openedAtSeconds >= longRunSeconds)
    const hasTheHeaterRunLong = this.record.hasTheHeaterRunLong || (state.heater.isOn && state.elapsedSeconds - state.heater.switchedOnAtSeconds >= longRunSeconds)
    if (hasTheTapRunLong === this.record.hasTheTapRunLong && hasTheHeaterRunLong === this.record.hasTheHeaterRunLong) return
    this.log(`the tap has ${hasTheTapRunLong ? '' : 'not '}run for two minutes and the heater has ${hasTheHeaterRunLong ? '' : 'not '}been on for two minutes, over every visit`)
    this.keep({ ...this.record, hasTheTapRunLong, hasTheHeaterRunLong })
    if (hasTheTapRunLong && hasTheHeaterRunLong) this.unlock('tapAndHeaterLeftOn', 'both the tap and the heater have run for two minutes')
  }

  reset(): void {
    this.keep({ unlocked: [], hasTheTapRunLong: false, hasTheHeaterRunLong: false })
    this.log('every achievement is reset')
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

function achievementOf(event: RitualEvent, state: DeepReadonly<SessionState>): AchievementId | null {
  switch (event.type) {
    case 'burntClothWashedBackToNew':
      return 'burntClothWashed'
    case 'spoonCrumbled':
      return 'spoonBurnt'
    case 'tableWiped':
      return 'tableWiped'
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
