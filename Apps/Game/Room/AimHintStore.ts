import { browserStorage } from './BrowserStorage.ts'
import type { RoomLog } from './RoomNavigator.ts'

const storageKey = 'aimHintSeen'
const seenMark = 'yes'

export class AimHintStore {
  private readonly log: RoomLog

  constructor(log: RoomLog) {
    this.log = log
  }

  wasSeen(): boolean {
    const stored = browserStorage.read(storageKey)
    if (stored.kind === 'unreachable') {
      this.log(`whether the aiming note was seen cannot be read, so it is shown: ${stored.error}`)
      return false
    }
    return stored.kind === 'found' && stored.text === seenMark
  }

  rememberSeen(): void {
    const write = browserStorage.keep(storageKey, seenMark)
    if (write.kind === 'failed') this.log(`that the aiming note was seen could not be saved, so it shows again next time: ${write.error}`)
  }
}
