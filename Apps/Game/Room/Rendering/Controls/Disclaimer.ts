import { text } from '../../../Texts/Texts.ts'
import { button, icon, iconShape, pageElement } from '../../../../Engine/Rendering/Controls/PageControls.ts'
import { soundLoudnessChoiceOnThePage, type SoundLoudnessChoice } from './SoundLoudnessChoice.ts'

type Daisy = {
  readonly x: number
  readonly y: number
  readonly size: number
}

const daisyPetals = 8
const porcelain = 'url(#disclaimer-porcelain)'
const porcelainEdge = '#b9ab98'
const gold = '#c9a24a'
const letterBrown = '#6b4226'
const vineGreen = '#6f9a58'
const leafGreen = '#86b168'

export class Disclaimer {
  private readonly element: HTMLElement

  constructor(container: HTMLElement, read: () => void, soundLoudnessChoice: SoundLoudnessChoice) {
    this.element = pageElement('div', 'disclaimer')
    const card = pageElement('div', 'disclaimer-card')
    card.setAttribute('role', 'dialog')
    card.setAttribute('aria-modal', 'true')
    card.setAttribute('aria-label', text('disclaimer.title'))
    const okButton = teapotOkButton(() => {
      this.element.remove()
      read()
    })
    card.append(
      cornerVine('disclaimer-vine disclaimer-vine-top'),
      cornerVine('disclaimer-vine disclaimer-vine-bottom'),
      title(),
      pageElement('p', 'disclaimer-text', text('disclaimer.firstParagraph')),
      pageElement('p', 'disclaimer-text', text('disclaimer.secondParagraph')),
      farewell(),
      okButton,
      pageElement('p', 'disclaimer-footnote', text('disclaimer.footnote')),
      soundLoudnessChoiceOnThePage(soundLoudnessChoice),
    )
    this.element.append(card)
    container.append(this.element)
  }
}

function title(): HTMLElement {
  return pageElement('h2', 'disclaimer-title', text('disclaimer.title'))
}

function teapotOkButton(tapped: () => void): HTMLButtonElement {
  const okButton = button('disclaimer-ok', '', tapped)
  okButton.setAttribute('aria-label', text('disclaimer.ok'))
  const teapot = teapotLetterO()
  teapot.classList.add('disclaimer-teapot')
  const k = floweredLetterK()
  k.classList.add('disclaimer-k')
  okButton.append(teapot, k)
  return okButton
}

function farewell(): HTMLElement {
  const line = pageElement('p', 'disclaimer-farewell')
  line.append(sprig(), pageElement('span', '', text('disclaimer.farewell')), sprig())
  return line
}

function teapotLetterO(): SVGSVGElement {
  return icon(
    '0 0 64 56',
    porcelainShading(),
    iconShape('path', { d: 'M50 25 C63 22 63 45 48 42', fill: 'none', stroke: gold, 'stroke-width': '3.2', 'stroke-linecap': 'round' }),
    iconShape('path', { d: 'M15 31 C8 29 6 22 2 17.5 L5.2 15.8 C9.5 21 12 24.5 17 25.5 Z', fill: porcelain, stroke: porcelainEdge, 'stroke-width': '0.8' }),
    iconShape('ellipse', { cx: '32', cy: '50', rx: '10', ry: '2.4', fill: '#e6ddd0', stroke: porcelainEdge, 'stroke-width': '0.6' }),
    iconShape('ellipse', { cx: '32', cy: '34', rx: '19', ry: '16.5', fill: porcelain, stroke: porcelainEdge, 'stroke-width': '0.8' }),
    iconShape('path', { d: 'M17 44 Q32 51 47 44', fill: 'none', stroke: gold, 'stroke-width': '1.1' }),
    iconShape('path', { d: 'M21 19.8 Q32 7 43 19.8 Z', fill: porcelain, stroke: porcelainEdge, 'stroke-width': '0.8' }),
    iconShape('ellipse', { cx: '32', cy: '19.8', rx: '11.5', ry: '2.4', fill: 'none', stroke: gold, 'stroke-width': '1.3' }),
    iconShape('circle', { cx: '32', cy: '10.4', r: '3', fill: porcelain, stroke: gold, 'stroke-width': '1' }),
    blueFlowerAt(32, 34),
    iconShape('ellipse', { cx: '24', cy: '26', rx: '5', ry: '2.6', fill: '#ffffff', opacity: '0.75', transform: 'rotate(-35 24 26)' }),
  )
}

