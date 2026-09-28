import { text } from '../../../Texts/Texts.ts'
import type { AppLog } from '../../../../Engine/AppLog.ts'
import { icon, iconButton, iconShape } from '../../../../Engine/Rendering/Controls/PageControls.ts'

export class FullScreenButton {
  private readonly element: HTMLButtonElement
  private readonly log: AppLog

  constructor(container: HTMLElement, log: AppLog) {
    this.log = log
    this.element = iconButton('corner-button', text('fullScreen.enter'), icon('0 0 24 24', iconShape('path', { d: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5' })))
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
      document.exitFullscreen().catch((error: unknown) => this.log(`the page could not leave full screen: ${String(error)}`))
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
