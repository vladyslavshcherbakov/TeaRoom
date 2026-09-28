import { icon, iconShape } from '../../../../Engine/Rendering/Controls/PageControls.ts'

const skyGlazeLight = '#cbe8f6'
const skyGlaze = '#9fd0ea'
const skyGlazeDeep = '#7fb7d6'
const skyGlazePaleRun = '#bae0f2'
const crackColour = '#4a6878'
const crackleLines = 'M4 27 L13 22 L20 27 L27 20 L35 25 L43 18 L51 23 L60 20 M13 22 L11 11 M27 20 L24 8 M43 18 L46 7 M20 27 L18 38 L6 42 M35 25 L37 36 L28 41 L18 38 M37 36 L48 34 L58 40 M48 34 L51 23 M28 41 L30 52 L19 56 M30 52 L41 54 L48 46 L58 40 M41 54 L43 62 M6 42 L11 52 L19 56'
const kintsugiPale = '#f6e3a0'
const kintsugiGold = '#d4a640'
const kintsugiDeep = '#9c7424'
const porcelainLight = '#fbf7ef'
const porcelainShade = '#d8cfc0'
const streamLight = '#f3fbff'
const streamShade = '#e3f3fb'
const teaColour = '#c7dd92'

export function pouringIcon(): SVGSVGElement {
  const drawing = glazedDisc('pour')
  const tiltedKettle = iconShape('g', { transform: 'rotate(28 25 29)' })
  tiltedKettle.append(
    iconShape('path', { d: 'M15.5 23 Q7.5 29 15 36', fill: 'none', stroke: crackColour, 'stroke-opacity': '0.55', 'stroke-width': '3', 'stroke-linecap': 'round' }),
    iconShape('path', { d: 'M32.5 27.5 Q37.5 27 40.8 21.2 Q42.6 20.4 44.2 22.4 Q41.5 32 34 35 Z', fill: 'url(#pour-porcelain)', stroke: crackColour, 'stroke-width': '0.7', 'stroke-opacity': '0.5' }),
    iconShape('ellipse', { cx: '25', cy: '30', rx: '11', ry: '9.5', fill: 'url(#pour-porcelain)', stroke: crackColour, 'stroke-width': '0.7', 'stroke-opacity': '0.5' }),
    iconShape('path', { d: 'M18 21.8 Q25 16.5 32 21.8 Z', fill: 'url(#pour-porcelain)', stroke: crackColour, 'stroke-width': '0.7', 'stroke-opacity': '0.5' }),
    iconShape('circle', { cx: '25', cy: '17.6', r: '2', fill: 'url(#pour-kintsugi)' }),
    iconShape('path', { d: 'M14.4 28 Q25 33.5 35.6 28', fill: 'none', stroke: 'url(#pour-kintsugi)', 'stroke-width': '1.1', 'stroke-linecap': 'round' }),
    iconShape('ellipse', { cx: '20.5', cy: '26', rx: '3.6', ry: '1.9', fill: '#ffffff', opacity: '0.8', transform: 'rotate(-28 20.5 26)' }),
  )
  drawing.append(
    iconShape('path', { d: 'M44.6 30.5 Q45.4 38 45.4 46.5', fill: 'none', stroke: crackColour, 'stroke-width': '3.6', 'stroke-linecap': 'round', opacity: '0.35' }),
    iconShape('path', { d: 'M44.6 30.5 Q45.4 38 45.4 46.5', fill: 'none', stroke: 'url(#pour-stream)', 'stroke-width': '2.4', 'stroke-linecap': 'round' }),
    tiltedKettle,
    iconShape('path', { d: 'M31.5 47 H59.3 Q57 57.8 45.4 57.8 Q33.8 57.8 31.5 47 Z', fill: 'url(#pour-porcelain)', stroke: crackColour, 'stroke-width': '0.7', 'stroke-opacity': '0.5' }),
    iconShape('ellipse', { cx: '45.4', cy: '47', rx: '13.9', ry: '2.3', fill: teaColour, stroke: crackColour, 'stroke-width': '0.7', 'stroke-opacity': '0.5' }),
    iconShape('path', { d: 'M35 51 Q37.5 55.3 42.5 56.4', fill: 'none', stroke: '#ffffff', 'stroke-width': '1.2', 'stroke-linecap': 'round', opacity: '0.85' }),
  )
  drawing.append(gloss('pour'))
  return drawing
}

