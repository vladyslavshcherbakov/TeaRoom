import { text } from '../../Texts/Texts.ts'

export class YouDiedScreen {
  private readonly element: HTMLElement
  private readonly lastWords: HTMLElement
  private readonly obituary: HTMLElement

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
    const restartNote = document.createElement('p')
    restartNote.className = 'you-died-restart-note'
    restartNote.textContent = text('visit.startOverNote')
    const restartGroup = document.createElement('div')
    restartGroup.className = 'you-died-restart-group'
    restartGroup.append(restartButton, restartNote)
    this.element.append(band, this.obituary, restartGroup)
    container.append(this.element)
  }

  show(lastWords: string, obituary: string): void {
    this.lastWords.textContent = lastWords
    this.obituary.textContent = obituary
    this.element.hidden = false
    requestAnimationFrame(() => this.element.classList.add('is-shown'))
  }
}
