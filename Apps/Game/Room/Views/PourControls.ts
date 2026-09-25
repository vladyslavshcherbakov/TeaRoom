import { text } from '../../Texts/Texts.ts'

export type PourControlsListener = {
  readonly tiltPressed: () => void
  readonly tiltReleased: () => void
}

const hintSeenStorageKey = 'aimHintSeen'

export class PourControls {
  private readonly tiltButton: HTMLButtonElement
  private readonly hint: HTMLElement
  private isAiming = false

  constructor(container: HTMLElement, listener: PourControlsListener) {
    this.tiltButton = document.createElement('button')
    this.tiltButton.type = 'button'
    this.tiltButton.className = 'tilt'
    this.tiltButton.textContent = text('aim.tiltButton')
    this.tiltButton.hidden = true
    this.tiltButton.addEventListener('pointerdown', (event) => {
      this.tiltButton.setPointerCapture(event.pointerId)
      listener.tiltPressed()
    })
    for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) this.tiltButton.addEventListener(ending, () => listener.tiltReleased())
    this.hint = document.createElement('div')
    this.hint.className = 'aim-hint'
    this.hint.textContent = text('aim.hint')
    this.hint.hidden = true
    container.append(this.tiltButton, this.hint)
  }

  show(isAiming: boolean): void {
    if (this.isAiming === isAiming) return
    this.isAiming = isAiming
    this.tiltButton.hidden = !isAiming
    if (isAiming) this.hint.hidden = wasHintSeen()
    if (!isAiming && !this.hint.hidden) rememberHintSeenIfStorageAllows()
    if (!isAiming) this.hint.hidden = true
  }
}

function wasHintSeen(): boolean {
  try {
    return window.localStorage.getItem(hintSeenStorageKey) === 'yes'
  } catch {
    return false
  }
}

function rememberHintSeenIfStorageAllows(): void {
  try {
    window.localStorage.setItem(hintSeenStorageKey, 'yes')
  } catch {
    return
  }
}
