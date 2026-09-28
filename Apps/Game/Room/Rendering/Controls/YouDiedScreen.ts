import { text } from '../../../Texts/Texts.ts'
import { startOverNote } from '../../RoomTexts.ts'
import { button, pageElement } from '../../../../Engine/Rendering/Controls/PageControls.ts'

export class YouDiedScreen {
  private readonly element: HTMLElement
  private readonly lastWords: HTMLElement
  private readonly obituary: HTMLElement
  private readonly restartNote: HTMLElement

  constructor(container: HTMLElement, startOverTapped: () => void) {
    this.element = pageElement('div', 'you-died')
    this.element.hidden = true
    this.lastWords = pageElement('p', 'you-died-last-words')
    const band = pageElement('div', 'you-died-band')
    band.append(pageElement('h1', 'you-died-title', text('youDied.title')), this.lastWords)
    this.obituary = pageElement('p', 'you-died-obituary')
    this.restartNote = pageElement('p', 'you-died-restart-note')
    const restartGroup = pageElement('div', 'you-died-restart-group')
    restartGroup.append(button('you-died-restart', text('youDied.restart'), startOverTapped), this.restartNote)
    this.element.append(band, this.obituary, restartGroup)
    container.append(this.element)
  }

  show(lastWords: string, obituary: string, areAchievementsShown: boolean): void {
    this.lastWords.textContent = lastWords
    this.restartNote.textContent = startOverNote(areAchievementsShown)
    this.obituary.textContent = obituary
    this.element.hidden = false
    requestAnimationFrame(() => this.element.classList.add('is-shown'))
  }
}
