import { pseudoRandom } from './PseudoRandom.ts'
import type { RoomLog } from '../RoomNavigator.ts'

const noisePhase = 5.1
const canvasWidth = 1024
const canvasHeight = 648
const fujiCentreX = canvasWidth / 2
const fujiBaseY = 500
const fujiPeakY = 300
const fujiHalfBase = 470
const fujiHalfSummit = 30
const fujiUpperSlopeDropPx = 60
const fujiUpperSlopeRunPx = 100
const snowLineY = 360
const snowCapHalfWidthPx = 135
const snowEdgeSteps = 24
const snowEdgeWobblePx = 3
const treelineHeightPx = 10
const treeCrownsAcross = 96
const reflectionSquash = 0.55
const reflectionRowPx = 2
const reflectionOpacity = 0.7
const rippleWavelengthPx = 18
const rippleSwayPx = 1.5
const rippleSwayGrowthPerPx = 0.04
const rippleHighlights = 40
const blossomRadiusPx = 16
const fallingPetalCount = 30
const branchesLowerByPx = 40

type BranchStroke = readonly [number, number, number, number, number, number, number]

const branchStrokes: readonly BranchStroke[] = [
  [0, 64, 240, 30, 470, 95, 11],
  [470, 95, 650, 150, 1024, 64, 11],
  [240, 45, 290, 120, 350, 170, 5],
  [650, 140, 720, 200, 800, 230, 5],
  [470, 95, 520, 40, 590, 15, 4],
  [860, 95, 900, 150, 960, 175, 4],
]

const blossoms: readonly (readonly [number, number])[] = [
  [40, 68], [120, 52], [190, 40], [270, 60], [320, 150], [350, 172], [400, 70], [450, 92], [520, 50], [585, 20],
  [560, 118], [640, 145], [700, 190], [790, 228], [760, 110], [850, 85], [930, 70], [1000, 62], [950, 170], [300, 100],
]

const buds: readonly (readonly [number, number])[] = [[160, 30], [500, 30], [740, 205], [880, 120], [380, 140], [620, 120]]

export function paintSakuraOverFuji(log: RoomLog): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const context = canvas.getContext('2d')
  if (context === null) {
    log('the sakura over Fuji cannot be painted, because the browser gives no 2D canvas, so the thermos is blank')
    return canvas
  }
  const mountain = paintMountainAlone(log)
  paintSky(context)
  context.drawImage(mountain, 0, 0)
  paintLake(context, mountain)
  paintBranches(context)
  for (let petal = 0; petal < fallingPetalCount; petal += 1) paintFallingPetal(context, pseudoRandom(petal * 3, noisePhase) * canvasWidth, 40 + pseudoRandom(petal * 3 + 1, noisePhase) * (canvasHeight - 80), pseudoRandom(petal * 3 + 2, noisePhase) * Math.PI)
  return canvas
}

function paintSky(context: CanvasRenderingContext2D): void {
  const sky = context.createLinearGradient(0, 0, 0, fujiBaseY)
  sky.addColorStop(0, '#1c2848')
  sky.addColorStop(0.6, '#31427a')
  sky.addColorStop(1, '#5f79ab')
  context.fillStyle = sky
  context.fillRect(0, 0, canvasWidth, fujiBaseY)
}

function paintMountainAlone(log: RoomLog): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const context = canvas.getContext('2d')
  if (context === null) {
    log('Fuji for its reflection cannot be painted, because the browser gives no 2D canvas, so the lake on the thermos reflects nothing')
    return canvas
  }
  paintFuji(context)
  paintTreeline(context)
  return canvas
}

function paintTreeline(context: CanvasRenderingContext2D): void {
  context.fillStyle = '#1b2740'
  context.beginPath()
  context.moveTo(0, fujiBaseY)
  const crownWidth = canvasWidth / treeCrownsAcross
  for (let crown = 0; crown < treeCrownsAcross; crown += 1) {
    const crownHeight = treelineHeightPx * (0.5 + 0.5 * pseudoRandom(crown + 300, noisePhase))
    context.quadraticCurveTo((crown + 0.5) * crownWidth, fujiBaseY - crownHeight * 2, (crown + 1) * crownWidth, fujiBaseY)
  }
  context.closePath()
  context.fill()
}

function paintLake(context: CanvasRenderingContext2D, mountain: HTMLCanvasElement): void {
  const water = context.createLinearGradient(0, fujiBaseY, 0, canvasHeight)
  water.addColorStop(0, '#4f6798')
  water.addColorStop(1, '#23335a')
  context.fillStyle = water
  context.fillRect(0, fujiBaseY, canvasWidth, canvasHeight - fujiBaseY)
  const lakeDepth = canvasHeight - fujiBaseY
  for (let depth = 0; depth < lakeDepth; depth += reflectionRowPx) {
    const sourceHeight = reflectionRowPx / reflectionSquash
    const sourceY = fujiBaseY - depth / reflectionSquash - sourceHeight
    const sway = Math.sin(depth / rippleWavelengthPx * Math.PI * 2 + pseudoRandom(depth, noisePhase) * 0.8) * rippleSwayPx * (1 + depth * rippleSwayGrowthPerPx)
    context.globalAlpha = reflectionOpacity * (1 - (0.6 * depth) / lakeDepth)
    for (const shift of [-canvasWidth, 0, canvasWidth]) context.drawImage(mountain, 0, sourceY, canvasWidth, sourceHeight, sway + shift, fujiBaseY + depth, canvasWidth, reflectionRowPx)
  }
  context.globalAlpha = 1
  context.strokeStyle = 'rgba(200, 215, 240, 0.35)'
  context.lineWidth = 1.5
  for (let ripple = 0; ripple < rippleHighlights; ripple += 1) {
    const x = pseudoRandom(ripple * 5 + 500, noisePhase) * canvasWidth
    const y = fujiBaseY + 6 + pseudoRandom(ripple * 5 + 501, noisePhase) * (lakeDepth - 12)
    const length = 12 + 30 * pseudoRandom(ripple * 5 + 502, noisePhase)
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + length, y)
    context.stroke()
  }
}