function porcelainShading(): SVGElement {
  const defs = iconShape('defs', {})
  const gradient = iconShape('radialGradient', { id: 'disclaimer-porcelain', cx: '0.35', cy: '0.3', r: '0.85' })
  gradient.append(iconShape('stop', { offset: '0', 'stop-color': '#ffffff' }), iconShape('stop', { offset: '0.55', 'stop-color': '#f5f1ea' }), iconShape('stop', { offset: '1', 'stop-color': '#d8d0c3' }))
  defs.append(gradient)
  return defs
}

function blueFlowerAt(x: number, y: number): SVGElement {
  const flower = iconShape('g', {})
  for (let petal = 0; petal < 5; petal += 1) {
    const turnRadians = (petal / 5) * Math.PI * 2 - Math.PI / 2
    flower.append(iconShape('circle', { cx: (x + Math.cos(turnRadians) * 3).toFixed(2), cy: (y + Math.sin(turnRadians) * 3).toFixed(2), r: '2.2', fill: '#8aa0d2', opacity: '0.9' }))
  }
  flower.append(iconShape('circle', { cx: String(x), cy: String(y), r: '1.3', fill: '#e9c85a' }))
  return flower
}

function floweredLetterK(): SVGSVGElement {
  const letter = { fill: 'none', stroke: letterBrown, 'stroke-width': '8', 'stroke-linecap': 'round' }
  return icon(
    '0 0 44 60',
    iconShape('path', { d: 'M11 8 L11 52', ...letter }),
    iconShape('path', { d: 'M34 8 L14 31', ...letter }),
    iconShape('path', { d: 'M19 26 L36 52', ...letter }),
    iconShape('path', { d: 'M4 56 C16 50 4 42 14 36 C22 31 6 24 15 16 C21 10 28 18 36 4 M22 30 C28 36 30 42 41 45', fill: 'none', stroke: vineGreen, 'stroke-width': '1.6', 'stroke-linecap': 'round' }),
    leafAt(6, 46, -40),
    leafAt(18, 22, 35),
    leafAt(29, 40, 60),
    leafAt(30, 12, -30),
    ...[{ x: 8, y: 14, size: 1 }, { x: 16, y: 34, size: 1.1 }, { x: 36, y: 6, size: 1 }, { x: 38, y: 46, size: 0.9 }, { x: 7, y: 54, size: 0.8 }].map(daisyAt),
  )
}

function cornerVine(className: string): SVGSVGElement {
  const vine = icon(
    '0 0 96 96',
    iconShape('path', { d: 'M4 92 C6 60 14 40 30 26 C44 14 62 8 92 4 M16 52 C24 50 28 44 28 38 M44 16 C46 22 52 26 58 26', fill: 'none', stroke: vineGreen, 'stroke-width': '1.8', 'stroke-linecap': 'round' }),
    leafAt(9, 70, -70),
    leafAt(20, 40, -45),
    leafAt(36, 22, -20),
    leafAt(70, 9, 10),
    leafAt(26, 46, 30),
    ...[{ x: 6, y: 84, size: 1.1 }, { x: 28, y: 36, size: 1.2 }, { x: 58, y: 26, size: 1 }, { x: 84, y: 6, size: 1.1 }].map(daisyAt),
  )
  vine.setAttribute('class', className)
  return vine
}

function sprig(): SVGSVGElement {
  const sprigIcon = icon('0 0 28 16', iconShape('path', { d: 'M2 10 C8 12 14 10 20 8', fill: 'none', stroke: vineGreen, 'stroke-width': '1.4', 'stroke-linecap': 'round' }), leafAt(7, 12, 20), leafAt(13, 7, -30), daisyAt({ x: 21, y: 8, size: 1.1 }))
  sprigIcon.setAttribute('class', 'disclaimer-sprig')
  return sprigIcon
}

function leafAt(x: number, y: number, turnDegrees: number): SVGElement {
  return iconShape('ellipse', { cx: String(x), cy: String(y), rx: '4', ry: '1.8', fill: leafGreen, transform: `rotate(${turnDegrees} ${x} ${y})` })
}

function daisyAt(daisy: Daisy): SVGElement {
  const flower = iconShape('g', {})
  for (let petal = 0; petal < daisyPetals; petal += 1) {
    const turnDegrees = (petal / daisyPetals) * 360
    flower.append(iconShape('ellipse', { cx: String(daisy.x), cy: (daisy.y - 2.6 * daisy.size).toFixed(2), rx: (1.1 * daisy.size).toFixed(2), ry: (2.2 * daisy.size).toFixed(2), fill: '#ffffff', stroke: '#e3d9c7', 'stroke-width': '0.4', transform: `rotate(${turnDegrees} ${daisy.x} ${daisy.y})` }))
  }
  flower.append(iconShape('circle', { cx: String(daisy.x), cy: String(daisy.y), r: (1.5 * daisy.size).toFixed(2), fill: '#f0c54a' }))
  return flower
}
