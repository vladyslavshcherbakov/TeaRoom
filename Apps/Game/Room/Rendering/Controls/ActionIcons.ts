import type { ActionKind, ActionLabel } from '../../ActionMenu.ts'
import type { CarriedShape } from '../../CarriedShapes.ts'

type Placed = { readonly x: number; readonly baseY: number; readonly size: number; readonly turnDegrees: number }

const iconWidth = 40
const iconHeight = 30
const iconDrawnScale = 1.4
const itemColour = '#6b4a35'
const waterColour = '#4a90c8'
const leavesColour = '#6a9a4a'
const heatColour = '#d0553a'
const woodColour = '#c08a55'

type Hinge = { readonly x: number; readonly y: number; readonly opening: string }
type Silhouette = { readonly body: string; readonly lid: string | null; readonly hinge: Hinge | null }

const openingColour = '#2e2018'
const lidOpenDegrees = -65

const silhouetteByShape: Readonly<Record<CarriedShape, Silhouette>> = {
  kettle: {
    body: '<circle cx="12" cy="15" r="7"/><path d="M18 13 L23 9 L22 12 L19 17 Z"/><path d="M5 12 Q1 15 5 19" fill="none" stroke-width="2"/>',
    lid: '<rect x="9" y="6" width="6" height="2" rx="1"/><circle cx="12" cy="5" r="1.5"/>',
    hinge: { x: 9, y: 8, opening: '<ellipse cx="12" cy="8.6" rx="3" ry="1"/>' },
  },
  thermos: {
    body: '<rect x="8" y="6" width="8" height="18" rx="2"/>',
    lid: '<rect x="9" y="1" width="6" height="4" rx="1"/>',
    hinge: { x: 9, y: 5, opening: '<ellipse cx="12" cy="6.4" rx="2.6" ry="0.9"/>' },
  },
  caddy: {
    body: '<rect x="6" y="9" width="12" height="15" rx="1.5"/>',
    lid: '<rect x="5.5" y="6" width="13" height="3" rx="1"/><rect x="11" y="4" width="2" height="2"/>',
    hinge: { x: 5.5, y: 9, opening: '<ellipse cx="12" cy="9.6" rx="5" ry="1"/>' },
  },
  bowl: { body: '<path d="M3 13 H21 Q20 23 12 24 Q4 23 3 13 Z"/>', lid: null, hinge: null },
  spoon: { body: '<ellipse cx="17" cy="20" rx="4" ry="2.6"/><path d="M14 20 L3 22 L3 21 L14 19 Z"/>', lid: null, hinge: null },
  cloth: { body: '<path d="M3 18 L19 15 L21 22 L5 24 Z"/><path d="M5 20 L20 17" stroke="#f3ead8" stroke-width="1"/>', lid: null, hinge: null },
}

const scenesByKind: Readonly<Record<ActionKind, (label: ActionLabel) => string>> = {
  take: () => hand(),
  putAway: (label) => itemOnABoard(label.item),
  openTheLid: (label) => itemWithItsLidOpen(label.item, { x: 20, baseY: 29, size: 24, turnDegrees: 0 }),
  sip: (label) => `${item(label.item, { x: 15, baseY: 25, size: 18, turnDegrees: 35 })}${mouth(32, 12)}`,
  pourInto: (label) => `${item(label.item, { x: 11, baseY: 15, size: 14, turnDegrees: 45 })}${stream(19, 12, 26, 20)}${item(label.target ?? label.item, { x: 28, baseY: 29, size: 13, turnDegrees: 0 })}`,
  scoopFrom: (label) => `${item(label.target ?? 'caddy', { x: 15, baseY: 29, size: 18, turnDegrees: 0 })}${item('spoon', { x: 28, baseY: 13, size: 14, turnDegrees: -20 })}${leaves(30, 6)}`,
  tipLeavesInto: (label) => `${item('spoon', { x: 12, baseY: 12, size: 14, turnDegrees: 30 })}${fallingLeaves(20, 11)}${item(label.target ?? 'bowl', { x: 26, baseY: 29, size: 14, turnDegrees: 0 })}`,
  putDownHere: (label) => itemOnABoard(label.item),
  putOnTheHeater: (label) => `${item(label.item, { x: 18, baseY: 22, size: 17, turnDegrees: 0 })}${heater(6, 30, 22)}`,
  putInTheSink: (label) => `${basin(7, 33)}${item(label.item, { x: 20, baseY: 26, size: 14, turnDegrees: 0 })}`,
  fillWithWater: (label) => `${faucet(20, 2)}${drops(25, 9)}${item(label.item, { x: 20, baseY: 29, size: 15, turnDegrees: 0 })}`,
  wash: (label) => `${item(label.item, { x: 16, baseY: 28, size: 19, turnDegrees: 0 })}${bubbles(29, 6)}`,
}

export function actionIconSvg(label: ActionLabel): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${iconWidth} ${iconHeight}" width="${iconWidth * iconDrawnScale}" height="${iconHeight * iconDrawnScale}" aria-hidden="true">${scenesByKind[label.kind](label)}</svg>`
}

function item(shape: CarriedShape, placed: Placed): string {
  const { body, lid } = silhouetteByShape[shape]
  return inItsPlace(`${body}${lid ?? ''}`, placed)
}

