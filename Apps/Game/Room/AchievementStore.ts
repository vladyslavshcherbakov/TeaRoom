import { achievementIds, type AchievementId, type AchievementRecord, type AchievementStorage } from './Achievements.ts'
import type { RoomLog } from './RoomNavigator.ts'

const storageKey = 'achievements'
const nothingUnlocked: AchievementRecord = { unlocked: [], hasTheTapRunLong: false, hasTheHeaterRunLong: false, puddlesWiped: 0, visitsBegun: 0 }

export class AchievementStore implements AchievementStorage {
  private readonly log: RoomLog

  constructor(log: RoomLog) {
    this.log = log
  }

  readonly load = (): AchievementRecord => {
    const text = this.read()
    if (text === null) return nothingUnlocked
    const saved = parsedOrNull(text)
    if (typeof saved !== 'object' || saved === null) {
      this.log('the saved achievements cannot be read, so none are unlocked')
      return nothingUnlocked
    }
    const record = saved as Partial<Record<keyof AchievementRecord, unknown>>
    const unlocked = Array.isArray(record.unlocked) ? record.unlocked.filter(isAchievementId) : []
    const puddlesWiped = typeof record.puddlesWiped === 'number' ? record.puddlesWiped : 0
    const visitsBegun = typeof record.visitsBegun === 'number' ? record.visitsBegun : 0
    return { unlocked, hasTheTapRunLong: record.hasTheTapRunLong === true, hasTheHeaterRunLong: record.hasTheHeaterRunLong === true, puddlesWiped, visitsBegun }
  }

  readonly keep = (record: AchievementRecord): void => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(record))
    } catch (error) {
      this.log(`the achievements could not be saved: ${String(error)}`)
    }
  }

  private read(): string | null {
    try {
      return localStorage.getItem(storageKey)
    } catch (error) {
      this.log(`the saved achievements cannot be read, so none are unlocked: ${String(error)}`)
      return null
    }
  }
}

function parsedOrNull(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function isAchievementId(value: unknown): value is AchievementId {
  return achievementIds.some((id) => id === value)
}
