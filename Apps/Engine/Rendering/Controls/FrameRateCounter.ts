import { FrameRateShown } from '../../FrameRateShown.ts'

export class FrameRateCounter {
  private readonly element: HTMLElement
  private readonly readingOf: (framesPerSecond: number) => string
  private readonly frameRate = new FrameRateShown()

  constructor(container: HTMLElement, readingOf: (framesPerSecond: number) => string) {
    this.readingOf = readingOf
    this.element = container.ownerDocument.createElement('div')
    this.element.className = 'frame-rate'
    this.element.hidden = true
    container.append(this.element)
  }

  show(isShown: boolean): void {
    this.frameRate.show(isShown)
    this.element.hidden = !this.frameRate.isShown
    this.showTheReading()
  }

  frameDrawn(seconds: number): void {
    this.frameRate.frameDrawn(seconds)
    this.showTheReading()
  }

  private showTheReading(): void {
    const reading = this.frameRate.reading
    const readingText = reading === null ? '' : this.readingOf(reading)
    if (this.element.textContent !== readingText) this.element.textContent = readingText
  }
}
