import { text } from '../../Texts/Texts.ts'
import { startOverNote } from '../RoomTexts.ts'

export class YouDiedScreen {
  private readonly element: HTMLElement
  private readonly lastWords: HTMLElement
  private readonly obituary: HTMLElement
  private readonly restartNote: HTMLElement

  constructor(container: HTMLElement, restart: () => void) {
    this.element = document.createElement('div')
    this.element.className = 'you-died'
    this.element.hidden = true
    const band = document.createElement('div')
    band.className = 'you-died-band'
    const title = document.createElement('h1')
    title.className = 'you-died-title'
    title.textContent = text('youDied.title')
    this.lastWords = document.createElement('p')
    this.lastWords.className = 'you-died-last-words'
    band.append(title, this.lastWords)
    this.obituary = document.createElement('p')
    this.obituary.className = 'you-died-obituary'
    const restartButton = document.createElement('button')
    restartButton.className = 'you-died-restart'
    restartButton.textContent = text('youDied.restart')
    restartButton.addEventListener('click', restart)
    this.restartNote = document.createElement('p')
    this.restartNote.className = 'you-died-restart-note'
    const restartGroup = document.createElement('div')
    restartGroup.className = 'you-died-restart-group'
    restartGroup.append(restartButton, this.restartNote)
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
