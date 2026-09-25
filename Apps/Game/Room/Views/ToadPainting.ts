const canvasSize = 768
const centre = canvasSize / 2
const skinLight = '#a4905a'
const skinMiddle = '#7d6b3c'
const skinDark = '#54462a'
const blotchColour = 'rgba(58, 46, 24, 0.55)'
const dorsalStripe = 'rgba(214, 196, 140, 0.35)'
const wartLight = 'rgba(236, 220, 170, 0.55)'
const wartShadow = 'rgba(40, 30, 14, 0.45)'
const outlineColour = 'rgba(40, 30, 14, 0.55)'
const irisGold = '#d9a526'
const irisDark = '#8a5a12'
const pupilColour = '#120c06'
const coinLight = '#d8a959'
const coinDark = '#8a5a22'
const coinCentreY = 196
const coinRadius = 46
const coinHoleHalf = 12
const wartCount = 70
const blotchCount = 9

type Point = readonly [number, number]

type Limb = {
  readonly points: readonly Point[]
  readonly widths: readonly number[]
  readonly toes: readonly Point[]
  readonly toeWidth: number
}

const bodyOutline: readonly Point[] = [
  [centre, 214],
  [centre - 60, 222],
  [centre - 104, 252],
  [centre - 142, 312],
  [centre - 168, 392],
  [centre - 174, 470],
  [centre - 150, 548],
  [centre - 96, 600],
  [centre, 620],
  [centre + 96, 600],
  [centre + 150, 548],
  [centre + 174, 470],
  [centre + 168, 392],
  [centre + 142, 312],
  [centre + 104, 252],
  [centre + 60, 222],
]

const frontLegs: readonly Limb[] = [-1, 1].map((side) => ({
  points: [
    [centre + side * 140, 350],
    [centre + side * 215, 392],
    [centre + side * 228, 330],
    [centre + side * 222, 282],
  ],
  widths: [46, 36, 28, 22],
  toes: [
    [centre + side * 186, 238],
    [centre + side * 214, 228],
    [centre + side * 244, 236],
    [centre + side * 266, 258],
  ],
  toeWidth: 12,
}))

const hindLeg: Limb = {
  points: [
    [centre - 70, 580],
    [centre - 150, 650],
    [centre - 40, 668],
    [centre + 40, 672],
  ],
  widths: [52, 36, 24, 16],
  toes: [
    [centre + 108, 640],
    [centre + 126, 664],
    [centre + 130, 690],
    [centre + 118, 714],
    [centre + 94, 728],
  ],
  toeWidth: 8,
}

export const toadPaintingAspect = 1

export function paintToad(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasSize
  canvas.height = canvasSize
  const context = canvas.getContext('2d')
  if (context === null) return canvas
  context.lineCap = 'round'
  context.lineJoin = 'round'
  paintCoin(context)
  paintLimb(context, hindLeg)
  for (const leg of frontLegs) paintLimb(context, leg)
  paintBody(context)
  paintParotoidGlands(context)
  paintSnout(context)
  for (const side of [-1, 1]) paintEye(context, centre + side * 66, 268)
  return canvas
}

function paintCoin(context: CanvasRenderingContext2D): void {
  const bronze = context.createRadialGradient(centre - 16, coinCentreY - 18, 4, centre, coinCentreY, coinRadius)
  bronze.addColorStop(0, coinLight)
  bronze.addColorStop(1, coinDark)
  context.fillStyle = bronze
  circle(context, centre, coinCentreY, coinRadius)
  context.fill()
  context.strokeStyle = 'rgba(70, 44, 14, 0.7)'
  context.lineWidth = 3
  context.stroke()
  context.strokeStyle = 'rgba(70, 44, 14, 0.45)'
  circle(context, centre, coinCentreY, coinRadius - 8)
  context.stroke()
  context.fillStyle = 'rgba(40, 26, 8, 0.85)'
  context.fillRect(centre - coinHoleHalf, coinCentreY - coinHoleHalf, coinHoleHalf * 2, coinHoleHalf * 2)
  context.fillStyle = 'rgba(70, 44, 14, 0.55)'
  for (const [x, y] of [[0, -26], [0, 26], [-26, 0], [26, 0]] as const) context.fillRect(centre + x - 5, coinCentreY + y - 7, 10, 14)
}

