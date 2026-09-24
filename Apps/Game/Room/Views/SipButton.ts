import type { HandIndex } from '../../../../Shared/Simulation/State/SessionState.ts'
import { emptyHandText, itemName, sipText } from '../RoomTexts.ts'

export type HandsShown = {
  readonly hands: readonly (string | null)[]
  readonly selectedHandIndex: HandIndex | null
  readonly canSip: boolean
}

export class HandButtons {
  private readonly buttons: readonly [HTMLButtonElement, HTMLButtonElement]
  private readonly sipButton: HTMLButtonElement
  private shownKey = ''

  constructor(container: HTMLElement, handTapped: (handIndex: HandIndex) => void, sipTapped: () => void) {
    const bar = document.createElement('div')
    bar.className = 'hands'
    this.buttons = [this.button(0, handTapped), this.button(1, handTapped)]
    this.sipButton = document.createElement('button')
    this.sipButton.type = 'button'
    this.sipButton.className = 'sip'
    this.sipButton.textContent = sipText
    this.sipButton.addEventListener('click', sipTapped)
    bar.append(this.buttons[0], this.sipButton, this.buttons[1])
    container.append(bar)
  }

  show(shown: HandsShown): void {
    const shownKey = JSON.stringify(shown)
    if (shownKey === this.shownKey) return
    this.shownKey = shownKey
    this.buttons.forEach((button, index) => {
      const itemId = shown.hands[index] ?? null
      button.textContent = itemId === null ? emptyHandText : itemName(itemId)
      button.disabled = itemId === null
      button.classList.toggle('chosen', shown.selectedHandIndex === index)
    })
    this.sipButton.hidden = !shown.canSip
  }

  private button(handIndex: HandIndex, handTapped: (handIndex: HandIndex) => void): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset['hand'] = String(handIndex)
    button.addEventListener('click', () => handTapped(handIndex))
    return button
  }
}
