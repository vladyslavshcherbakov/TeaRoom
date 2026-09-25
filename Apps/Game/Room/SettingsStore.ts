import { browserStorage, parsedJsonOrNull } from './BrowserStorage.ts'
import type { RoomLog } from './RoomNavigator.ts'
import { defaultRoomSettings, roomSettingsFrom, type RoomSettings } from './RoomSettings.ts'

const storageKey = 'settings'

export class SettingsStore {
  private readonly log: RoomLog

  constructor(log: RoomLog) {
    this.log = log
  }

  load(): RoomSettings {
    const stored = browserStorage.read(storageKey)
    if (stored.kind === 'unreachable') {
      this.log(`the saved settings cannot be read, so the defaults are used: ${stored.error}`)
      return defaultRoomSettings
    }
    if (stored.kind === 'none') return defaultRoomSettings
    const saved = parsedJsonOrNull(stored.text)
    if (saved === null) {
      this.log('the saved settings cannot be read as JSON, so the defaults are used')
      return defaultRoomSettings
    }
    const settings = roomSettingsFrom(saved)
    this.log(`the settings are read: coat ${settings.coatColour}, soft shadows in corners ${settings.hasSoftShadowsInCorners ? 'on' : 'off'}, frame rate ${settings.isFrameRateShown ? 'shown' : 'hidden'}, face ${settings.faceFeature}`)
    return settings
  }

  keep(settings: RoomSettings): void {
    const write = browserStorage.keep(storageKey, JSON.stringify(settings))
    if (write.kind === 'failed') this.log(`the settings could not be saved: ${write.error}`)
  }
}