function paintLimb(context: CanvasRenderingContext2D, limb: Limb): void {
  const foot = limb.points.at(-1)
  if (foot === undefined) return
  const toeStrokes = limb.toes.map((toe) => ({ points: [foot, toe] as const, widths: [limb.toeWidth, limb.toeWidth * 0.55] as const }))
  if (limb.toes.length > 4) paintWebbing(context, foot, limb.toes)
  for (const pass of ['outline', 'skin'] as const) {
    paintTaperedStroke(context, limb.points, limb.widths, pass)
    for (const toe of toeStrokes) paintTaperedStroke(context, toe.points, toe.widths, pass)
  }
  context.fillStyle = skinLight
  for (const toe of limb.toes) {
    circle(context, toe[0], toe[1], limb.toeWidth * 0.55)
    context.fill()
  }
}

function paintTaperedStroke(context: CanvasRenderingContext2D, points: readonly Point[], widths: readonly number[], pass: 'outline' | 'skin'): void {
  const stepsPerSegment = 24
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index]
    const to = points[index + 1]
    const fromWidth = widths[index]
    const toWidth = widths[index + 1] ?? fromWidth
    if (from === undefined || to === undefined || fromWidth === undefined || toWidth === undefined) continue
    for (let step = 0; step <= stepsPerSegment; step += 1) {
      const share = step / stepsPerSegment
      const x = from[0] + (to[0] - from[0]) * share
      const y = from[1] + (to[1] - from[1]) * share
      const radius = (fromWidth + (toWidth - fromWidth) * share) / 2
      if (pass === 'outline') {
        context.fillStyle = outlineColour
        circle(context, x, y, radius + 2.5)
        context.fill()
        continue
      }
      const shade = context.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0.5, x, y, radius)
      shade.addColorStop(0, skinLight)
      shade.addColorStop(1, skinMiddle)
      context.fillStyle = shade
      circle(context, x, y, radius)
      context.fill()
    }
  }
}

function paintWebbing(context: CanvasRenderingContext2D, foot: Point, toes: readonly Point[]): void {
  context.fillStyle = 'rgba(125, 107, 60, 0.75)'
  context.beginPath()
  context.moveTo(foot[0], foot[1])
  for (const [index, toe] of toes.entries()) {
    const towardsTheTip = index === 0 || index === toes.length - 1 ? 0.95 : 0.7
    context.lineTo(foot[0] + (toe[0] - foot[0]) * towardsTheTip, foot[1] + (toe[1] - foot[1]) * towardsTheTip)
  }
  context.closePath()
  context.fill()
}

function paintBody(context: CanvasRenderingContext2D): void {
  context.save()
  bodyPath(context)
  const roundness = context.createRadialGradient(centre - 30, 380, 30, centre, 430, 230)
  roundness.addColorStop(0, skinLight)
  roundness.addColorStop(0.55, skinMiddle)
  roundness.addColorStop(1, skinDark)
  context.fillStyle = roundness
  context.fill()
  context.clip()
  paintBlotches(context)
  paintDorsalStripe(context)
  paintWarts(context)
  context.restore()
  bodyPath(context)
  context.strokeStyle = outlineColour
  context.lineWidth = 4
  context.stroke()
}

function bodyPath(context: CanvasRenderingContext2D): void {
  context.beginPath()
  const count = bodyOutline.length
  for (let index = 0; index < count; index += 1) {
    const current = bodyOutline[index]
    const next = bodyOutline[(index + 1) % count]
    if (current === undefined || next === undefined) continue
    const middleX = (current[0] + next[0]) / 2
    const middleY = (current[1] + next[1]) / 2
    if (index === 0) context.moveTo(middleX, middleY)
    else context.quadraticCurveTo(current[0], current[1], middleX, middleY)
  }
  const first = bodyOutline[0]
  const second = bodyOutline[1]
  if (first !== undefined && second !== undefined) context.quadraticCurveTo(first[0], first[1], (first[0] + second[0]) / 2, (first[1] + second[1]) / 2)
  context.closePath()
}

