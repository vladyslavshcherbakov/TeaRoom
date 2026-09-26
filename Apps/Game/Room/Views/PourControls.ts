import { browserStorage } from '../BrowserStorage.ts'
import { text } from '../../Texts/Texts.ts'

export type PourControlsListener = {
  readonly tiltPressed: () => void
  readonly tiltReleased: () => void
  readonly whyPouringAsked: () => void
}

const hintSeenStorageKey = 'aimHintSeen'
const svgNamespace = 'http://www.w3.org/2000/svg'
const leatherLight = '#5a2418'
const leatherDark = '#3b140c'
const gold = '#c9a24a'
const paleGold = '#f1d98c'
const parchmentLight = '#f7ecd2'
const parchmentDark = '#e2c996'
const clayLight = '#d08a58'
const clayDark = '#7a3a1e'
const clayOutline = '#4a2012'
const streamLight = '#d9eef8'
const streamDark = '#7fb6d6'
const glazeLight = '#fbf4e8'
const glazeDark = '#cdb99a'
const teaColour = '#b8862e'

export class PourControls {
  private readonly tiltButton: HTMLButtonElement
  private readonly whyButton: HTMLButtonElement
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
    this.whyButton = document.createElement('button')
    this.whyButton.type = 'button'
    this.whyButton.className = 'why-pouring'
    this.whyButton.setAttribute('aria-label', text('aim.whyButton'))
    this.whyButton.append(informationIcon())
    this.whyButton.hidden = true
    this.whyButton.addEventListener('click', () => listener.whyPouringAsked())
    this.hint = document.createElement('div')
    this.hint.className = 'aim-hint'
    this.hint.textContent = text('aim.hint')
    this.hint.hidden = true
    container.append(this.tiltButton, this.whyButton, this.hint)
  }

  show(isAiming: boolean): void {
    if (this.isAiming === isAiming) return
    this.isAiming = isAiming
    this.tiltButton.hidden = !isAiming
    this.whyButton.hidden = !isAiming
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
  const icon = medallion('pour', 64)
  const tiltedKettle = shape('g', { transform: 'rotate(32 25 27)' })
  tiltedKettle.append(
    shape('path', { d: 'M13 21 Q3 27 12 36', fill: 'none', stroke: clayOutline, 'stroke-width': '3.4', 'stroke-linecap': 'round' }),
    shape('path', { d: 'M34 30 Q40 27 44 19', fill: 'none', stroke: clayOutline, 'stroke-width': '5', 'stroke-linecap': 'round' }),
    shape('path', { d: 'M34 30 Q40 27 44 19', fill: 'none', stroke: clayLight, 'stroke-width': '2.6', 'stroke-linecap': 'round' }),
    shape('ellipse', { cx: '24', cy: '29', rx: '12.5', ry: '10.5', fill: 'url(#pour-clay)', stroke: clayOutline, 'stroke-width': '1.6' }),
    shape('path', { d: 'M15 23 Q24 18 33 23', fill: 'none', stroke: gold, 'stroke-width': '1.4', 'stroke-linecap': 'round' }),
    shape('ellipse', { cx: '19.5', cy: '25.5', rx: '4', ry: '2.2', fill: '#ffffff', opacity: '0.35', transform: 'rotate(-25 19.5 25.5)' }),
    shape('ellipse', { cx: '24', cy: '19.5', rx: '6.5', ry: '2.2', fill: clayDark, stroke: clayOutline, 'stroke-width': '1.2' }),
    shape('circle', { cx: '24', cy: '16.8', r: '2.2', fill: gold, stroke: clayOutline, 'stroke-width': '1' }),
  )
  const painting = shape('g', { transform: 'translate(3.5 3) scale(0.9)' })
  painting.append(
    shape('path', { d: 'M44.5 31 Q45.5 39 45.5 48', fill: 'none', stroke: 'url(#pour-stream)', 'stroke-width': '3.2', 'stroke-linecap': 'round' }),
    tiltedKettle,
    shape('path', { d: 'M31 48 H60 Q57.5 59.5 45.5 59.5 Q33.5 59.5 31 48 Z', fill: 'url(#pour-glaze)', stroke: clayOutline, 'stroke-width': '1.6', 'stroke-linejoin': 'round' }),
    shape('ellipse', { cx: '45.5', cy: '48', rx: '14.5', ry: '2.6', fill: teaColour, stroke: clayOutline, 'stroke-width': '1.2' }),
    shape('ellipse', { cx: '45.5', cy: '48', rx: '3.2', ry: '0.9', fill: streamLight, opacity: '0.8' }),
    shape('path', { d: 'M34.5 52 Q37 56.5 42 57.8', fill: 'none', stroke: '#ffffff', 'stroke-width': '1.3', 'stroke-linecap': 'round', opacity: '0.7' }),
  )
  icon.append(painting)
  return icon
}

