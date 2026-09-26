import { browserStorage, parsedJsonOrNull } from './BrowserStorage.ts'
import type { RoomLog } from './RoomNavigator.ts'
import type { ControlScheme } from './Camera/FirstPersonControls.ts'
import { defaultRoomSettingsWith, roomSettingsFrom, type RoomSettings } from './RoomSettings.ts'

const storageKey = 'settings'

export class SettingsStore {
  private readonly log: RoomLog
  private readonly controlSchemeByDefault: ControlScheme

  constructor(log: RoomLog, controlSchemeByDefault: ControlScheme) {
    this.log = log
    this.controlSchemeByDefault = controlSchemeByDefault
  }

  load(): RoomSettings {
    const defaultRoomSettings = defaultRoomSettingsWith(this.controlSchemeByDefault)
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
    const settings = roomSettingsFrom(saved, this.controlSchemeByDefault)
    this.log(`the settings are read: coat ${settings.coatColour}, soft shadows in corners ${settings.hasSoftShadowsInCorners ? 'on' : 'off'}, glow ${settings.hasGlow ? 'on' : 'off'}, frame rate ${settings.isFrameRateShown ? 'shown' : 'hidden'}, full resolution ${settings.hasFullResolution ? 'on' : 'off'}, smooth edges ${settings.hasSmoothEdges ? 'on' : 'off'}, face ${settings.faceFeature}, nerd mode ${settings.isNerdModeOn ? 'on' : 'off'}, degrees ${settings.temperatureUnit}, camera ${settings.cameraMode}, first-person controls ${settings.controlScheme}, sticks ${settings.stickLayout}`)
    return settings
  }

  keep(settings: RoomSettings): void {
    const write = browserStorage.keep(storageKey, JSON.stringify(settings))
    if (write.kind === 'failed') this.log(`the settings could not be saved: ${write.error}`)
  }
}
