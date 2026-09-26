import { text, textWith, type TextKey } from '../../Texts/Texts.ts'
import { keeperHeightByDefaultCentimetres, keeperHeightSteppedBy } from '../Camera/KeeperHeight.ts'
import type { DebugSettings } from '../DebugSettings.ts'
import { stepsDueWhileAnArrowIsHeld } from '../HeldArrow.ts'

type HeldHeightArrow = {
  readonly stepCentimetres: 1 | -1
  heldSeconds: number
  repeatedSteps: number
}

export type DebugMenuListener = {
  readonly keeperHeightChosen: (heightCentimetres: number) => void
  readonly frameBudgetShownChosen: (isShown: boolean) => void
  readonly googlyEyesChosen: (areGoogly: boolean) => void
  readonly giantAfroChosen: (isGiant: boolean) => void
  readonly everyFaceAtOnceChosen: (isEveryFaceShown: boolean) => void
}

export class DebugMenu {
  private readonly panel: HTMLElement
  private readonly listener: DebugMenuListener
  private readonly heightShown: HTMLElement
  private keeperHeightCentimetres = keeperHeightByDefaultCentimetres
  private heldHeightArrow: HeldHeightArrow | null = null
  private readonly frameBudgetToggle = checkbox()
  private readonly googlyEyesToggle = checkbox()
  private readonly giantAfroToggle = checkbox()
  private readonly everyFaceToggle = checkbox()

  constructor(container: HTMLElement, listener: DebugMenuListener) {
    this.listener = listener
    this.panel = document.createElement('div')
    this.panel.className = 'debug-menu'
    this.panel.hidden = true
    const title = document.createElement('h2')
    title.textContent = text('debug.title')
    const heightLabel = document.createElement('p')
    heightLabel.textContent = text('debug.height')
    this.heightShown = document.createElement('span')
    this.heightShown.className = 'debug-stepper-value'
    const heightStepper = document.createElement('div')
    heightStepper.className = 'debug-stepper'
    heightStepper.append(this.heightArrow(-1, '▼', 'debug.height.lower'), this.heightShown, this.heightArrow(1, '▲', 'debug.height.higher'))
    const closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.className = 'debug-close'
    closeButton.textContent = text('debug.close')
    closeButton.addEventListener('click', () => (this.panel.hidden = true))
    this.panel.append(
      title,
      heightLabel,
      heightStepper,
      toggleRow('debug.frameBudget', this.frameBudgetToggle, listener.frameBudgetShownChosen),
      toggleRow('debug.googlyEyes', this.googlyEyesToggle, listener.googlyEyesChosen),
      toggleRow('debug.giantAfro', this.giantAfroToggle, listener.giantAfroChosen),
      toggleRow('debug.everyFaceAtOnce', this.everyFaceToggle, listener.everyFaceAtOnceChosen),
      closeButton,
    )
    container.append(this.panel)
  }

  open(settings: DebugSettings): void {
    this.showTheHeight(settings.keeperHeightCentimetres)
    this.frameBudgetToggle.checked = settings.isFrameBudgetShown
    this.googlyEyesToggle.checked = settings.areEyesGoogly
    this.giantAfroToggle.checked = settings.isAfroGiant
    this.everyFaceToggle.checked = settings.isEveryFaceShown
    this.panel.hidden = false
  }

  advance(seconds: number): void {
    const held = this.heldHeightArrow
    if (held === null) return
    held.heldSeconds += seconds
    const stepsDue = stepsDueWhileAnArrowIsHeld(held.heldSeconds)
    while (held.repeatedSteps < stepsDue) {
      held.repeatedSteps += 1
      this.stepTheHeight(held.stepCentimetres)
    }
  }

  private heightArrow(stepCentimetres: 1 | -1, glyph: string, labelKey: TextKey): HTMLButtonElement {
    const arrow = document.createElement('button')
    arrow.type = 'button'
    arrow.className = 'debug-choice'
    arrow.textContent = glyph
    arrow.setAttribute('aria-label', text(labelKey))
    arrow.addEventListener('pointerdown', () => {
      this.stepTheHeight(stepCentimetres)
      this.heldHeightArrow = { stepCentimetres, heldSeconds: 0, repeatedSteps: 0 }
    })
    for (const letGo of ['pointerup', 'pointercancel', 'pointerleave']) arrow.addEventListener(letGo, () => (this.heldHeightArrow = null))
    arrow.addEventListener('click', (event) => {
      if (event.detail === 0) this.stepTheHeight(stepCentimetres)
    })
    return arrow
  }

  private stepTheHeight(stepCentimetres: number): void {
    const heightCentimetres = keeperHeightSteppedBy(this.keeperHeightCentimetres, stepCentimetres)
    if (heightCentimetres === this.keeperHeightCentimetres) return
    this.showTheHeight(heightCentimetres)
    this.listener.keeperHeightChosen(heightCentimetres)
  }

  private showTheHeight(heightCentimetres: number): void {
    this.keeperHeightCentimetres = heightCentimetres
    this.heightShown.textContent = textWith('debug.height.value', { centimetres: String(heightCentimetres) })
  }
}

function checkbox(): HTMLInputElement {
  const toggle = document.createElement('input')
  toggle.type = 'checkbox'
  return toggle
}

function toggleRow(textKey: TextKey, toggle: HTMLInputElement, chosen: (isOn: boolean) => void): HTMLElement {
  toggle.addEventListener('change', () => chosen(toggle.checked))
  const row = document.createElement('label')
  row.className = 'debug-toggle'
  row.append(toggle, document.createTextNode(text(textKey)))
  return row
}
