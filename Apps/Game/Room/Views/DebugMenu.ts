import { text, type TextKey } from '../../Texts/Texts.ts'
import type { ControlScheme } from '../Camera/FirstPersonControls.ts'

export type CameraMode = 'room' | 'firstPerson'

export type StickLayout = 'walkOnTheLeft' | 'lookOnTheLeft'

export type DebugMenuSettings = {
  readonly cameraMode: CameraMode
  readonly stickLayout: StickLayout
  readonly controlScheme: ControlScheme
}

export type DebugMenuListener = {
  readonly cameraModeChosen: (mode: CameraMode) => void
  readonly stickLayoutChosen: (layout: StickLayout) => void
  readonly controlSchemeChosen: (scheme: ControlScheme) => void
}

type Choice<Value extends string> = {
  readonly value: Value
  readonly labelKey: TextKey
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

  constructor(container: HTMLElement, listener: DebugMenuListener) {
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
    this.panel.append(title, ...this.groups.flatMap((group) => group.elements), closeButton)
    container.append(this.panel)
  }

  open(settings: DebugMenuSettings): void {
    for (const group of this.groups) group.show(settings)
    this.panel.hidden = false
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
