const captionSeconds = 6

export class RoomCaption {
  private readonly element: HTMLElement
  private secondsLeft = 0

  constructor(container: HTMLElement) {
    this.element = document.createElement('div')
    this.element.className = 'caption'
    this.element.hidden = true
    container.append(this.element)
  }

  show(lines: readonly string[]): void {
    if (lines.length === 0) return
    this.element.textContent = lines.join('\n')
    this.element.hidden = false
    this.secondsLeft = captionSeconds
  }

  advance(seconds: number): void {
    if (this.element.hidden) return
    this.secondsLeft -= seconds
    if (this.secondsLeft <= 0) this.element.hidden = true
  }
}
