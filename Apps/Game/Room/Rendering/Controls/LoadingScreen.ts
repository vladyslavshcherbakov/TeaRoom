import { text } from '../../../Texts/Texts.ts'
import { pageElement } from '../../../../Engine/Rendering/Controls/PageControls.ts'

export class LoadingScreen {
  private readonly element: HTMLElement

  constructor(container: HTMLElement) {
    this.element = pageElement('div', 'loading')
    this.element.setAttribute('role', 'status')
    this.element.append(pageElement('span', 'loading-spinner'), pageElement('p', 'loading-text', text('visit.loading')))
    container.append(this.element)
  }

  hide(): void {
    this.element.remove()
  }
}
