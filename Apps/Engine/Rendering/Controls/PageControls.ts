const svgNamespace = 'http://www.w3.org/2000/svg'

export type ToggleRow = {
  readonly element: HTMLElement
  readonly checkbox: HTMLInputElement
}

export type ChoiceRow<Value> = {
  readonly element: HTMLElement
  readonly showTheChosen: (chosen: Value) => void
  readonly showEveryChosen: (chosen: readonly Value[]) => void
}

export type ChoiceLook<Value> = {
  readonly rowClass: string
  readonly buttonClass: string
  readonly dress: (button: HTMLButtonElement, value: Value) => void
}

export type Holding = {
  readonly held: () => void
  readonly letGo: () => void
}

export function pageElement<Tag extends keyof HTMLElementTagNameMap>(tag: Tag, className: string, words: string | null = null): HTMLElementTagNameMap[Tag] {
  const element = document.createElement(tag)
  if (className !== '') element.className = className
  if (words !== null) element.textContent = words
  return element
}

export function button(className: string, label: string, tapped: () => void): HTMLButtonElement {
  const pressable = pageElement('button', className, label)
  pressable.type = 'button'
  pressable.addEventListener('click', tapped)
  return pressable
}

export function iconButton(className: string, label: string, shownIcon: SVGSVGElement): HTMLButtonElement {
  const pressable = pageElement('button', className)
  pressable.type = 'button'
  pressable.setAttribute('aria-label', label)
  pressable.title = label
  pressable.append(shownIcon)
  return pressable
}

export function actWhileHeld(pressable: HTMLButtonElement, holding: Holding): void {
  let isHeld = false
  const letGo = (): void => {
    if (!isHeld) return
    isHeld = false
    holding.letGo()
  }
  pressable.addEventListener('pointerdown', (event) => {
    pressable.setPointerCapture(event.pointerId)
    isHeld = true
    holding.held()
  })
  for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) pressable.addEventListener(ending, letGo)
  pressable.addEventListener('click', (event) => {
    if (event.detail !== 0) return
    holding.held()
    holding.letGo()
  })
}

export function actWhenLifted(pressable: HTMLButtonElement, lifted: () => void): void {
  let pressingPointerId: number | null = null
  pressable.addEventListener('pointerdown', (event) => (pressingPointerId = event.pointerId))
  pressable.addEventListener('pointerup', (event) => {
    if (event.pointerId !== pressingPointerId) return
    pressingPointerId = null
    lifted()
  })
  for (const letGo of ['pointercancel', 'pointerleave'] as const) pressable.addEventListener(letGo, () => (pressingPointerId = null))
  pressable.addEventListener('click', (event) => {
    if (event.detail === 0) lifted()
  })
}

export function toggleRow(className: string, label: string, chosen: (isOn: boolean) => void): ToggleRow {
  const checkbox = pageElement('input', '')
  checkbox.type = 'checkbox'
  checkbox.addEventListener('change', () => chosen(checkbox.checked))
  const row = pageElement('label', className)
  row.append(checkbox, document.createTextNode(label))
  return { element: row, checkbox }
}

export function choiceRow<Value>(values: readonly Value[], look: ChoiceLook<Value>, chosen: (value: Value) => void): ChoiceRow<Value> {
  const row = pageElement('div', look.rowClass)
  const showEveryChosen = (chosenValues: readonly Value[]): void => buttons.forEach((choice, index) => choice.setAttribute('aria-pressed', String(chosenValues.some((chosenValue) => chosenValue === values[index]))))
  const showTheChosen = (chosenValue: Value): void => showEveryChosen([chosenValue])
  const buttons = values.map((value) => {
    const choice = pageElement('button', look.buttonClass)
    look.dress(choice, value)
    choice.addEventListener('click', () => {
      showTheChosen(value)
      chosen(value)
    })
    return choice
  })
  row.append(...buttons)
  return { element: row, showTheChosen, showEveryChosen }
}

export function icon(viewBox: string, ...parts: SVGElement[]): SVGSVGElement {
  const drawing = document.createElementNS(svgNamespace, 'svg')
  drawing.setAttribute('viewBox', viewBox)
  drawing.setAttribute('aria-hidden', 'true')
  drawing.append(...parts)
  return drawing
}

export function iconShape(name: string, attributes: Readonly<Record<string, string>>): SVGElement {
  const shape = document.createElementNS(svgNamespace, name)
  for (const [attribute, value] of Object.entries(attributes)) shape.setAttribute(attribute, value)
  return shape
}

export class SheetOverTheScene {
  readonly element: HTMLElement
  readonly sheet: HTMLElement

  constructor(container: HTMLElement, className: string, sheetClassName: string) {
    this.element = pageElement('div', className)
    this.element.hidden = true
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.hide()
    })
    this.sheet = pageElement('div', sheetClassName)
    this.element.append(this.sheet)
    container.append(this.element)
  }

  get isShown(): boolean {
    return !this.element.hidden
  }

  show(): void {
    this.element.hidden = false
  }

  hide(): void {
    this.element.hidden = true
  }
}

export class FadingNotice {
  private readonly element: HTMLElement
  private readonly shownSeconds: number
  private secondsLeft = 0

  constructor(container: HTMLElement, className: string, shownSeconds: number) {
    this.element = pageElement('div', className)
    this.element.hidden = true
    this.shownSeconds = shownSeconds
    container.append(this.element)
  }

  get isShown(): boolean {
    return !this.element.hidden
  }

  hideWhenPressed(): void {
    this.element.addEventListener('pointerdown', () => this.hide())
  }

  show(words: string): void {
    this.element.textContent = words
    this.element.hidden = false
    this.secondsLeft = this.shownSeconds
  }

  hide(): void {
    this.element.hidden = true
    this.secondsLeft = 0
  }

  advance(seconds: number): boolean {
    if (this.element.hidden) return false
    this.secondsLeft -= seconds
    if (this.secondsLeft > 0) return false
    this.element.hidden = true
    return true
  }
}
