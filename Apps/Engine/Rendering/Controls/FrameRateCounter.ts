import { FrameRate } from '../../FrameRate.ts'

export class FrameRateCounter {
  private readonly element: HTMLElement
  private readonly readingOf: (framesPerSecond: number) => string
  private frameRate: FrameRate | null = null

  constructor(container: HTMLElement, readingOf: (framesPerSecond: number) => string) {
    this.readingOf = readingOf
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
    this.element.textContent = this.readingOf(Math.round(framesPerSecond))
  }
}
