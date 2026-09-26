import { pseudoRandom } from './PseudoRandom.ts'
import type { RoomLog } from '../RoomNavigator.ts'

const noisePhase = 78.233
const canvasWidth = 1024
const canvasHeight = 512
const clayBrown = '#74402b'
const darkClay = 'rgba(52, 26, 16, 0.55)'
const paleGrain = 'rgba(214, 170, 130, 0.45)'
const poreCount = 5200
const grainCount = 1400
const blotchCount = 26
const widestPorePx = 1.8
const widestGrainPx = 1.2

export type YixingClay = {
  readonly colours: HTMLCanvasElement
  readonly pores: HTMLCanvasElement
}

export function paintYixingClay(log: RoomLog): YixingClay {
  return { colours: paintColours(log), pores: paintPores(log) }
}

function paintColours(log: RoomLog): HTMLCanvasElement {
  const { canvas, context } = newCanvas()
  if (context === null) {
    log('the Yixing clay cannot be painted, because the browser gives no 2D canvas, so the clay bowl is blank')
    return canvas
  }
  context.fillStyle = clayBrown
  context.fillRect(0, 0, canvasWidth, canvasHeight)
  for (let blotch = 0; blotch < blotchCount; blotch += 1) {
    const x = pseudoRandom(blotch * 3 + 1, noisePhase) * canvasWidth
    const y = pseudoRandom(blotch * 3 + 2, noisePhase) * canvasHeight
    const radius = 40 + pseudoRandom(blotch * 3 + 3, noisePhase) * 90
    for (const shift of [-canvasWidth, 0, canvasWidth]) {
      const shade = context.createRadialGradient(x + shift, y, 0, x + shift, y, radius)
      shade.addColorStop(0, blotch % 2 === 0 ? 'rgba(40, 18, 10, 0.18)' : 'rgba(150, 90, 60, 0.14)')
      shade.addColorStop(1, 'rgba(0, 0, 0, 0)')
      context.fillStyle = shade
      context.fillRect(x - radius + shift, y - radius, radius * 2, radius * 2)
    }
  }
  scatterDots(context, poreCount, darkClay, widestPorePx, 11)
  scatterDots(context, grainCount, paleGrain, widestGrainPx, 29)
  return canvas
}

function paintPores(log: RoomLog): HTMLCanvasElement {
  const { canvas, context } = newCanvas()
  if (context === null) {
    log('the pores of the Yixing clay cannot be painted, because the browser gives no 2D canvas, so the clay bowl is smooth')
    return canvas
  }
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvasWidth, canvasHeight)
  scatterDots(context, poreCount, '#000000', widestPorePx, 11)
  return canvas
}

function scatterDots(context: CanvasRenderingContext2D, count: number, colour: string, widestPx: number, salt: number): void {
  context.fillStyle = colour
  for (let dot = 0; dot < count; dot += 1) {
    const x = pseudoRandom(dot * 2 + salt, noisePhase) * canvasWidth
    const y = pseudoRandom(dot * 2 + 1 + salt * 5, noisePhase) * canvasHeight
    const radius = 0.4 + pseudoRandom(dot + salt * 13, noisePhase) * widestPx
    for (const shift of [-canvasWidth, 0, canvasWidth]) {
      context.beginPath()
      context.arc(x + shift, y, radius, 0, Math.PI * 2)
      context.fill()
    }
  }
}

function newCanvas(): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  return { canvas, context: canvas.getContext('2d') }
}
