import { text } from '../../../Texts/Texts.ts'
import { screenButtons, type ScreenButton } from '../../ScreenButton.ts'
import { screenButtonRules, type ScreenButtonPress } from '../../ScreenControls.ts'
import { actWhenLifted, actWhileHeld, icon, iconButton, iconShape } from '../../../../Engine/Rendering/Controls/PageControls.ts'
import { informationIcon, pouringIcon } from './PourIcons.ts'

export type ScreenButtonsListener = {
  readonly pressed: (button: ScreenButton) => void
  readonly letGo: (button: ScreenButton) => void
}

export type ScreenButtonPlaces = {
  readonly overTheRoom: HTMLElement
  readonly inTheCorner: HTMLElement
}

type ScreenButtonLook = {
  readonly element: () => HTMLButtonElement
  readonly place: keyof ScreenButtonPlaces
}

const lookByButton: Readonly<Record<ScreenButton, ScreenButtonLook>> = {
  tilt: { element: () => iconButton('tilt', text('aim.tiltButton'), pouringIcon()), place: 'overTheRoom' },
  whyPouring: { element: () => iconButton('why-pouring', text('aim.whyButton'), informationIcon()), place: 'overTheRoom' },
  leaveFirstPerson: { element: () => iconButton('corner-button', text('firstPerson.leave'), icon('0 0 24 24', iconShape('path', { d: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10' }))), place: 'inTheCorner' },
}

export class ScreenButtonsOnThePage {
  private readonly elementByButton: ReadonlyMap<ScreenButton, HTMLButtonElement>

  constructor(places: ScreenButtonPlaces, listener: ScreenButtonsListener) {
    this.elementByButton = new Map(screenButtons.map((button) => [button, this.buttonOnThePage(button, places, listener)]))
  }

  show(isShownByButton: Readonly<Record<ScreenButton, boolean>>): void {
    for (const [button, element] of this.elementByButton) {
      const isHidden = !isShownByButton[button]
      if (element.hidden !== isHidden) element.hidden = isHidden
    }
  }

  private buttonOnThePage(button: ScreenButton, places: ScreenButtonPlaces, listener: ScreenButtonsListener): HTMLButtonElement {
    const look = lookByButton[button]
    const element = look.element()
    element.hidden = true
    actOn(element, screenButtonRules[button].press, () => listener.pressed(button), () => listener.letGo(button))
    places[look.place].append(element)
    return element
  }
}

function actOn(element: HTMLButtonElement, press: ScreenButtonPress, pressed: () => void, letGo: () => void): void {
  switch (press) {
    case 'tap':
      return element.addEventListener('click', pressed)
    case 'hold':
      return actWhileHeld(element, { held: pressed, letGo })
    case 'lift':
      return actWhenLifted(element, pressed)
  }
}
