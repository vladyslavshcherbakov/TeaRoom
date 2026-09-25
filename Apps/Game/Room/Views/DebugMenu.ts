import { text } from '../../Texts/Texts.ts'

export type CameraMode = 'room' | 'firstPerson'

export type DebugMenuListener = {
  readonly cameraModeChosen: (mode: CameraMode) => void
}

const cameraModes: readonly CameraMode[] = ['room', 'firstPerson']

export class DebugMenu {
  private readonly panel: HTMLElement
  private readonly modeButtons: ReadonlyMap<CameraMode, HTMLButtonElement>

  constructor(container: HTMLElement, listener: DebugMenuListener) {
    this.panel = document.createElement('div')
    this.panel.className = 'debug-menu'
    this.panel.hidden = true
    const title = document.createElement('h2')
    title.textContent = text('debug.title')
    const cameraLabel = document.createElement('p')
    cameraLabel.textContent = text('debug.camera')
    this.modeButtons = new Map(cameraModes.map((mode) => [mode, this.modeButton(mode, listener)]))
    const closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.className = 'debug-close'
    closeButton.textContent = text('debug.close')
    closeButton.addEventListener('click', () => (this.panel.hidden = true))
    this.panel.append(title, cameraLabel, ...this.modeButtons.values(), closeButton)
    container.append(this.panel)
  }

  open(currentMode: CameraMode): void {
    this.showChosen(currentMode)
    this.panel.hidden = false
  }

  private modeButton(mode: CameraMode, listener: DebugMenuListener): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'debug-choice'
    button.textContent = text(mode === 'room' ? 'debug.camera.room' : 'debug.camera.firstPerson')
    button.addEventListener('click', () => {
      this.showChosen(mode)
      listener.cameraModeChosen(mode)
    })
    return button
  }

  private showChosen(mode: CameraMode): void {
    for (const [buttonMode, button] of this.modeButtons) button.setAttribute('aria-pressed', String(buttonMode === mode))
  }
}
