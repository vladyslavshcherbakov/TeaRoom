import { browserStorage } from '../BrowserStorage.ts'
import { text } from '../../Texts/Texts.ts'

export type PourControlsListener = {
  readonly tiltPressed: () => void
  readonly tiltReleased: () => void
}

const hintSeenStorageKey = 'aimHintSeen'
const svgNamespace = 'http://www.w3.org/2000/svg'
const potColour = '#e9cfa4'
const outlineColour = '#8f5a3a'
const bowlColour = '#fbf4e8'
const streamColour = '#5a9fc8'

export class PourControls {
  private readonly tiltButton: HTMLButtonElement
  private readonly hint: HTMLElement
  private isAiming = false

  constructor(container: HTMLElement, listener: PourControlsListener) {
    this.tiltButton = document.createElement('button')
    this.tiltButton.type = 'button'
    this.tiltButton.className = 'tilt'
    this.tiltButton.setAttribute('aria-label', text('aim.tiltButton'))
    this.tiltButton.append(pouringIcon())
    this.tiltButton.hidden = true
    this.tiltButton.addEventListener('pointerdown', (event) => {
      this.tiltButton.setPointerCapture(event.pointerId)
      listener.tiltPressed()
    })
    for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) this.tiltButton.addEventListener(ending, () => listener.tiltReleased())
    this.hint = document.createElement('div')
    this.hint.className = 'aim-hint'
    this.hint.textContent = text('aim.hint')
    this.hint.hidden = true
    container.append(this.tiltButton, this.hint)
  }

  show(isAiming: boolean): void {
    if (this.isAiming === isAiming) return
    this.isAiming = isAiming
    this.tiltButton.hidden = !isAiming
    if (isAiming) this.hint.hidden = wasHintSeen()
    if (!isAiming && !this.hint.hidden) rememberHintSeenIfStorageAllows()
    if (!isAiming) this.hint.hidden = true
  }
}

function wasHintSeen(): boolean {
  const stored = browserStorage.read(hintSeenStorageKey)
  return stored.kind === 'found' && stored.text === 'yes'
}

function rememberHintSeenIfStorageAllows(): void {
  browserStorage.keep(hintSeenStorageKey, 'yes')
}

function pouringIcon(): SVGSVGElement {
  const icon = document.createElementNS(svgNamespace, 'svg')
  icon.setAttribute('viewBox', '0 0 64 64')
  icon.setAttribute('aria-hidden', 'true')
  const tiltedKettle = document.createElementNS(svgNamespace, 'g')
  tiltedKettle.setAttribute('transform', 'rotate(35 24 26)')
  tiltedKettle.append(
    shape('path', { d: 'M11 23 Q4 28 11 34', fill: 'none', stroke: outlineColour, 'stroke-width': '3', 'stroke-linecap': 'round' }),
    shape('path', { d: 'M32 28 L42 20', fill: 'none', stroke: outlineColour, 'stroke-width': '4', 'stroke-linecap': 'round' }),
    shape('ellipse', { cx: '22', cy: '28', rx: '12', ry: '10', fill: potColour, stroke: outlineColour, 'stroke-width': '2.5' }),
    shape('rect', { x: '19', y: '15', width: '6', height: '4', rx: '1.5', fill: outlineColour }),
  )
  icon.append(
    shape('path', { d: 'M42 33 Q44 41 45 49', fill: 'none', stroke: streamColour, 'stroke-width': '3', 'stroke-linecap': 'round' }),
    tiltedKettle,
    shape('path', { d: 'M31 49 H59 Q56 61 45 61 Q34 61 31 49 Z', fill: bowlColour, stroke: outlineColour, 'stroke-width': '2.5', 'stroke-linejoin': 'round' }),
  )
  return icon
}

function shape(name: string, attributes: Readonly<Record<string, string>>): SVGElement {
  const element = document.createElementNS(svgNamespace, name)
  for (const [attribute, value] of Object.entries(attributes)) element.setAttribute(attribute, value)
  return element
}
