import { text, type TextKey } from '../../../Texts/Texts.ts'
import { startOverNote } from '../../RoomTexts.ts'
import { button, pageElement } from '../../../../Engine/Rendering/Controls/PageControls.ts'

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
  { keyKey: 'visit.keys.mouse.key', actionKey: 'visit.keys.mouse' },
]

export type ContinueScreenListener = {
  readonly continued: () => void
  readonly startedOver: () => void
}

export class ContinueScreen {
  private readonly element: HTMLElement
  private readonly buttons: HTMLButtonElement[] = []

  constructor(container: HTMLElement, listener: ContinueScreenListener, areAchievementsShown: boolean) {
    this.element = pageElement('div', 'continue')
    const title = pageElement('p', 'continue-title', text('visit.welcomeBack'))
    const continueButton = this.choiceButton('visit.continue', 'continue-primary', listener.continued)
    const startOverButton = this.choiceButton('visit.startOver', 'continue-secondary', listener.startedOver)
    this.buttons.push(continueButton, startOverButton)
    this.element.append(title, continueButton, startOverButton, pageElement('p', 'continue-note', startOverNote(areAchievementsShown)))
    if (hasAKeyboard()) this.element.append(keysList())
    container.append(this.element)
  }

  private choiceButton(key: 'visit.continue' | 'visit.startOver', className: string, chosen: () => void): HTMLButtonElement {
    const choice = button(className, text(key), () => {
      this.showTheWaitOn(choice)
      requestAnimationFrame(() => setTimeout(() => {
        chosen()
        this.element.remove()
      }, 0))
    })
    return choice
  }

  private showTheWaitOn(chosenButton: HTMLButtonElement): void {
    for (const choice of this.buttons) choice.disabled = true
    chosenButton.setAttribute('aria-busy', 'true')
    chosenButton.replaceChildren(pageElement('span', 'continue-spinner'))
    chosenButton.setAttribute('aria-label', text('visit.loading'))
  }
}

function hasAKeyboard(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function keysList(): HTMLElement {
  const keys = pageElement('dl', 'continue-keys')
  keys.setAttribute('aria-label', text('visit.keys.title'))
  for (const line of keyLines) {
    keys.append(pageElement('dt', '', text(line.keyKey)), pageElement('dd', '', text(line.actionKey)))
  }
  return keys
}
