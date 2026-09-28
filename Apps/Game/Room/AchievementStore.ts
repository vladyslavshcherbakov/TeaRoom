import { browserStore, doesNotFit, fits, withADefault, type Decoded } from '../../Engine/BrowserStorage.ts'
import { achievementIds, nothingUnlocked, type AchievementId, type AchievementRecord, type AchievementStorage } from './Achievements.ts'
import type { AppLog } from '../../Engine/AppLog.ts'

export function achievementStore(log: AppLog): AchievementStorage {
  return withADefault(browserStore({ key: 'achievements', name: 'the achievements', whenLost: 'so none are unlocked', decode: achievementRecordFrom }, log), nothingUnlocked)
}

function achievementRecordFrom(saved: unknown): Decoded<AchievementRecord> {
  if (typeof saved !== 'object' || saved === null) return doesNotFit('it is not an object')
  const record = saved as Partial<Record<keyof AchievementRecord, unknown>>
  const unlocked = Array.isArray(record.unlocked) ? record.unlocked.filter(isAchievementId) : []
  const puddlesWiped = typeof record.puddlesWiped === 'number' ? record.puddlesWiped : 0
  const visitsBegun = typeof record.visitsBegun === 'number' ? record.visitsBegun : 0
  return fits({ unlocked, hasTheTapRunForNothing: record.hasTheTapRunForNothing === true, hasTheHeaterRunForNothing: record.hasTheHeaterRunForNothing === true, puddlesWiped, visitsBegun })
}

function isAchievementId(value: unknown): value is AchievementId {
  return achievementIds.some((id) => id === value)
}
