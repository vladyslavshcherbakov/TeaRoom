const canvasSize = 768
const featherGrey = '#9aa3aa'
const darkGrey = '#5d666e'
const paleGrey = '#d9dee2'
const white = '#f8f8f5'
const black = '#1d1f22'
const billYellow = '#e8b53a'
const legColour = '#b39052'
const reedGreen = 'rgba(96, 120, 60, 0.85)'
const waterLine = 'rgba(90, 140, 170, 0.45)'

export const heronPaintingAspect = 1

export function paintHeron(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasSize
  canvas.height = canvasSize
  const context = canvas.getContext('2d')
  if (context === null) return canvas
  paintReeds(context)
  paintWater(context)
  paintLegs(context)
  paintBody(context)
  paintWing(context)
  paintNeck(context)
  paintHead(context)
  return canvas
}

function paintReeds(context: CanvasRenderingContext2D): void {
  const reeds = [
    [170, 640, 150, 300, 0.9],
    [205, 650, 215, 250, 1.1],
    [240, 645, 275, 330, 0.8],
    [600, 650, 640, 360, 1],
    [630, 655, 610, 420, 0.8],
  ] as const
  context.lineCap = 'round'
  for (const [baseX, baseY, tipX, tipY, width] of reeds) {
    context.strokeStyle = reedGreen
    context.lineWidth = 4 * width
    context.beginPath()
    context.moveTo(baseX, baseY)
    context.quadraticCurveTo((baseX + tipX) / 2 - 12, (baseY + tipY) / 2, tipX, tipY)
    context.stroke()
    context.fillStyle = 'rgba(120, 90, 50, 0.85)'
    context.beginPath()
    context.ellipse(tipX, tipY + 22, 6 * width, 22 * width, 0.1, 0, Math.PI * 2)
    context.fill()
    paintBlade(context, (baseX + tipX) / 2, (baseY + tipY) / 2 + 60, width)
  }
}

function paintBlade(context: CanvasRenderingContext2D, x: number, y: number, width: number): void {
  context.fillStyle = reedGreen
  context.beginPath()
  context.moveTo(x, y)
  context.quadraticCurveTo(x + 40 * width, y - 50, x + 70 * width, y - 110)
  context.quadraticCurveTo(x + 20 * width, y - 40, x - 4, y + 6)
  context.fill()
}

function paintWater(context: CanvasRenderingContext2D): void {
  context.strokeStyle = waterLine
  context.lineWidth = 2.5
  for (const [radiusX, radiusY] of [[60, 10], [110, 18], [170, 26], [240, 34]] as const) {
    context.beginPath()
    context.ellipse(420, 628, radiusX, radiusY, 0, 0.1, Math.PI - 0.1)
    context.stroke()
  }
}

function paintLegs(context: CanvasRenderingContext2D): void {
  context.strokeStyle = legColour
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = 7
  context.beginPath()
  context.moveTo(410, 455)
  context.lineTo(405, 540)
  context.lineTo(402, 625)
  context.stroke()
  context.beginPath()
  context.moveTo(440, 455)
  context.lineTo(468, 530)
  context.lineTo(430, 560)
  context.stroke()
  context.lineWidth = 3.5
  for (const [toX, toY] of [[450, 630], [370, 632], [395, 612]] as const) {
    context.beginPath()
    context.moveTo(402, 625)
    context.lineTo(toX, toY)
    context.stroke()
  }
  for (const [toX, toY] of [[415, 578], [412, 566], [420, 590]] as const) {
    context.beginPath()
    context.moveTo(430, 560)
    context.lineTo(toX, toY)
    context.stroke()
  }
}

function bodyPath(context: CanvasRenderingContext2D): void {
  context.beginPath()
  context.moveTo(250, 470)
  context.bezierCurveTo(300, 380, 400, 290, 480, 300)
  context.bezierCurveTo(520, 305, 530, 360, 505, 410)
  context.bezierCurveTo(480, 460, 400, 480, 330, 480)
  context.closePath()
}

function paintBody(context: CanvasRenderingContext2D): void {
  bodyPath(context)
  const shade = context.createLinearGradient(260, 300, 480, 480)
  shade.addColorStop(0, paleGrey)
  shade.addColorStop(0.6, featherGrey)
  shade.addColorStop(1, darkGrey)
  context.fillStyle = shade
  context.fill()
  context.strokeStyle = 'rgba(40, 45, 50, 0.4)'
  context.lineWidth = 2
  context.stroke()
}

