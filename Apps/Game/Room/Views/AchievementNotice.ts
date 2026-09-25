import { text, textWith } from '../../Texts/Texts.ts'
import type { AchievementId } from '../Achievements.ts'

const noticeSeconds = 4

export class AchievementNotice {
  private readonly element: HTMLElement
  private readonly waiting: AchievementId[] = []
  private secondsLeft = 0

  constructor(container: HTMLElement) {
    this.element = document.createElement('div')
    this.element.className = 'achievement-notice'
    this.element.hidden = true
    container.append(this.element)
  }

  announce(id: AchievementId): void {
    this.waiting.push(id)
    if (this.element.hidden) this.showTheNext()
  }

  advance(seconds: number): void {
    if (this.element.hidden) return
    this.secondsLeft -= seconds
    if (this.secondsLeft > 0) return
    this.element.hidden = true
    this.showTheNext()
  }

  private showTheNext(): void {
    const id = this.waiting.shift()
    if (id === undefined) return
    this.element.textContent = textWith('achievement.unlocked', { title: text(`achievement.${id}.title`) })
    this.element.hidden = false
    this.secondsLeft = noticeSeconds
  }
}
