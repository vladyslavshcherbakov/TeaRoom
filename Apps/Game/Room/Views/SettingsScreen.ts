import { text, type TextKey } from '../../Texts/Texts.ts'
import { coatColours, type CoatColour, type RoomSettings } from '../RoomSettings.ts'

export type SettingsChoices = {
  readonly coatColourChosen: (colour: CoatColour) => void
  readonly softShadowsInCornersChosen: (isOn: boolean) => void
  readonly frameRateShownChosen: (isShown: boolean) => void
}

export class SettingsScreen {
  private readonly element: HTMLElement
  private readonly swatches: readonly HTMLButtonElement[]
  private readonly softShadowsToggle: HTMLInputElement
  private readonly frameRateToggle: HTMLInputElement

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
    this.softShadowsToggle = toggle(choices.softShadowsInCornersChosen)
    this.frameRateToggle = toggle(choices.frameRateShownChosen)
    const warning = document.createElement('p')
    warning.className = 'settings-warning'
    warning.textContent = text('settings.softShadowsInCornersWarning')
    const closeButton = document.createElement('button')
    closeButton.className = 'settings-close'
    closeButton.textContent = text('settings.close')
    closeButton.addEventListener('click', () => this.hide())
    sheet.append(heading('h2', 'settings.title'), heading('h3', 'settings.coatColour'), palette, heading('h3', 'settings.advanced'), toggleRow(this.softShadowsToggle, 'settings.softShadowsInCorners'), warning, toggleRow(this.frameRateToggle, 'settings.showFrameRate'), closeButton)
    this.element.append(sheet)
    container.append(this.element)
  }

  show(settings: RoomSettings): void {
    this.showTheChosenColour(settings.coatColour)
    this.softShadowsToggle.checked = settings.hasSoftShadowsInCorners
    this.frameRateToggle.checked = settings.isFrameRateShown
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

  private showTheChosenColour(chosen: CoatColour): void {
    this.swatches.forEach((swatch, index) => swatch.setAttribute('aria-pressed', String(coatColours[index] === chosen)))
  }
}

function heading(tag: 'h2' | 'h3', key: 'settings.title' | 'settings.coatColour' | 'settings.advanced'): HTMLElement {
  const element = document.createElement(tag)
  element.textContent = text(key)
  return element
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
