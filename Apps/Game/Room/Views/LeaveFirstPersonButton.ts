import { text } from '../../Texts/Texts.ts'

const svgNamespace = 'http://www.w3.org/2000/svg'

export class LeaveFirstPersonButton {
  private readonly element: HTMLButtonElement
  private pressingPointerId: number | null = null

  constructor(container: HTMLElement, leaveAsked: () => void) {
    this.element = document.createElement('button')
    this.element.className = 'corner-button'
    this.element.append(doorwayIcon())
    this.element.hidden = true
    const label = text('firstPerson.leave')
    this.element.setAttribute('aria-label', label)
    this.element.title = label
    this.element.addEventListener('pointerdown', (event) => (this.pressingPointerId = event.pointerId))
    this.element.addEventListener('pointerup', (event) => {
      if (event.pointerId !== this.pressingPointerId) return
      this.pressingPointerId = null
      leaveAsked()
    })
    for (const letGo of ['pointercancel', 'pointerleave'] as const) this.element.addEventListener(letGo, () => (this.pressingPointerId = null))
    this.element.addEventListener('click', (event) => {
      if (event.detail === 0) leaveAsked()
    })
    container.append(this.element)
  }

  show(isShown: boolean): void {
    this.element.hidden = !isShown
  }
}

function doorwayIcon(): SVGSVGElement {
  const icon = document.createElementNS(svgNamespace, 'svg')
  icon.setAttribute('viewBox', '0 0 24 24')
  icon.setAttribute('aria-hidden', 'true')
  const doorwayAndArrow = document.createElementNS(svgNamespace, 'path')
  doorwayAndArrow.setAttribute('d', 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10')
  icon.append(doorwayAndArrow)
  return icon
}
