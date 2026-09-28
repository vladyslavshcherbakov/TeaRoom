import { text, textWith, type TextKey } from '../../../Texts/Texts.ts'
import { playTimeShownFor } from '../../../../Engine/PlayTime.ts'
import { controlSchemes, stickLayouts } from '../../../../Engine/Camera/FirstPersonControls.ts'
import { cameraModes, coatColours, faceFeatures, objectDetails, type CoatColour, type RoomSettingName, type RoomSettings } from '../../RoomSettings.ts'
import { temperatureUnits } from '../../Temperatures.ts'
import { button, choiceRow, pageElement, SheetOverTheScene, toggleRow, type ChoiceLook } from '../../../../Engine/Rendering/Controls/PageControls.ts'

export type SettingChosen = (change: Partial<RoomSettings>) => void

type SettingsShown = {
  readonly settings: RoomSettings
  readonly secondsPlayed: number
}

type Row = {
  readonly element: HTMLElement
  readonly show: (shown: SettingsShown) => void
}

export type RowOnTheScreen = {
  readonly setting: RoomSettingName | null
  readonly build: (chosen: SettingChosen) => Row
}

type NamesOf<Value> = { [Name in RoomSettingName]: RoomSettings[Name] extends Value ? Name : never }[RoomSettingName]

const swatches: ChoiceLook<CoatColour> = {
  rowClass: 'settings-palette',
  buttonClass: 'settings-swatch',
  dress: (swatch, colour) => {
    swatch.style.background = colour
    swatch.setAttribute('aria-label', text(`settings.coatColour.${colour}`))
  },
}

export const settingsScreenRows: readonly RowOnTheScreen[] = [
  heading('h2', 'settings.title'),
  toggle('areAchievementsShown', 'settings.showAchievements'),
  heading('h3', 'settings.coatColour'),
  choice('coatColour', coatColours, swatches),
  heading('h3', 'settings.face'),
  faceChoice(),
  heading('h3', 'settings.camera'),
  choice('cameraMode', cameraModes, buttons((mode) => `settings.camera.${mode}`)),
  paragraph('settings-note', 'settings.firstPersonNote'),
  heading('h3', 'settings.controls'),
  choice('controlScheme', controlSchemes, buttons((scheme) => `settings.controls.${scheme}`)),
  heading('h3', 'settings.sticks'),
  choice('stickLayout', stickLayouts, buttons((layout) => `settings.sticks.${layout}`)),
  heading('h3', 'settings.temperature'),
  toggle('isNerdModeOn', 'settings.nerdMode'),
  paragraph('settings-note', 'settings.nerdModeNote'),
  choice('temperatureUnit', temperatureUnits, buttons((unit) => `settings.unit.${unit}`)),
  heading('h3', 'settings.advanced'),
  toggle('hasSoftShadowsInCorners', 'settings.softShadowsInCorners'),
  paragraph('settings-warning', 'settings.softShadowsInCornersWarning'),
  toggle('hasGlow', 'settings.glow'),
  paragraph('settings-warning', 'settings.glowWarning'),
  toggle('hasFullResolution', 'settings.fullResolution'),
  paragraph('settings-warning', 'settings.fullResolutionWarning'),
  toggle('hasSmoothEdges', 'settings.smoothEdges'),
  paragraph('settings-warning', 'settings.smoothEdgesWarning'),
  paragraph('settings-choice-label', 'settings.objectDetail'),
  choice('objectDetail', objectDetails, buttons((detail) => `settings.objectDetail.${detail}`)),
  paragraph('settings-note', 'settings.objectDetailNote'),
  toggle('isFrameRateShown', 'settings.showFrameRate'),
  heading('h3', 'settings.statistics'),
  { setting: null, build: timePlayedRow },
]

export class SettingsScreen {
  private readonly sheet: SheetOverTheScene
  private readonly rows: readonly Row[]

  constructor(container: HTMLElement, settingChosen: SettingChosen) {
    this.sheet = new SheetOverTheScene(container, 'settings', 'settings-sheet')
    this.rows = settingsScreenRows.map((row) => row.build(settingChosen))
    this.sheet.sheet.append(...this.rows.map((row) => row.element), button('settings-close', text('settings.close'), () => this.sheet.hide()))
  }

  get isShown(): boolean {
    return this.sheet.isShown
  }

  show(settings: RoomSettings, secondsPlayed: number): void {
    for (const row of this.rows) row.show({ settings, secondsPlayed })
    this.sheet.show()
  }
}

function toggle<Name extends NamesOf<boolean>>(setting: Name, key: TextKey): RowOnTheScreen {
  return {
    setting,
    build: (chosen) => {
      const row = toggleRow('settings-toggle', text(key), (isOn) => chosen(changeOf(setting, isOn)))
      return { element: row.element, show: ({ settings }) => (row.checkbox.checked = settings[setting]) }
    },
  }
}

function choice<Name extends NamesOf<string>>(setting: Name, values: readonly RoomSettings[Name][], look: ChoiceLook<RoomSettings[Name]>): RowOnTheScreen {
  return {
    setting,
    build: (chosen) => {
      const row = choiceRow(values, look, (value) => chosen(changeOf(setting, value)))
      return { element: row.element, show: ({ settings }) => row.showTheChosen(settings[setting]) }
    },
  }
}

function faceChoice(): RowOnTheScreen {
  return {
    setting: 'faceFeaturesShown',
    build: (chosen) => {
      const row = choiceRow(faceFeatures, labelled('settings-faces', 'settings-face', (feature) => `settings.face.${feature}`), (feature) => chosen({ faceFeaturesShown: [feature] }))
      return { element: row.element, show: ({ settings }) => row.showEveryChosen(settings.faceFeaturesShown) }
    },
  }
}

function labelled<Value extends string>(rowClass: string, buttonClass: string, keyOf: (value: Value) => TextKey): ChoiceLook<Value> {
  return { rowClass, buttonClass, dress: (choice, value) => (choice.textContent = text(keyOf(value))) }
}

function buttons<Value extends string>(keyOf: (value: Value) => TextKey): ChoiceLook<Value> {
  return labelled('settings-units', 'settings-unit', keyOf)
}

function heading(tag: 'h2' | 'h3', key: TextKey): RowOnTheScreen {
  return { setting: null, build: () => ({ element: pageElement(tag, '', text(key)), show: () => {} }) }
}

function paragraph(className: string, key: TextKey): RowOnTheScreen {
  return { setting: null, build: () => ({ element: pageElement('p', className, text(key)), show: () => {} }) }
}

function timePlayedRow(): Row {
  const value = pageElement('span', 'settings-statistic-value')
  const row = pageElement('p', 'settings-statistic')
  row.append(text('settings.timePlayed'), value)
  return { element: row, show: ({ secondsPlayed }) => (value.textContent = timePlayedText(secondsPlayed)) }
}

function changeOf<Name extends RoomSettingName>(setting: Name, value: RoomSettings[Name]): Partial<RoomSettings> {
  return { [setting]: value } as Partial<RoomSettings>
}

function timePlayedText(secondsPlayed: number): string {
  const shown = playTimeShownFor(secondsPlayed)
  switch (shown.kind) {
    case 'underAMinute':
      return text('settings.timePlayed.underAMinute')
    case 'minutes':
      return textWith('settings.timePlayed.minutes', { minutes: String(shown.minutes) })
    case 'hoursAndMinutes':
      return textWith('settings.timePlayed.hoursAndMinutes', { hours: String(shown.hours), minutes: String(shown.minutes) })
  }
}