function paintBlotches(context: CanvasRenderingContext2D): void {
  context.fillStyle = blotchColour
  for (let index = 0; index < blotchCount; index += 1) {
    const x = centre + (pseudoRandom(index * 3 + 1) - 0.5) * 260
    const y = 330 + pseudoRandom(index * 3 + 2) * 250
    const radius = 18 + pseudoRandom(index * 3 + 3) * 22
    context.beginPath()
    for (let step = 0; step <= 24; step += 1) {
      const angle = (step / 24) * Math.PI * 2
      const wobble = 1 + 0.25 * Math.sin(angle * 3 + index)
      const pointX = x + Math.cos(angle) * radius * wobble
      const pointY = y + Math.sin(angle) * radius * 0.8 * wobble
      if (step === 0) context.moveTo(pointX, pointY)
      else context.lineTo(pointX, pointY)
    }
    context.fill()
  }
}

function paintDorsalStripe(context: CanvasRenderingContext2D): void {
  context.strokeStyle = dorsalStripe
  context.lineWidth = 14
  context.beginPath()
  context.moveTo(centre, 300)
  context.quadraticCurveTo(centre + 6, 450, centre, 600)
  context.stroke()
}

function paintWarts(context: CanvasRenderingContext2D): void {
  for (let index = 0; index < wartCount; index += 1) {
    const x = centre + (pseudoRandom(index * 5 + 11) - 0.5) * 320
    const y = 300 + pseudoRandom(index * 5 + 12) * 310
    const radius = 4 + pseudoRandom(index * 5 + 13) * 7
    context.fillStyle = wartShadow
    circle(context, x + radius * 0.35, y + radius * 0.35, radius)
    context.fill()
    const bump = context.createRadialGradient(x - radius * 0.35, y - radius * 0.35, 0.5, x, y, radius)
    bump.addColorStop(0, wartLight)
    bump.addColorStop(1, 'rgba(125, 107, 60, 0.9)')
    context.fillStyle = bump
    circle(context, x, y, radius)
    context.fill()
  }
}

function paintParotoidGlands(context: CanvasRenderingContext2D): void {
  for (const side of [-1, 1]) {
    const x = centre + side * 92
    const y = 330
    const gland = context.createRadialGradient(x - side * 6, y - 14, 4, x, y, 50)
    gland.addColorStop(0, skinLight)
    gland.addColorStop(1, skinDark)
    context.fillStyle = gland
    context.beginPath()
    context.ellipse(x, y, 24, 50, side * -0.35, 0, Math.PI * 2)
    context.fill()
    context.strokeStyle = outlineColour
    context.lineWidth = 3
    context.stroke()
  }
}

function paintSnout(context: CanvasRenderingContext2D): void {
  context.strokeStyle = outlineColour
  context.lineWidth = 4
  context.beginPath()
  context.moveTo(centre - 104, 256)
  context.quadraticCurveTo(centre, 206, centre + 104, 256)
  context.stroke()
  context.fillStyle = 'rgba(30, 22, 10, 0.8)'
  for (const side of [-1, 1]) {
    context.beginPath()
    context.ellipse(centre + side * 14, 236, 4, 3, 0, 0, Math.PI * 2)
    context.fill()
  }
}

function paintEye(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.fillStyle = skinDark
  circle(context, x, y, 31)
  context.fill()
  const iris = context.createRadialGradient(x - 6, y - 6, 2, x, y, 25)
  iris.addColorStop(0, irisGold)
  iris.addColorStop(1, irisDark)
  context.fillStyle = iris
  circle(context, x, y, 25)
  context.fill()
  context.fillStyle = pupilColour
  context.beginPath()
  context.ellipse(x, y, 17, 7, 0, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = 'rgba(255, 255, 255, 0.8)'
  circle(context, x - 8, y - 9, 5)
  context.fill()
}

function line(context: CanvasRenderingContext2D, from: Point, to: Point): void {
  context.beginPath()
  context.moveTo(from[0], from[1])
  context.lineTo(to[0], to[1])
  context.stroke()
}

function circle(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
}

function pseudoRandom(seed: number): number {
  const wave = Math.sin(seed * 12.9898) * 43758.5453
  return wave - Math.floor(wave)
}
