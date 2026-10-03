import { text, textWith } from '../../../Texts/Texts.ts'
import type { AchievementId } from '../../Reactions/Achievements.ts'
import { FadingNotice } from '../../../../Engine/Rendering/Controls/PageControls.ts'

const noticeSeconds = 4

export class AchievementNotice {
  private readonly notice: FadingNotice
  private readonly waiting: AchievementId[] = []

  constructor(container: HTMLElement) {
    this.notice = new FadingNotice(container, 'achievement-notice', noticeSeconds)
  }

  announce(id: AchievementId): void {
    this.waiting.push(id)
    if (!this.notice.isShown) this.showTheNext()
  }

  dismissEveryNotice(): void {
    this.waiting.length = 0
    this.notice.hide()
  }

  advance(seconds: number): void {
    if (this.notice.advance(seconds)) this.showTheNext()
  }

  private showTheNext(): void {
    const id = this.waiting.shift()
    if (id === undefined) return
    this.notice.show(textWith('achievement.unlocked', { title: text(`achievement.${id}.title`) }))
  }
}
