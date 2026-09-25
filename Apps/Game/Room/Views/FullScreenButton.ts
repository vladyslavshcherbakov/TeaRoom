import { text } from '../../Texts/Texts.ts'
import type { RoomLog } from '../RoomNavigator.ts'

export class FullScreenButton {
  private readonly element: HTMLButtonElement
  private readonly log: RoomLog

  constructor(container: HTMLElement, log: RoomLog) {
    this.log = log
    this.element = document.createElement('button')
    this.element.className = 'full-screen'
    this.element.textContent = '⛶'
    this.element.hidden = !canGoFullScreen()
    this.element.addEventListener('click', () => this.toggle())
    document.addEventListener('fullscreenchange', () => this.showTheLabel())
    this.showTheLabel()
    container.append(this.element)
    log(this.element.hidden ? 'no full screen button: this is a touch device or the page may not go full screen' : 'the full screen button is shown')
  }

  private toggle(): void {
    if (document.fullscreenElement !== null) {
      this.log('leaving full screen from the button')
      void document.exitFullscreen()
      return
    }
    this.log('going full screen from the button')
    document.documentElement.requestFullscreen().catch((error: unknown) => this.log(`the page could not go full screen: ${String(error)}`))
  }

  private showTheLabel(): void {
    const label = text(document.fullscreenElement === null ? 'fullScreen.enter' : 'fullScreen.leave')
    this.element.setAttribute('aria-label', label)
    this.element.title = label
  }
}

function canGoFullScreen(): boolean {
  return document.fullscreenEnabled && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
