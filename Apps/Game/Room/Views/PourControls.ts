import { doneText, tiltText } from '../RoomTexts.ts'

export type PourControlsListener = {
  readonly tiltPressed: () => void
  readonly tiltReleased: () => void
  readonly doneTapped: () => void
}

export class PourControls {
  private readonly tiltButton: HTMLButtonElement
  private readonly doneButton: HTMLButtonElement

  constructor(container: HTMLElement, listener: PourControlsListener) {
    this.tiltButton = pourButton('tilt', tiltText)
    this.doneButton = pourButton('done', doneText)
    this.tiltButton.addEventListener('pointerdown', (event) => {
      this.tiltButton.setPointerCapture(event.pointerId)
      listener.tiltPressed()
    })
    for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) this.tiltButton.addEventListener(ending, () => listener.tiltReleased())
    this.doneButton.addEventListener('click', () => listener.doneTapped())
    container.append(this.tiltButton, this.doneButton)
  }

  show(isAiming: boolean): void {
    if (this.tiltButton.hidden === !isAiming) return
    this.tiltButton.hidden = !isAiming
    this.doneButton.hidden = !isAiming
  }
}

function pourButton(className: string, text: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  button.textContent = text
  button.hidden = true
  return button
}