function itemWithItsLidOpen(shape: CarriedShape, placed: Placed): string {
  const { body, lid, hinge } = silhouetteByShape[shape]
  if (lid === null || hinge === null) return inItsPlace(body, placed)
  const lidOnItsHinge = `<g transform="rotate(${lidOpenDegrees} ${hinge.x} ${hinge.y})">${lid}</g>`
  return inItsPlace(`${body}<g fill="${openingColour}">${hinge.opening}</g>${lidOnItsHinge}`, placed)
}

function itemOnABoard(shape: CarriedShape): string {
  return `${item(shape, { x: 20, baseY: 23, size: 19, turnDegrees: 0 })}${board(6, 34, 24)}`
}

function inItsPlace(silhouette: string, { x, baseY, size, turnDegrees }: Placed): string {
  const scale = size / 24
  return `<g transform="translate(${x} ${baseY}) rotate(${turnDegrees}) scale(${scale}) translate(-12 -24)" fill="${itemColour}" stroke="${itemColour}" stroke-width="0">${silhouette}</g>`
}

function hand(): string {
  return `<g transform="translate(20 15) scale(0.62) translate(-18 -15.5)" fill="${itemColour}"><rect x="13.2" y="5" width="3" height="13" rx="1.5"/><rect x="17" y="3" width="3" height="14" rx="1.5"/><rect x="20.8" y="3.6" width="3" height="13.4" rx="1.5"/><rect x="24.6" y="6" width="3" height="11" rx="1.5"/><path d="M13 14 H27.8 V21 Q27.8 28 20.5 28 Q14 28 13 22 Z"/><path d="M13.6 21.5 L8.8 15.8 Q7.6 14 9.4 12.9 Q11 12 12.4 13.6 L15.6 17.4 Z"/></g>`
}

function board(fromX: number, toX: number, y: number): string {
  return `<rect x="${fromX}" y="${y}" width="${toX - fromX}" height="3" rx="1" fill="${woodColour}"/>`
}

function mouth(x: number, y: number): string {
  return `<path d="M${x - 5} ${y} Q${x} ${y + 6} ${x + 5} ${y}" fill="none" stroke="${heatColour}" stroke-width="2.2" stroke-linecap="round"/><path d="M${x - 4} ${y - 8} q2 -2 0 -4 M${x} ${y - 8} q2 -2 0 -4" fill="none" stroke="${itemColour}" stroke-width="1" stroke-linecap="round"/>`
}

function stream(fromX: number, fromY: number, toX: number, toY: number): string {
  return `<path d="M${fromX} ${fromY} Q${toX} ${fromY} ${toX} ${toY}" fill="none" stroke="${waterColour}" stroke-width="2" stroke-linecap="round"/>`
}

function leaves(x: number, y: number): string {
  return `<g fill="${leavesColour}"><ellipse cx="${x}" cy="${y}" rx="2" ry="1.2"/><ellipse cx="${x + 3}" cy="${y + 1}" rx="2" ry="1.2"/><ellipse cx="${x + 1.5}" cy="${y - 1.5}" rx="2" ry="1.2"/></g>`
}

function fallingLeaves(x: number, y: number): string {
  return `<g fill="${leavesColour}"><ellipse cx="${x}" cy="${y}" rx="1.6" ry="1"/><ellipse cx="${x + 3}" cy="${y + 4}" rx="1.6" ry="1"/><ellipse cx="${x + 5}" cy="${y + 8}" rx="1.6" ry="1"/></g>`
}

function heater(fromX: number, toX: number, y: number): string {
  return `<rect x="${fromX}" y="${y}" width="${toX - fromX}" height="3" rx="1" fill="#3a3330"/><path d="M${fromX + 6} ${y + 7} q2 -2 4 0 t4 0 M${fromX + 14} ${y + 7} q2 -2 4 0 t4 0" fill="none" stroke="${heatColour}" stroke-width="1.5" stroke-linecap="round"/>`
}

function basin(fromX: number, toX: number): string {
  return `<path d="M${fromX} 16 V25 Q${fromX} 29 ${fromX + 4} 29 H${toX - 4} Q${toX} 29 ${toX} 25 V16" fill="none" stroke="#7d8a92" stroke-width="2.5" stroke-linecap="round"/>`
}

function faucet(x: number, y: number): string {
  return `<path d="M${x - 10} ${y + 2} H${x + 5} Q${x + 8} ${y + 2} ${x + 8} ${y + 5} V${y + 7}" fill="none" stroke="#7d8a92" stroke-width="2.5" stroke-linecap="round"/>`
}

function drops(x: number, y: number): string {
  return `<g fill="${waterColour}"><path d="M${x} ${y} q2 3 0 4 q-2 -1 0 -4 Z"/><path d="M${x} ${y + 6} q2 3 0 4 q-2 -1 0 -4 Z"/></g>`
}

function bubbles(x: number, y: number): string {
  return `<g fill="none" stroke="${waterColour}" stroke-width="1.5"><circle cx="${x}" cy="${y + 10}" r="3"/><circle cx="${x + 5}" cy="${y + 4}" r="2"/><circle cx="${x + 2}" cy="${y}" r="1.5"/></g>${drops(x - 3, y + 14)}`
}
