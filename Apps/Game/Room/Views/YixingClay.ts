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

export function paintYixingClay(): YixingClay {
  return { colours: paintColours(), pores: paintPores() }
}

function paintColours(): HTMLCanvasElement {
  const { canvas, context } = newCanvas()
  if (context === null) return canvas
  context.fillStyle = clayBrown
  context.fillRect(0, 0, canvasWidth, canvasHeight)
  for (let blotch = 0; blotch < blotchCount; blotch += 1) {
    const x = pseudoRandom(blotch * 3 + 1) * canvasWidth
    const y = pseudoRandom(blotch * 3 + 2) * canvasHeight
    const radius = 40 + pseudoRandom(blotch * 3 + 3) * 90
    const shade = context.createRadialGradient(x, y, 0, x, y, radius)
    shade.addColorStop(0, blotch % 2 === 0 ? 'rgba(40, 18, 10, 0.18)' : 'rgba(150, 90, 60, 0.14)')
    shade.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = shade
    for (const shift of [-canvasWidth, 0, canvasWidth]) context.fillRect(x - radius + shift, y - radius, radius * 2, radius * 2)
  }
  scatterDots(context, poreCount, darkClay, widestPorePx, 11)
  scatterDots(context, grainCount, paleGrain, widestGrainPx, 29)
  return canvas
}

function paintPores(): HTMLCanvasElement {
  const { canvas, context } = newCanvas()
  if (context === null) return canvas
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvasWidth, canvasHeight)
  scatterDots(context, poreCount, '#000000', widestPorePx, 11)
  return canvas
}

function scatterDots(context: CanvasRenderingContext2D, count: number, colour: string, widestPx: number, salt: number): void {
  context.fillStyle = colour
  for (let dot = 0; dot < count; dot += 1) {
    const x = pseudoRandom(dot * 2 + salt) * canvasWidth
    const y = pseudoRandom(dot * 2 + 1 + salt * 5) * canvasHeight
    const radius = 0.4 + pseudoRandom(dot + salt * 13) * widestPx
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }
}

function newCanvas(): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  return { canvas, context: canvas.getContext('2d') }
}

function pseudoRandom(seed: number): number {
  const wave = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return wave - Math.floor(wave)
}
