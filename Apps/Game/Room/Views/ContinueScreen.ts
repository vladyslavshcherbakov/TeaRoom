import { text, type TextKey } from '../../Texts/Texts.ts'

type KeyLine = {
  readonly keyKey: TextKey
  readonly actionKey: TextKey
}

const keyLines: readonly KeyLine[] = [
  { keyKey: 'visit.keys.hands.key', actionKey: 'visit.keys.hands' },
  { keyKey: 'visit.keys.look.key', actionKey: 'visit.keys.look' },
  { keyKey: 'visit.keys.sip.key', actionKey: 'visit.keys.sip' },
  { keyKey: 'visit.keys.pour.key', actionKey: 'visit.keys.pour' },
  { keyKey: 'visit.keys.walk.key', actionKey: 'visit.keys.walk' },
  { keyKey: 'visit.keys.hurry.key', actionKey: 'visit.keys.hurry' },
  { keyKey: 'visit.keys.mouse.key', actionKey: 'visit.keys.mouse' },
]

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
    const startOverNote = document.createElement('p')
    startOverNote.className = 'continue-note'
    startOverNote.textContent = text('visit.startOverNote')
    this.element.append(title, continueButton, startOverButton, startOverNote)
    if (hasAKeyboard()) this.element.append(keysList())
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

function hasAKeyboard(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function keysList(): HTMLElement {
  const keys = document.createElement('dl')
  keys.className = 'continue-keys'
  keys.setAttribute('aria-label', text('visit.keys.title'))
  for (const line of keyLines) {
    const key = document.createElement('dt')
    key.textContent = text(line.keyKey)
    const action = document.createElement('dd')
    action.textContent = text(line.actionKey)
    keys.append(key, action)
  }
  return keys
}