export function informationIcon(): SVGSVGElement {
  const drawing = glazedDisc('why')
  drawing.append(
    iconShape('circle', { cx: '32', cy: '19', r: '3.6', fill: crackColour }),
    iconShape('rect', { x: '29', y: '26.5', width: '6', height: '20', rx: '3', fill: crackColour }),
    gloss('why'),
  )
  return drawing
}

function glazedDisc(name: 'pour' | 'why'): SVGSVGElement {
  const disc = icon('0 0 64 64')
  const definitions = iconShape('defs', {})
  definitions.append(
    radialGradient(`${name}-glaze`, '40%', '32%', '72%', [[0, skyGlazeLight], [0.5, skyGlaze], [0.86, skyGlazeDeep], [1, skyGlazePaleRun]]),
    linearGradient(`${name}-gloss`, '0', '0', '0', '1', [[0, 'rgba(255,255,255,0.75)'], [1, 'rgba(255,255,255,0)']]),
    linearGradient(`${name}-kintsugi`, '0', '0', '1', '1', [[0, kintsugiPale], [0.5, kintsugiGold], [1, kintsugiDeep]]),
    radialGradient(`${name}-porcelain`, '35%', '30%', '80%', [[0, porcelainLight], [0.7, porcelainLight], [1, porcelainShade]]),
    linearGradient(`${name}-stream`, '0', '0', '0', '1', [[0, streamLight], [1, streamShade]]),
    discClip(`${name}-disc`),
  )
  disc.append(
    definitions,
    iconShape('circle', { cx: '32', cy: '32', r: '30.6', fill: `url(#${name}-glaze)` }),
    iconShape('path', { d: crackleLines, fill: 'none', stroke: crackColour, 'stroke-width': '0.55', 'stroke-linejoin': 'round', opacity: '0.35', 'clip-path': `url(#${name}-disc)` }),
    iconShape('circle', { cx: '32', cy: '32', r: '30.4', fill: 'none', stroke: '#ffffff', 'stroke-width': '1.2', opacity: '0.6' }),
    iconShape('circle', { cx: '32', cy: '32', r: '28.6', fill: 'none', stroke: '#ffffff', 'stroke-width': '0.6', opacity: '0.25' }),
  )
  return disc
}

function discClip(id: string): SVGElement {
  const clip = iconShape('clipPath', { id })
  clip.append(iconShape('circle', { cx: '32', cy: '32', r: '30' }))
  return clip
}

function gloss(name: 'pour' | 'why'): SVGElement {
  return iconShape('ellipse', { cx: '25', cy: '15', rx: '17', ry: '8', fill: `url(#${name}-gloss)`, transform: 'rotate(-24 25 15)', opacity: '0.7' })
}

function radialGradient(id: string, centreX: string, centreY: string, radius: string, stops: readonly (readonly [number, string])[]): SVGElement {
  const gradient = iconShape('radialGradient', { id, cx: centreX, cy: centreY, r: radius })
  gradient.append(...stops.map(([offset, colour]) => iconShape('stop', { offset: `${offset}`, 'stop-color': colour })))
  return gradient
}

function linearGradient(id: string, fromX: string, fromY: string, toX: string, toY: string, stops: readonly (readonly [number, string])[]): SVGElement {
  const gradient = iconShape('linearGradient', { id, x1: fromX, y1: fromY, x2: toX, y2: toY })
  gradient.append(...stops.map(([offset, colour]) => iconShape('stop', { offset: `${offset}`, 'stop-color': colour })))
  return gradient
}
