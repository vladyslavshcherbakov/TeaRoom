import { pseudoRandom } from '../../../../../Shared/Engine/Random.ts'
import type { AppLog } from '../../../../Engine/AppLog.ts'
import { fillCircle, paintedCanvas } from '../../../../Engine/Rendering/Painting/CanvasPainting.ts'

const noisePhase = 78.233
const canvasWidth = 1024
const canvasHeight = 512
const canvasSize = { width: canvasWidth, height: canvasHeight }
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

export function paintYixingClay(log: AppLog): YixingClay {
  return { colours: paintColours(log), pores: paintPores(log) }
}

function paintColours(log: AppLog): HTMLCanvasElement {
  return paintedCanvas(canvasSize, 'the Yixing clay cannot be painted, because the browser gives no 2D canvas, so the clay bowl is blank', log, (context) => {
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
  })
}

function paintPores(log: AppLog): HTMLCanvasElement {
  return paintedCanvas(canvasSize, 'the pores of the Yixing clay cannot be painted, because the browser gives no 2D canvas, so the clay bowl is smooth', log, (context) => {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvasWidth, canvasHeight)
    scatterDots(context, poreCount, '#000000', widestPorePx, 11)
  })
}

function scatterDots(context: CanvasRenderingContext2D, count: number, colour: string, widestPx: number, salt: number): void {
  context.fillStyle = colour
  for (let dot = 0; dot < count; dot += 1) {
    const x = pseudoRandom(dot * 2 + salt, noisePhase) * canvasWidth
    const y = pseudoRandom(dot * 2 + 1 + salt * 5, noisePhase) * canvasHeight
    const radius = 0.4 + pseudoRandom(dot + salt * 13, noisePhase) * widestPx
    for (const shift of [-canvasWidth, 0, canvasWidth]) {
      fillCircle(context, x + shift, y, radius)
    }
  }
}
