import { text } from '../../Texts/Texts.ts'
import { achievementIds, type AchievementId } from '../Achievements.ts'

export type AchievementsListActions = {
  readonly resetAsked: () => void
}

export class AchievementsList {
  private readonly element: HTMLElement
  private readonly items: HTMLElement
  private readonly resetButton: HTMLButtonElement
  private readonly actions: AchievementsListActions
  private isResetArmed = false
  private outOfReach: ReadonlySet<AchievementId> = new Set()

  constructor(container: HTMLElement, actions: AchievementsListActions) {
    this.actions = actions
    this.element = document.createElement('div')
    this.element.className = 'achievements'
    this.element.hidden = true
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.hide()
    })
    const sheet = document.createElement('div')
    sheet.className = 'achievements-sheet'
    const title = document.createElement('h2')
    title.className = 'achievements-title'
    title.textContent = text('achievements.title')
    this.items = document.createElement('ul')
    this.items.className = 'achievements-items'
    const buttons = document.createElement('div')
    buttons.className = 'achievements-buttons'
    this.resetButton = this.button('achievements-reset', () => this.resetTapped())
    const closeButton = this.button('achievements-close', () => this.hide())
    closeButton.textContent = text('achievements.close')
    buttons.append(this.resetButton, closeButton)
    sheet.append(title, this.items, buttons)
    this.element.append(sheet)
    container.append(this.element)
  }

  show(unlocked: ReadonlySet<AchievementId>, outOfReach: ReadonlySet<AchievementId>): void {
    this.outOfReach = outOfReach
    this.items.replaceChildren(...achievementIds.map((id) => this.item(id, unlocked.has(id), outOfReach.has(id))))
    this.disarmTheReset()
    this.element.hidden = false
  }

  private hide(): void {
    this.element.hidden = true
  }

  private item(id: AchievementId, isUnlocked: boolean, isOutOfReach: boolean): HTMLElement {
    const item = document.createElement('li')
    item.className = isUnlocked ? 'achievement is-unlocked' : isOutOfReach ? 'achievement is-out-of-reach' : 'achievement'
    const title = document.createElement('span')
    title.className = 'achievement-title'
    title.textContent = text(`achievement.${id}.title`)
    item.append(title)
    if (!isUnlocked) return item
    const done = document.createElement('span')
    done.className = 'achievement-done'
    done.textContent = text(`achievement.${id}.done`)
    item.append(done)
    return item
  }

  private resetTapped(): void {
    if (!this.isResetArmed) {
      this.isResetArmed = true
      this.resetButton.textContent = text('achievements.resetAgain')
      return
    }
    this.actions.resetAsked()
    this.show(new Set(), this.outOfReach)
  }

  private disarmTheReset(): void {
    this.isResetArmed = false
    this.resetButton.textContent = text('achievements.reset')
  }

  private button(className: string, tapped: () => void): HTMLButtonElement {
    const button = document.createElement('button')
    button.className = className
    button.addEventListener('click', tapped)
    return button
  }
}
