import { textWith } from '../../Texts/Texts.ts'
import { FrameRate } from '../FrameRate.ts'

export class FrameRateCounter {
  private readonly element: HTMLElement
  private frameRate: FrameRate | null = null

  constructor(container: HTMLElement) {
    this.element = container.ownerDocument.createElement('div')
    this.element.className = 'frame-rate'
    this.element.hidden = true
    container.append(this.element)
  }

  show(isShown: boolean): void {
    if (isShown === !this.element.hidden) return
    this.frameRate = isShown ? new FrameRate() : null
    this.element.hidden = !isShown
    this.element.textContent = ''
  }

  frameDrawn(seconds: number): void {
    const framesPerSecond = this.frameRate?.frameDrawn(seconds) ?? null
    if (framesPerSecond === null) return
    this.element.textContent = textWith('frameRate.reading', { framesPerSecond: String(Math.round(framesPerSecond)) })
  }
}
