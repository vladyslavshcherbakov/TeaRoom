import { text } from '../../Texts/Texts.ts'

export type ContinueChoice = {
  readonly continued: () => void
  readonly startedOver: () => void
}

export class ContinueScreen {
  private readonly element: HTMLElement

  constructor(container: HTMLElement, choice: ContinueChoice) {
    this.element = document.createElement('div')
    this.element.className = 'continue'
    const title = document.createElement('p')
    title.className = 'continue-title'
    title.textContent = text('visit.welcomeBack')
    const continueButton = this.button('visit.continue', 'continue-primary', choice.continued)
    const startOverButton = this.button('visit.startOver', 'continue-secondary', choice.startedOver)
    this.element.append(title, continueButton, startOverButton)
    container.append(this.element)
  }

  private button(key: 'visit.continue' | 'visit.startOver', className: string, chosen: () => void): HTMLButtonElement {
    const button = document.createElement('button')
    button.className = className
    button.textContent = text(key)
    button.addEventListener('click', () => {
      this.element.remove()
      chosen()
    })
    return button
  }
}
