import { text, textWith, type TextKey } from '../../../Texts/Texts.ts'
import { playerHeightByDefaultCentimetres, playerHeightSteppedBy } from '../../../../Engine/Camera/PlayerHeight.ts'
import type { DebugSettings } from '../../DebugSettings.ts'
import { stepsDueWhileAnArrowIsHeld } from '../../../../Engine/HeldArrow.ts'
import { actWhileHeld, button, pageElement, toggleRow } from '../../../../Engine/Rendering/Controls/PageControls.ts'

export type DebugSettingChosen = (change: Partial<DebugSettings>) => void

export type DebugMenuListener = {
  readonly debugSettingChosen: DebugSettingChosen
  readonly kettleFillTapped: () => void
}

type Row = {
  readonly element: HTMLElement
  readonly show: (settings: DebugSettings) => void
  readonly advance: (seconds: number) => void
}

export type RowInTheMenu = {
  readonly setting: keyof DebugSettings
  readonly build: (chosen: DebugSettingChosen) => Row
}

type HeldHeightArrow = {
  readonly stepCentimetres: 1 | -1
  heldSeconds: number
  repeatedSteps: number
}

type NamesOfToggles = { [Name in keyof DebugSettings]: DebugSettings[Name] extends boolean ? Name : never }[keyof DebugSettings]

export const debugMenuRows: readonly RowInTheMenu[] = [
  { setting: 'playerHeightCentimetres', build: heightStepper },
  toggle('isFrameBudgetShown', 'debug.frameBudget'),
  toggle('isTheWorldFast', 'debug.fastWorld'),
]

export class DebugMenu {
  private readonly panel: HTMLElement
  private readonly rows: readonly Row[]

  constructor(container: HTMLElement, listener: DebugMenuListener) {
    this.panel = pageElement('div', 'debug-menu')
    this.panel.hidden = true
    this.rows = debugMenuRows.map((row) => row.build(listener.debugSettingChosen))
    const fillTheKettleButton = button('debug-button', text('debug.fillTheKettle'), listener.kettleFillTapped)
    const closeButton = button('debug-button', text('debug.close'), () => (this.panel.hidden = true))
    this.panel.append(pageElement('h2', '', text('debug.title')), ...this.rows.map((row) => row.element), fillTheKettleButton, closeButton)
    container.append(this.panel)
  }

  open(settings: DebugSettings): void {
    for (const row of this.rows) row.show(settings)
    this.panel.hidden = false
  }

  advance(seconds: number): void {
    for (const row of this.rows) row.advance(seconds)
  }
}

function heightStepper(chosen: DebugSettingChosen): Row {
  let heightCentimetres = playerHeightByDefaultCentimetres
  let heldArrow: HeldHeightArrow | null = null
  const heightShown = pageElement('span', 'debug-stepper-value')
  const showTheHeight = (shownCentimetres: number): void => {
    heightCentimetres = shownCentimetres
    heightShown.textContent = textWith('debug.height.value', { centimetres: String(shownCentimetres) })
  }
  const stepTheHeight = (stepCentimetres: number): void => {
    const steppedCentimetres = playerHeightSteppedBy(heightCentimetres, stepCentimetres)
    if (steppedCentimetres === heightCentimetres) return
    showTheHeight(steppedCentimetres)
    chosen({ playerHeightCentimetres: steppedCentimetres })
  }
  const arrow = (stepCentimetres: 1 | -1, glyph: string, labelKey: TextKey): HTMLButtonElement => {
    const pressable = button('debug-choice', glyph, () => {})
    pressable.setAttribute('aria-label', text(labelKey))
    actWhileHeld(pressable, {
      held: () => {
        stepTheHeight(stepCentimetres)
        heldArrow = { stepCentimetres, heldSeconds: 0, repeatedSteps: 0 }
      },
      letGo: () => (heldArrow = null),
    })
    return pressable
  }
  const stepper = pageElement('div', 'debug-stepper')
  stepper.append(arrow(-1, '▼', 'debug.height.lower'), heightShown, arrow(1, '▲', 'debug.height.higher'))
  const row = pageElement('div', 'debug-height')
  row.append(pageElement('p', '', text('debug.height')), stepper)
  return {
    element: row,
    show: (settings) => showTheHeight(settings.playerHeightCentimetres),
    advance: (seconds) => {
      const held = heldArrow
      if (held === null) return
      held.heldSeconds += seconds
      const stepsDue = stepsDueWhileAnArrowIsHeld(held.heldSeconds)
      while (held.repeatedSteps < stepsDue) {
        held.repeatedSteps += 1
        stepTheHeight(held.stepCentimetres)
      }
    },
  }
}

function toggle<Name extends NamesOfToggles>(setting: Name, textKey: TextKey): RowInTheMenu {
  return {
    setting,
    build: (chosen) => {
      const row = toggleRow('debug-toggle', text(textKey), (isOn) => chosen({ [setting]: isOn } as Partial<DebugSettings>))
      return { element: row.element, show: (settings) => (row.checkbox.checked = settings[setting]), advance: () => {} }
    },
  }
}