function fujiOutline(context: CanvasRenderingContext2D): void {
  context.beginPath()
  context.moveTo(fujiCentreX - fujiHalfBase, fujiBaseY)
  context.bezierCurveTo(fujiCentreX - fujiHalfBase * 0.5, fujiBaseY - 8, fujiCentreX - fujiHalfSummit - fujiUpperSlopeRunPx, fujiPeakY + fujiUpperSlopeDropPx, fujiCentreX - fujiHalfSummit, fujiPeakY)
  context.lineTo(fujiCentreX - fujiHalfSummit * 0.5, fujiPeakY - 2)
  context.lineTo(fujiCentreX - fujiHalfSummit * 0.15, fujiPeakY)
  context.lineTo(fujiCentreX + fujiHalfSummit * 0.25, fujiPeakY - 1)
  context.lineTo(fujiCentreX + fujiHalfSummit * 0.6, fujiPeakY + 1)
  context.lineTo(fujiCentreX + fujiHalfSummit, fujiPeakY + 2)
  context.bezierCurveTo(fujiCentreX + fujiHalfSummit + fujiUpperSlopeRunPx, fujiPeakY + fujiUpperSlopeDropPx, fujiCentreX + fujiHalfBase * 0.5, fujiBaseY - 8, fujiCentreX + fujiHalfBase, fujiBaseY)
  context.closePath()
}

function paintFuji(context: CanvasRenderingContext2D): void {
  fujiOutline(context)
  const slope = context.createLinearGradient(0, fujiPeakY, 0, fujiBaseY)
  slope.addColorStop(0, '#4a5a8a')
  slope.addColorStop(1, '#2b355a')
  context.fillStyle = slope
  context.fill()
  context.save()
  fujiOutline(context)
  context.clip()
  context.fillStyle = '#f4f2f6'
  context.beginPath()
  context.moveTo(fujiCentreX - fujiHalfBase, fujiPeakY - 20)
  context.lineTo(fujiCentreX + fujiHalfBase, fujiPeakY - 20)
  for (let step = 0; step <= snowEdgeSteps; step += 1) {
    const x = fujiCentreX + snowCapHalfWidthPx - (step / snowEdgeSteps) * snowCapHalfWidthPx * 2
    context.lineTo(x, snowLineY + (pseudoRandom(step + 60, noisePhase) - 0.5) * 2 * snowEdgeWobblePx)
  }
  context.closePath()
  context.fill()
  context.strokeStyle = 'rgba(160, 175, 210, 0.3)'
  context.lineWidth = 1.5
  for (let gully = -3; gully <= 3; gully += 1) {
    context.beginPath()
    context.moveTo(fujiCentreX + gully * 9, fujiPeakY + 4)
    context.lineTo(fujiCentreX + gully * 34, snowLineY - 4)
    context.stroke()
  }
  context.restore()
}

function paintBranches(context: CanvasRenderingContext2D): void {
  context.save()
  context.translate(0, branchesLowerByPx)
  context.lineCap = 'round'
  context.strokeStyle = '#2a1a12'
  for (const [fromX, fromY, viaX, viaY, toX, toY, thickness] of branchStrokes) {
    context.lineWidth = thickness
    context.beginPath()
    context.moveTo(fromX, fromY)
    context.quadraticCurveTo(viaX, viaY, toX, toY)
    context.stroke()
  }
  blossoms.forEach(([x, y], index) => paintBlossom(context, x, y, blossomRadiusPx + (index % 3) * 3))
  for (const [x, y] of buds) paintBud(context, x, y)
  context.restore()
}

function paintBlossom(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  for (let petal = 0; petal < 5; petal += 1) {
    const angle = (petal / 5) * Math.PI * 2 - Math.PI / 2
    const petalX = x + Math.cos(angle) * radius * 0.6
    const petalY = y + Math.sin(angle) * radius * 0.6
    const shade = context.createRadialGradient(x, y, 1, petalX, petalY, radius * 0.7)
    shade.addColorStop(0, '#e98aa3')
    shade.addColorStop(1, '#fde0e7')
    context.fillStyle = shade
    context.beginPath()
    context.ellipse(petalX, petalY, radius * 0.55, radius * 0.45, angle, 0, Math.PI * 2)
    context.fill()
  }
  context.fillStyle = '#c93d63'
  context.beginPath()
  context.arc(x, y, radius * 0.18, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = 'rgba(250, 210, 120, 0.9)'
  context.lineWidth = 1
  for (let stamen = 0; stamen < 8; stamen += 1) {
    const angle = (stamen / 8) * Math.PI * 2
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + Math.cos(angle) * radius * 0.35, y + Math.sin(angle) * radius * 0.35)
    context.stroke()
  }
}

function paintBud(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.fillStyle = '#e98aa3'
  context.beginPath()
  context.ellipse(x, y, 6, 9, 0.4, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#5d7a3a'
  context.beginPath()
  context.ellipse(x - 2, y + 8, 4, 4, 0, 0, Math.PI * 2)
  context.fill()
}

function paintFallingPetal(context: CanvasRenderingContext2D, x: number, y: number, turn: number): void {
  context.fillStyle = 'rgba(251, 211, 221, 0.85)'
  context.beginPath()
  context.ellipse(x, y, 6, 3.5, turn, 0, Math.PI * 2)
  context.fill()
}
