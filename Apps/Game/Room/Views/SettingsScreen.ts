import { text, textWith, type TextKey } from '../../Texts/Texts.ts'
import { playTimeShownFor } from '../PlayTime.ts'
import { coatColours, faceFeatures, type CoatColour, type FaceFeature, type RoomSettings } from '../RoomSettings.ts'
import { temperatureUnits, type TemperatureUnit } from '../Temperatures.ts'

export type SettingsChoices = {
  readonly coatColourChosen: (colour: CoatColour) => void
  readonly softShadowsInCornersChosen: (isOn: boolean) => void
  readonly glowChosen: (isOn: boolean) => void
  readonly frameRateShownChosen: (isShown: boolean) => void
  readonly faceFeatureChosen: (feature: FaceFeature) => void
  readonly nerdModeChosen: (isOn: boolean) => void
  readonly temperatureUnitChosen: (unit: TemperatureUnit) => void
}

export class SettingsScreen {
  private readonly element: HTMLElement
  private readonly swatches: readonly HTMLButtonElement[]
  private readonly faceChoices: readonly HTMLButtonElement[]
  private readonly unitChoices: readonly HTMLButtonElement[]
  private readonly nerdModeToggle: HTMLInputElement
  private readonly softShadowsToggle: HTMLInputElement
  private readonly glowToggle: HTMLInputElement
  private readonly frameRateToggle: HTMLInputElement
  private readonly timePlayed: HTMLElement

  constructor(container: HTMLElement, choices: SettingsChoices) {
    this.element = document.createElement('div')
    this.element.className = 'settings'
    this.element.hidden = true
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.hide()
    })
    const sheet = document.createElement('div')
    sheet.className = 'settings-sheet'
    const palette = document.createElement('div')
    palette.className = 'settings-palette'
    this.swatches = coatColours.map((colour) => this.swatch(colour, choices))
    palette.append(...this.swatches)
    const faceRow = document.createElement('div')
    faceRow.className = 'settings-faces'
    this.faceChoices = faceFeatures.map((feature) => this.faceChoice(feature, choices))
    faceRow.append(...this.faceChoices)
    this.nerdModeToggle = toggle(choices.nerdModeChosen)
    const nerdModeNote = paragraphOf('settings-note', 'settings.nerdModeNote')
    const unitRow = document.createElement('div')
    unitRow.className = 'settings-units'
    this.unitChoices = temperatureUnits.map((unit) => this.unitChoice(unit, choices))
    unitRow.append(...this.unitChoices)
    this.softShadowsToggle = toggle(choices.softShadowsInCornersChosen)
    this.glowToggle = toggle(choices.glowChosen)
    this.frameRateToggle = toggle(choices.frameRateShownChosen)
    const warning = paragraphOf('settings-warning', 'settings.softShadowsInCornersWarning')
    const glowWarning = paragraphOf('settings-warning', 'settings.glowWarning')
    this.timePlayed = document.createElement('span')
    this.timePlayed.className = 'settings-statistic-value'
    const timePlayedRow = document.createElement('p')
    timePlayedRow.className = 'settings-statistic'
    timePlayedRow.append(text('settings.timePlayed'), this.timePlayed)
    const closeButton = document.createElement('button')
    closeButton.className = 'settings-close'
    closeButton.textContent = text('settings.close')
    closeButton.addEventListener('click', () => this.hide())
    sheet.append(heading('h2', 'settings.title'), heading('h3', 'settings.coatColour'), palette, heading('h3', 'settings.face'), faceRow, heading('h3', 'settings.temperature'), toggleRow(this.nerdModeToggle, 'settings.nerdMode'), nerdModeNote, unitRow, heading('h3', 'settings.advanced'), toggleRow(this.softShadowsToggle, 'settings.softShadowsInCorners'), warning, toggleRow(this.glowToggle, 'settings.glow'), glowWarning, toggleRow(this.frameRateToggle, 'settings.showFrameRate'), heading('h3', 'settings.statistics'), timePlayedRow, closeButton)
    this.element.append(sheet)
    container.append(this.element)
  }

  show(settings: RoomSettings, secondsPlayed: number): void {
    this.timePlayed.textContent = timePlayedText(secondsPlayed)
    this.showTheChosenColour(settings.coatColour)
    this.showTheChosenFace(settings.faceFeature)
    this.softShadowsToggle.checked = settings.hasSoftShadowsInCorners
    this.glowToggle.checked = settings.hasGlow
    this.frameRateToggle.checked = settings.isFrameRateShown
    this.nerdModeToggle.checked = settings.isNerdModeOn
    this.showTheChosenUnit(settings.temperatureUnit)
    this.element.hidden = false
  }

  private hide(): void {
    this.element.hidden = true
  }

  private swatch(colour: CoatColour, choices: SettingsChoices): HTMLButtonElement {
    const swatch = document.createElement('button')
    swatch.className = 'settings-swatch'
    swatch.style.background = colour
    swatch.addEventListener('click', () => {
      this.showTheChosenColour(colour)
      choices.coatColourChosen(colour)
    })
    return swatch
  }

  private faceChoice(feature: FaceFeature, choices: SettingsChoices): HTMLButtonElement {
    const button = document.createElement('button')
    button.className = 'settings-face'
    button.textContent = text(`settings.face.${feature}`)
    button.addEventListener('click', () => {
      this.showTheChosenFace(feature)
      choices.faceFeatureChosen(feature)
    })
    return button
  }

  private unitChoice(unit: TemperatureUnit, choices: SettingsChoices): HTMLButtonElement {
    const button = document.createElement('button')
    button.className = 'settings-unit'
    button.textContent = text(`settings.unit.${unit}`)
    button.addEventListener('click', () => {
      this.showTheChosenUnit(unit)
      choices.temperatureUnitChosen(unit)
    })
    return button
  }

  private showTheChosenUnit(chosen: TemperatureUnit): void {
    this.unitChoices.forEach((button, index) => button.setAttribute('aria-pressed', String(temperatureUnits[index] === chosen)))
  }

  private showTheChosenFace(chosen: FaceFeature): void {
    this.faceChoices.forEach((button, index) => button.setAttribute('aria-pressed', String(faceFeatures[index] === chosen)))
  }

  private showTheChosenColour(chosen: CoatColour): void {
    this.swatches.forEach((swatch, index) => swatch.setAttribute('aria-pressed', String(coatColours[index] === chosen)))
  }
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

function heading(tag: 'h2' | 'h3', key: 'settings.title' | 'settings.coatColour' | 'settings.face' | 'settings.temperature' | 'settings.advanced' | 'settings.statistics'): HTMLElement {
  const element = document.createElement(tag)
  element.textContent = text(key)
  return element
}

function paragraphOf(className: string, key: TextKey): HTMLElement {
  const paragraph = document.createElement('p')
  paragraph.className = className
  paragraph.textContent = text(key)
  return paragraph
}

function toggle(chosen: (isOn: boolean) => void): HTMLInputElement {
  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.addEventListener('change', () => chosen(checkbox.checked))
  return checkbox
}

function toggleRow(checkbox: HTMLInputElement, key: TextKey): HTMLElement {
  const row = document.createElement('label')
  row.className = 'settings-toggle'
  row.append(checkbox, document.createTextNode(text(key)))
  return row
}
