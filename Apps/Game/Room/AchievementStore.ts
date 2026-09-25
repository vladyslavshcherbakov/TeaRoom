import { browserStorage, parsedJsonOrNull } from './BrowserStorage.ts'
import { achievementIds, nothingUnlocked, type AchievementId, type AchievementRecord, type AchievementStorage } from './Achievements.ts'
import type { RoomLog } from './RoomNavigator.ts'

const storageKey = 'achievements'

export class AchievementStore implements AchievementStorage {
  private readonly log: RoomLog

  constructor(log: RoomLog) {
    this.log = log
  }

  readonly load = (): AchievementRecord => {
    const stored = browserStorage.read(storageKey)
    if (stored.kind === 'unreachable') {
      this.log(`the saved achievements cannot be read, so none are unlocked: ${stored.error}`)
      return nothingUnlocked
    }
    if (stored.kind === 'none') return nothingUnlocked
    const saved = parsedJsonOrNull(stored.text)
    if (typeof saved !== 'object' || saved === null) {
      this.log('the saved achievements cannot be read, so none are unlocked')
      return nothingUnlocked
    }
    const record = saved as Partial<Record<keyof AchievementRecord, unknown>>
    const unlocked = Array.isArray(record.unlocked) ? record.unlocked.filter(isAchievementId) : []
    const puddlesWiped = typeof record.puddlesWiped === 'number' ? record.puddlesWiped : 0
    const visitsBegun = typeof record.visitsBegun === 'number' ? record.visitsBegun : 0
    return { unlocked, hasTheTapRunForNothing: record.hasTheTapRunForNothing === true, hasTheHeaterRunForNothing: record.hasTheHeaterRunForNothing === true, puddlesWiped, visitsBegun }
  }

  readonly keep = (record: AchievementRecord): void => {
    const write = browserStorage.keep(storageKey, JSON.stringify(record))
    if (write.kind === 'failed') this.log(`the achievements could not be saved: ${write.error}`)
  }
}

function isAchievementId(value: unknown): value is AchievementId {
  return achievementIds.some((id) => id === value)
}
