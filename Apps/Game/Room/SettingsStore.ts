import type { RoomLog } from './RoomNavigator.ts'
import { defaultRoomSettings, roomSettingsFrom, type RoomSettings } from './RoomSettings.ts'

const storageKey = 'settings'

export class SettingsStore {
  private readonly log: RoomLog

  constructor(log: RoomLog) {
    this.log = log
  }

  load(): RoomSettings {
    try {
      const text = localStorage.getItem(storageKey)
      if (text === null) return defaultRoomSettings
      const settings = roomSettingsFrom(JSON.parse(text))
      this.log(`the settings are read: coat ${settings.coatColour}, soft shadows in corners ${settings.hasSoftShadowsInCorners ? 'on' : 'off'}, frame rate ${settings.isFrameRateShown ? 'shown' : 'hidden'}`)
      return settings
    } catch (error) {
      this.log(`the saved settings cannot be read, so the defaults are used: ${String(error)}`)
      return defaultRoomSettings
    }
  }

  keep(settings: RoomSettings): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings))
    } catch (error) {
      this.log(`the settings could not be saved: ${String(error)}`)
    }
  }
}
