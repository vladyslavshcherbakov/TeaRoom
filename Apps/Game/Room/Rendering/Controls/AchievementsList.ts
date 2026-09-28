import { text } from '../../../Texts/Texts.ts'
import { achievementIds, type AchievementId } from '../../Achievements.ts'
import { button, pageElement, SheetOverTheScene } from '../../../../Engine/Rendering/Controls/PageControls.ts'

export type AchievementsListListener = {
  readonly resetAsked: () => void
}

export class AchievementsList {
  private readonly sheet: SheetOverTheScene
  private readonly items: HTMLElement
  private readonly resetButton: HTMLButtonElement
  private readonly listener: AchievementsListListener
  private isResetArmed = false

  constructor(container: HTMLElement, listener: AchievementsListListener) {
    this.listener = listener
    this.sheet = new SheetOverTheScene(container, 'achievements', 'achievements-sheet')
    this.items = pageElement('ul', 'achievements-items')
    const buttons = pageElement('div', 'achievements-buttons')
    this.resetButton = button('achievements-reset', text('achievements.reset'), () => this.resetTapped())
    buttons.append(this.resetButton, button('achievements-close', text('achievements.close'), () => this.sheet.hide()))
    this.sheet.sheet.append(pageElement('h2', 'achievements-title', text('achievements.title')), this.items, buttons)
  }

  show(unlocked: ReadonlySet<AchievementId>, outOfReach: ReadonlySet<AchievementId>): void {
    this.items.replaceChildren(...achievementIds.map((id) => this.item(id, unlocked.has(id), outOfReach.has(id))))
    this.disarmTheReset()
    this.sheet.show()
  }

  private item(id: AchievementId, isUnlocked: boolean, isOutOfReach: boolean): HTMLElement {
    const item = pageElement('li', isUnlocked ? 'achievement is-unlocked' : isOutOfReach ? 'achievement is-out-of-reach' : 'achievement')
    item.append(pageElement('span', 'achievement-title', text(`achievement.${id}.title`)))
    if (isUnlocked) item.append(pageElement('span', 'achievement-done', text(`achievement.${id}.done`)))
    return item
  }

  private resetTapped(): void {
    if (!this.isResetArmed) {
      this.isResetArmed = true
      this.resetButton.textContent = text('achievements.resetAgain')
      return
    }
    this.listener.resetAsked()
  }

  private disarmTheReset(): void {
    this.isResetArmed = false
    this.resetButton.textContent = text('achievements.reset')
  }
}
