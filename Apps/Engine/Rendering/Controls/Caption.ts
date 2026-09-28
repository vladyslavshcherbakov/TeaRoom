import { FadingNotice } from './PageControls.ts'

const captionSeconds = 9

export class Caption {
  private readonly notice: FadingNotice

  constructor(container: HTMLElement) {
    this.notice = new FadingNotice(container, 'caption', captionSeconds)
    this.notice.hideWhenPressed()
  }

  show(lines: readonly string[]): void {
    if (lines.length === 0) return
    this.notice.show(lines.join('\n'))
  }

  hide(): void {
    this.notice.hide()
  }

  advance(seconds: number): void {
    this.notice.advance(seconds)
  }
}
