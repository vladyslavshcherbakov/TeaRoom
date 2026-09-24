const canvasSize = 768
const centre = canvasSize / 2
const podRadius = 58
const stamenInnerRadius = podRadius - 4
const stamenOuterRadius = 104
const stamenCount = 72
const seedCount = 9
const seedRingRadius = 30
const seedRadius = 7.5
const petalShadow = 'rgba(120, 60, 70, 0.18)'
const petalShadowOffset = 5
const petalEdge = 'rgba(160, 60, 90, 0.35)'
const veinColour = 'rgba(190, 80, 110, 0.28)'
const veinsPerPetal = 7
const stamenColour = 'rgba(214, 160, 40, 0.9)'
const antherColour = '#f2c23a'
const podLight = '#e7e27a'
const podDark = '#a9b04a'
const seedHole = '#6f7a2c'
const seedShine = 'rgba(255, 255, 210, 0.7)'

export const lotusPaintingAspect = 1

type PetalRing = {
  readonly count: number
  readonly lengthPx: number
  readonly widthPx: number
  readonly turnRadians: number
  readonly rootColour: string
  readonly tipColour: string
  readonly curl: number
}

const petalRingsOutsideIn: readonly PetalRing[] = [
  { count: 10, lengthPx: 330, widthPx: 128, turnRadians: 0, rootColour: '#fff4f6', tipColour: '#ee8fac', curl: 0 },
  { count: 9, lengthPx: 262, widthPx: 112, turnRadians: 0.35, rootColour: '#fff0f3', tipColour: '#e9789b', curl: 0.1 },
  { count: 7, lengthPx: 190, widthPx: 96, turnRadians: 0.12, rootColour: '#fffafb', tipColour: '#f39ab5', curl: 0.25 },
  { count: 5, lengthPx: 128, widthPx: 78, turnRadians: 0.6, rootColour: '#ffffff', tipColour: '#f7b6c9', curl: 0.4 },
]

export function paintLotus(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasSize
  canvas.height = canvasSize
  const context = canvas.getContext('2d')
  if (context === null) return canvas
  context.translate(centre, centre)
  for (const ring of petalRingsOutsideIn) paintPetalRing(context, ring)
  paintStamens(context)
  paintSeedPod(context)
  return canvas
}

function paintPetalRing(context: CanvasRenderingContext2D, ring: PetalRing): void {
  for (let index = 0; index < ring.count; index += 1) {
    const angle = ring.turnRadians + (index / ring.count) * Math.PI * 2
    const wobble = 1 + 0.06 * Math.sin(index * 2.3 + ring.count)
    context.save()
    context.rotate(angle)
    paintPetalShadow(context, ring, wobble)
    paintPetal(context, ring, wobble)
    context.restore()
  }
}

function petalPath(context: CanvasRenderingContext2D, lengthPx: number, widthPx: number): void {
  context.beginPath()
  context.moveTo(0, 0)
  context.bezierCurveTo(widthPx * 0.62, -lengthPx * 0.18, widthPx * 0.58, -lengthPx * 0.78, 0, -lengthPx)
  context.bezierCurveTo(-widthPx * 0.58, -lengthPx * 0.78, -widthPx * 0.62, -lengthPx * 0.18, 0, 0)
  context.closePath()
}

function paintPetalShadow(context: CanvasRenderingContext2D, ring: PetalRing, wobble: number): void {
  context.save()
  context.translate(petalShadowOffset, petalShadowOffset)
  petalPath(context, ring.lengthPx * wobble, ring.widthPx)
  context.fillStyle = petalShadow
  context.fill()
  context.restore()
}

function paintPetal(context: CanvasRenderingContext2D, ring: PetalRing, wobble: number): void {
  const lengthPx = ring.lengthPx * wobble
  petalPath(context, lengthPx, ring.widthPx)
  const blush = context.createLinearGradient(0, 0, 0, -lengthPx)
  blush.addColorStop(0, ring.rootColour)
  blush.addColorStop(0.55, ring.rootColour)
  blush.addColorStop(1, ring.tipColour)
  context.fillStyle = blush
  context.fill()
  context.save()
  context.clip()
  paintCurl(context, lengthPx, ring)
  paintVeins(context, lengthPx, ring.widthPx)
  context.restore()
  petalPath(context, lengthPx, ring.widthPx)
  context.strokeStyle = petalEdge
  context.lineWidth = 1.6
  context.stroke()
}

function paintCurl(context: CanvasRenderingContext2D, lengthPx: number, ring: PetalRing): void {
  const shade = context.createLinearGradient(-ring.widthPx / 2, 0, ring.widthPx / 2, 0)
  shade.addColorStop(0, `rgba(150, 60, 90, ${0.12 + ring.curl * 0.2})`)
  shade.addColorStop(0.45, 'rgba(255, 255, 255, 0.18)')
  shade.addColorStop(1, `rgba(150, 60, 90, ${0.06 + ring.curl * 0.12})`)
  context.fillStyle = shade
  context.fillRect(-ring.widthPx, -lengthPx, ring.widthPx * 2, lengthPx)
}

function paintVeins(context: CanvasRenderingContext2D, lengthPx: number, widthPx: number): void {
  context.strokeStyle = veinColour
  context.lineWidth = 1.2
  for (let vein = 0; vein < veinsPerPetal; vein += 1) {
    const spread = (vein / (veinsPerPetal - 1) - 0.5) * widthPx * 0.7
    context.beginPath()
    context.moveTo(0, -lengthPx * 0.04)
    context.quadraticCurveTo(spread * 1.1, -lengthPx * 0.5, spread * 0.35, -lengthPx * 0.93)
    context.stroke()
  }
}

function paintStamens(context: CanvasRenderingContext2D): void {
  for (let index = 0; index < stamenCount; index += 1) {
    const angle = (index / stamenCount) * Math.PI * 2 + 0.04 * Math.sin(index * 5.1)
    const reach = stamenOuterRadius - 10 * Math.abs(Math.sin(index * 3.7))
    const tipX = Math.cos(angle) * reach
    const tipY = Math.sin(angle) * reach
    context.strokeStyle = stamenColour
    context.lineWidth = 1.6
    context.beginPath()
    context.moveTo(Math.cos(angle) * stamenInnerRadius, Math.sin(angle) * stamenInnerRadius)
    context.lineTo(tipX, tipY)
    context.stroke()
    context.fillStyle = antherColour
    context.beginPath()
    context.ellipse(tipX, tipY, 4.2, 2.6, angle, 0, Math.PI * 2)
    context.fill()
  }
}

function paintSeedPod(context: CanvasRenderingContext2D): void {
  const pod = context.createRadialGradient(-podRadius * 0.3, -podRadius * 0.3, podRadius * 0.1, 0, 0, podRadius)
  pod.addColorStop(0, podLight)
  pod.addColorStop(1, podDark)
  context.fillStyle = pod
  context.beginPath()
  context.arc(0, 0, podRadius, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = 'rgba(90, 100, 30, 0.5)'
  context.lineWidth = 2
  context.stroke()
  paintSeed(context, 0, 0)
  for (let index = 0; index < seedCount - 1; index += 1) {
    const angle = (index / (seedCount - 1)) * Math.PI * 2
    paintSeed(context, Math.cos(angle) * seedRingRadius, Math.sin(angle) * seedRingRadius)
  }
}

function paintSeed(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.fillStyle = seedHole
  context.beginPath()
  context.arc(x, y, seedRadius, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = seedShine
  context.beginPath()
  context.arc(x - seedRadius * 0.3, y - seedRadius * 0.3, seedRadius * 0.3, 0, Math.PI * 2)
  context.fill()
}
