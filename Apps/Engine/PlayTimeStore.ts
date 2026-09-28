import { browserStore, doesNotFit, fits, withADefault, type Decoded } from './BrowserStorage.ts'
import type { PlayTimeStorage } from './PlayTime.ts'
import type { AppLog } from './AppLog.ts'

type SavedPlayTime = {
  readonly secondsPlayed: number
}

export function playTimeStore(log: AppLog): PlayTimeStorage {
  const store = withADefault(browserStore({ key: 'playTime', name: 'the play time', whenLost: 'so it starts from nothing', decode: playTimeFrom }, log), { secondsPlayed: 0 })
  return { load: () => store.load().secondsPlayed, keep: (secondsPlayed) => store.keep({ secondsPlayed }) }
}

function playTimeFrom(saved: unknown): Decoded<SavedPlayTime> {
  const secondsPlayed = typeof saved === 'object' && saved !== null ? (saved as { secondsPlayed?: unknown }).secondsPlayed : undefined
  if (typeof secondsPlayed === 'number' && Number.isFinite(secondsPlayed) && secondsPlayed >= 0) return fits({ secondsPlayed })
  return doesNotFit(`its seconds played are ${String(secondsPlayed)}`)
}
