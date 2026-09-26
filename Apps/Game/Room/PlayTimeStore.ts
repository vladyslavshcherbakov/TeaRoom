import { browserStorage, parsedJsonOrNull } from './BrowserStorage.ts'
import type { PlayTimeStorage } from './PlayTime.ts'
import type { RoomLog } from './RoomNavigator.ts'

const storageKey = 'playTime'

export class PlayTimeStore implements PlayTimeStorage {
  private readonly log: RoomLog

  constructor(log: RoomLog) {
    this.log = log
  }

  readonly load = (): number => {
    const stored = browserStorage.read(storageKey)
    if (stored.kind === 'unreachable') {
      this.log(`the saved play time cannot be read, so it starts from nothing: ${stored.error}`)
      return 0
    }
    if (stored.kind === 'none') return 0
    const saved = parsedJsonOrNull(stored.text)
    const secondsPlayed = typeof saved === 'object' && saved !== null ? (saved as { secondsPlayed?: unknown }).secondsPlayed : undefined
    if (typeof secondsPlayed === 'number' && Number.isFinite(secondsPlayed) && secondsPlayed >= 0) return secondsPlayed
    this.log('the saved play time cannot be read, so it starts from nothing')
    return 0
  }

  readonly keep = (secondsPlayed: number): void => {
    const write = browserStorage.keep(storageKey, JSON.stringify({ secondsPlayed }))
    if (write.kind === 'failed') this.log(`the play time could not be saved: ${write.error}`)
  }
}