function informationIcon(): SVGSVGElement {
  const icon = medallion('why', 64)
  icon.append(
    shape('circle', { cx: '32', cy: '32', r: '19', fill: 'none', stroke: gold, 'stroke-width': '1.2', 'stroke-dasharray': '1.5 3' }),
    shape('circle', { cx: '33', cy: '19.5', r: '3.6', fill: 'url(#why-gilding)', stroke: leatherDark, 'stroke-width': '0.8' }),
    shape('path', { d: 'M26 28 Q31 25.5 35.5 26.5 L32 43 Q31.2 46.5 34.5 45 L37.5 43.5 L37.8 45 Q33 49 29.3 48.2 Q26.4 47.5 27.3 43.5 L30 31 Q28 30.5 26.4 30.6 Z', fill: 'url(#why-gilding)', stroke: leatherDark, 'stroke-width': '0.8', 'stroke-linejoin': 'round' }),
  )
  return icon
}

function medallion(name: 'pour' | 'why', size: number): SVGSVGElement {
  const icon = document.createElementNS(svgNamespace, 'svg')
  icon.setAttribute('viewBox', `0 0 ${size} ${size}`)
  icon.setAttribute('aria-hidden', 'true')
  const definitions = shape('defs', {})
  definitions.append(
    radialGradient(`${name}-leather`, '38%', '30%', [[0, leatherLight], [1, leatherDark]]),
    radialGradient(`${name}-parchment`, '45%', '40%', [[0.55, parchmentLight], [1, parchmentDark]]),
    radialGradient('pour-clay', '35%', '30%', [[0, clayLight], [1, clayDark]]),
    linearGradient('pour-stream', [[0, streamLight], [1, streamDark]]),
    linearGradient('pour-glaze', [[0, glazeLight], [1, glazeDark]]),
    linearGradient('why-gilding', [[0, paleGold], [0.55, gold], [1, '#9a7426']]),
  )
  const centre = size / 2
  const isPour = name === 'pour'
  icon.append(
    definitions,
    shape('circle', { cx: `${centre}`, cy: `${centre}`, r: `${centre - 0.5}`, fill: `url(#${name}-leather)` }),
    shape('circle', { cx: `${centre}`, cy: `${centre}`, r: `${centre - 2.5}`, fill: 'none', stroke: gold, 'stroke-width': '1.6' }),
    shape('circle', { cx: `${centre}`, cy: `${centre}`, r: `${centre - 5}`, fill: isPour ? `url(#${name}-parchment)` : 'none', stroke: gold, 'stroke-width': '0.8' }),
  )
  return icon
}

function radialGradient(id: string, centreX: string, centreY: string, stops: readonly (readonly [number, string])[]): SVGElement {
  const gradient = shape('radialGradient', { id, cx: centreX, cy: centreY, r: '75%' })
  gradient.append(...stops.map(([offset, colour]) => shape('stop', { offset: `${offset}`, 'stop-color': colour })))
  return gradient
}

function linearGradient(id: string, stops: readonly (readonly [number, string])[]): SVGElement {
  const gradient = shape('linearGradient', { id, x1: '0', y1: '0', x2: '0.3', y2: '1' })
  gradient.append(...stops.map(([offset, colour]) => shape('stop', { offset: `${offset}`, 'stop-color': colour })))
  return gradient
}

function shape(name: string, attributes: Readonly<Record<string, string>>): SVGElement {
  const element = document.createElementNS(svgNamespace, name)
  for (const [attribute, value] of Object.entries(attributes)) element.setAttribute(attribute, value)
  return element
}
