import { text } from '../../Texts/Texts.ts'

export class YouDiedScreen {
  private readonly element: HTMLElement

  constructor(container: HTMLElement, restart: () => void) {
    this.element = document.createElement('div')
    this.element.className = 'you-died'
    this.element.hidden = true
    const band = document.createElement('div')
    band.className = 'you-died-band'
    const title = document.createElement('h1')
    title.className = 'you-died-title'
    title.textContent = text('youDied.title')
    band.append(title)
    const restartButton = document.createElement('button')
    restartButton.className = 'you-died-restart'
    restartButton.textContent = text('youDied.restart')
    restartButton.addEventListener('click', restart)
    this.element.append(band, restartButton)
    container.append(this.element)
  }

  show(): void {
    this.element.hidden = false
    requestAnimationFrame(() => this.element.classList.add('is-shown'))
  }
}
