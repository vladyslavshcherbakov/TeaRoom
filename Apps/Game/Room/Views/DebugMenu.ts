import { text, textWith, type TextKey } from '../../Texts/Texts.ts'
import type { ControlScheme } from '../Camera/FirstPersonControls.ts'
import { keeperHeightByDefaultCentimetres, keeperHeightSteppedBy } from '../Camera/KeeperHeight.ts'
import { stepsDueWhileAnArrowIsHeld } from '../HeldArrow.ts'

export type CameraMode = 'room' | 'firstPerson'

export type StickLayout = 'walkOnTheLeft' | 'lookOnTheLeft'

export type DebugMenuSettings = {
  readonly cameraMode: CameraMode
  readonly stickLayout: StickLayout
  readonly controlScheme: ControlScheme
  readonly keeperHeightCentimetres: number
}

export type DebugMenuListener = {
  readonly cameraModeChosen: (mode: CameraMode) => void
  readonly stickLayoutChosen: (layout: StickLayout) => void
  readonly controlSchemeChosen: (scheme: ControlScheme) => void
  readonly keeperHeightChosen: (heightCentimetres: number) => void
}

type Choice<Value extends string> = {
  readonly value: Value
  readonly labelKey: TextKey
}

type HeldHeightArrow = {
  readonly stepCentimetres: 1 | -1
  heldSeconds: number
  repeatedSteps: number
}

type ChoiceGroup = {
  readonly show: (settings: DebugMenuSettings) => void
  readonly elements: readonly HTMLElement[]
}

const cameraModes: readonly Choice<CameraMode>[] = [
  { value: 'room', labelKey: 'debug.camera.room' },
  { value: 'firstPerson', labelKey: 'debug.camera.firstPerson' },
]

const stickLayouts: readonly Choice<StickLayout>[] = [
  { value: 'walkOnTheLeft', labelKey: 'debug.sticks.walkOnTheLeft' },
  { value: 'lookOnTheLeft', labelKey: 'debug.sticks.lookOnTheLeft' },
]

const controlSchemes: readonly Choice<ControlScheme>[] = [
  { value: 'twoSticks', labelKey: 'debug.controls.twoSticks' },
  { value: 'mouseAndKeyboard', labelKey: 'debug.controls.mouseAndKeyboard' },
  { value: 'mouseAndWalkStick', labelKey: 'debug.controls.mouseAndWalkStick' },
  { value: 'keyboardAndLookStick', labelKey: 'debug.controls.keyboardAndLookStick' },
]

export class DebugMenu {
  private readonly panel: HTMLElement
  private readonly groups: readonly ChoiceGroup[]
  private readonly listener: DebugMenuListener
  private readonly heightShown: HTMLElement
  private keeperHeightCentimetres = keeperHeightByDefaultCentimetres
  private heldHeightArrow: HeldHeightArrow | null = null

  constructor(container: HTMLElement, listener: DebugMenuListener) {
    this.listener = listener
    this.panel = document.createElement('div')
    this.panel.className = 'debug-menu'
    this.panel.hidden = true
    const title = document.createElement('h2')
    title.textContent = text('debug.title')
    this.groups = [
      choiceGroup('debug.camera', cameraModes, (settings) => settings.cameraMode, listener.cameraModeChosen),
      choiceGroup('debug.controls', controlSchemes, (settings) => settings.controlScheme, listener.controlSchemeChosen),
      choiceGroup('debug.sticks', stickLayouts, (settings) => settings.stickLayout, listener.stickLayoutChosen),
    ]
    const closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.className = 'debug-close'
    closeButton.textContent = text('debug.close')
    closeButton.addEventListener('click', () => (this.panel.hidden = true))
    const heightLabel = document.createElement('p')
    heightLabel.textContent = text('debug.height')
    this.heightShown = document.createElement('span')
    this.heightShown.className = 'debug-stepper-value'
    const heightStepper = document.createElement('div')
    heightStepper.className = 'debug-stepper'
    heightStepper.append(this.heightArrow(-1, '▼', 'debug.height.lower'), this.heightShown, this.heightArrow(1, '▲', 'debug.height.higher'))
    this.panel.append(title, ...this.groups.flatMap((group) => group.elements), heightLabel, heightStepper, closeButton)
    container.append(this.panel)
  }

  open(settings: DebugMenuSettings): void {
    for (const group of this.groups) group.show(settings)
    this.showTheHeight(settings.keeperHeightCentimetres)
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

function choiceGroup<Value extends string>(labelKey: TextKey, choices: readonly Choice<Value>[], chosenIn: (settings: DebugMenuSettings) => Value, chosen: (value: Value) => void): ChoiceGroup {
  const label = document.createElement('p')
  label.textContent = text(labelKey)
  const buttons = choices.map((choice) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'debug-choice'
    button.textContent = text(choice.labelKey)
    button.addEventListener('click', () => {
      showChosen(choice.value)
      chosen(choice.value)
    })
    return button
  })
  const showChosen = (value: Value): void => buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(choices[index]?.value === value)))
  return { show: (settings) => showChosen(chosenIn(settings)), elements: [label, ...buttons] }
}