function paintWing(context: CanvasRenderingContext2D): void {
  context.beginPath()
  context.moveTo(230, 485)
  context.bezierCurveTo(290, 400, 380, 330, 470, 330)
  context.bezierCurveTo(470, 380, 430, 440, 360, 470)
  context.closePath()
  const wing = context.createLinearGradient(240, 340, 460, 470)
  wing.addColorStop(0, '#7d868e')
  wing.addColorStop(1, darkGrey)
  context.fillStyle = wing
  context.fill()
  context.save()
  context.clip()
  context.strokeStyle = 'rgba(230, 235, 238, 0.45)'
  context.lineWidth = 1.5
  for (let feather = 0; feather < 14; feather += 1) {
    const x = 250 + feather * 16
    context.beginPath()
    context.moveTo(x, 490)
    context.quadraticCurveTo(x + 40, 430, x + 90, 360 - feather * 2)
    context.stroke()
  }
  context.fillStyle = black
  context.beginPath()
  context.moveTo(228, 486)
  context.bezierCurveTo(260, 450, 290, 430, 320, 420)
  context.bezierCurveTo(300, 450, 280, 470, 250, 490)
  context.fill()
  context.restore()
  for (let plume = 0; plume < 5; plume += 1) {
    context.strokeStyle = 'rgba(235, 238, 240, 0.8)'
    context.lineWidth = 1.2
    context.beginPath()
    context.moveTo(360 + plume * 10, 468)
    context.quadraticCurveTo(320 + plume * 8, 500, 280 + plume * 10, 510)
    context.stroke()
  }
}

function paintNeck(context: CanvasRenderingContext2D): void {
  context.lineCap = 'round'
  context.strokeStyle = paleGrey
  context.lineWidth = 30
  neckCurve(context)
  context.stroke()
  context.strokeStyle = white
  context.lineWidth = 18
  neckCurve(context)
  context.stroke()
  context.strokeStyle = 'rgba(30, 32, 35, 0.75)'
  context.lineWidth = 2.4
  for (let streak = 0; streak < 7; streak += 1) {
    const y = 300 - streak * 18
    context.beginPath()
    context.moveTo(505 + Math.sin(streak) * 6, y)
    context.lineTo(512 + Math.sin(streak) * 6, y - 10)
    context.stroke()
  }
}

function neckCurve(context: CanvasRenderingContext2D): void {
  context.beginPath()
  context.moveTo(478, 320)
  context.bezierCurveTo(540, 290, 545, 230, 505, 200)
  context.bezierCurveTo(470, 172, 490, 130, 530, 125)
}

function paintHead(context: CanvasRenderingContext2D): void {
  context.fillStyle = white
  context.beginPath()
  context.ellipse(540, 124, 24, 18, -0.15, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = 'rgba(40, 45, 50, 0.35)'
  context.lineWidth = 1.5
  context.stroke()
  const bill = context.createLinearGradient(555, 118, 660, 132)
  bill.addColorStop(0, billYellow)
  bill.addColorStop(1, '#c98b22')
  context.fillStyle = bill
  context.beginPath()
  context.moveTo(556, 114)
  context.lineTo(668, 130)
  context.lineTo(556, 132)
  context.closePath()
  context.fill()
  context.strokeStyle = 'rgba(90, 60, 20, 0.6)'
  context.lineWidth = 1.2
  context.beginPath()
  context.moveTo(558, 124)
  context.lineTo(660, 130)
  context.stroke()
  context.fillStyle = black
  context.beginPath()
  context.moveTo(548, 110)
  context.bezierCurveTo(520, 100, 480, 104, 440, 118)
  context.bezierCurveTo(480, 110, 515, 114, 546, 120)
  context.fill()
  context.strokeStyle = black
  context.lineWidth = 2.5
  for (const [endX, endY] of [[420, 130], [430, 142]] as const) {
    context.beginPath()
    context.moveTo(520, 112)
    context.quadraticCurveTo(470, 116, endX, endY)
    context.stroke()
  }
  context.fillStyle = '#f2d24a'
  context.beginPath()
  context.arc(548, 119, 5, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = black
  context.beginPath()
  context.arc(549, 119, 2.6, 0, Math.PI * 2)
  context.fill()
}
