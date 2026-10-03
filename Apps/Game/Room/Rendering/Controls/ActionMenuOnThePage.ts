import { text } from '../../../Texts/Texts.ts'
import type { ActionLabel, ActionMenuView } from '../../ActionMenu.ts'
import { actionText } from '../../Reactions/RoomTexts.ts'
import { actionIconSvg } from './ActionIcons.ts'
import { button, pageElement } from '../../../../Engine/Rendering/Controls/PageControls.ts'

const marginPixels = 16

export class ActionMenuOnThePage {
  private readonly menu: HTMLElement
  private readonly chosen: (index: number) => void
  private viewShown: ActionMenuView | null = null

  constructor(container: HTMLElement, chosen: (index: number) => void) {
    this.chosen = chosen
    this.menu = pageElement('div', 'action-menu')
    this.menu.setAttribute('role', 'menu')
    this.menu.setAttribute('aria-label', text('actionMenu.label'))
    this.menu.hidden = true
    container.append(this.menu)
  }

  show(view: ActionMenuView | null): void {
    if (view === this.viewShown) return
    this.viewShown = view
    this.menu.hidden = view === null
    if (view === null) return
    this.menu.replaceChildren(...view.labels.map((label, index) => actionButton(label, () => this.chosen(index))))
    this.placeNear(view)
  }

  private placeNear(view: ActionMenuView): void {
    const { width, height } = this.menu.getBoundingClientRect()
    const at = view.at ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.6 }
    this.menu.style.left = `${Math.round(Math.min(Math.max(at.x - width / 2, marginPixels), window.innerWidth - width - marginPixels))}px`
    this.menu.style.top = `${Math.round(Math.min(Math.max(at.y - height - marginPixels, marginPixels), window.innerHeight - height - marginPixels))}px`
  }
}

function actionButton(label: ActionLabel, chosen: () => void): HTMLButtonElement {
  const pressable = button('action-menu-action', actionText(label), chosen)
  pressable.insertAdjacentHTML('beforeend', actionIconSvg(label))
  return pressable
}
