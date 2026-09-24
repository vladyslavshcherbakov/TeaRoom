import { text } from '../../Texts/Texts.ts'

export class SipButton {
  private readonly button: HTMLButtonElement

  constructor(container: HTMLElement, sipTapped: () => void) {
    this.button = document.createElement('button')
    this.button.type = 'button'
    this.button.className = 'sip'
    this.button.textContent = text('hand.sip')
    this.button.hidden = true
    this.button.addEventListener('click', sipTapped)
    container.append(this.button)
  }

  show(canSip: boolean): void {
    if (this.button.hidden === !canSip) return
    this.button.hidden = !canSip
  }
}
