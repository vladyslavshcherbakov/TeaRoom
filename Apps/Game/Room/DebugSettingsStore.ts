import { browserStorage, parsedJsonOrNull } from './BrowserStorage.ts'
import { debugSettingsByDefault, debugSettingsFrom, describeDebugSettings, type DebugSettings } from './DebugSettings.ts'
import type { RoomLog } from './RoomNavigator.ts'

const storageKey = 'debugSettings'

export class DebugSettingsStore {
  private readonly log: RoomLog

  constructor(log: RoomLog) {
    this.log = log
  }

  load(): DebugSettings {
    const stored = browserStorage.read(storageKey)
    if (stored.kind === 'unreachable') {
      this.log(`the saved debug settings cannot be read, so the defaults are used: ${stored.error}`)
      return debugSettingsByDefault
    }
    if (stored.kind === 'none') return debugSettingsByDefault
    const saved = parsedJsonOrNull(stored.text)
    if (saved === null) {
      this.log('the saved debug settings cannot be read as JSON, so the defaults are used')
      return debugSettingsByDefault
    }
    const settings = debugSettingsFrom(saved)
    this.log(`the debug settings are read: ${describeDebugSettings(settings)}`)
    return settings
  }

  keep(settings: DebugSettings): void {
    const write = browserStorage.keep(storageKey, JSON.stringify(settings))
    if (write.kind === 'failed') this.log(`the debug settings could not be saved: ${write.error}`)
  }
}
