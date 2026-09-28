import { text } from '../../../Texts/Texts.ts'
import type { StoreWithADefault } from '../../../../Engine/BrowserStorage.ts'
import { pageElement } from '../../../../Engine/Rendering/Controls/PageControls.ts'

export class AimHint {
  private readonly hint: HTMLElement
  private readonly hintStore: StoreWithADefault<boolean>
  private isAiming = false

  constructor(container: HTMLElement, hintStore: StoreWithADefault<boolean>) {
    this.hintStore = hintStore
    this.hint = pageElement('div', 'aim-hint', text('aim.hint'))
    this.hint.hidden = true
    container.append(this.hint)
  }

  show(isAiming: boolean): void {
    if (this.isAiming === isAiming) return
    this.isAiming = isAiming
    if (isAiming) this.hint.hidden = this.hintStore.load()
    if (!isAiming && !this.hint.hidden) this.hintStore.keep(true)
    if (!isAiming) this.hint.hidden = true
  }
}
