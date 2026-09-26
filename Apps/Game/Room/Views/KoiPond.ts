import { orangeKoi, paintKoi, redKoi, secondRedKoi, type KoiMarkings } from './KoiPainting.ts'
import type { RoomLog } from '../RoomNavigator.ts'

const canvasSize = 840

export type KoiPond = 'oneKoi' | 'twoCircling' | 'twoTogether' | 'twoRedsSideBySide'

type SwimmingKoi = {
  readonly markings: KoiMarkings
  readonly x: number
  readonly y: number
  readonly length: number
  readonly degrees: number
}

const koiByPond: Record<KoiPond, readonly SwimmingKoi[]> = {
  oneKoi: [{ markings: redKoi, x: 0, y: 0, length: 600, degrees: -34 }],
  twoCircling: [
    { markings: redKoi, x: -20, y: -124, length: 540, degrees: 180 },
    { markings: orangeKoi, x: 28, y: 132, length: 450, degrees: 12 },
  ],
  twoTogether: [
    { markings: redKoi, x: -36, y: -80, length: 560, degrees: -28 },
    { markings: orangeKoi, x: 76, y: 116, length: 430, degrees: -44 },
  ],
  twoRedsSideBySide: [
    { markings: redKoi, x: -60, y: -110, length: 540, degrees: 160 },
    { markings: secondRedKoi, x: 90, y: 120, length: 460, degrees: 188 },
  ],
}

export const koiPonds = Object.keys(koiByPond) as readonly KoiPond[]

export const koiPondAspect = 1

export const koiPondWidthMetres = 0.098

export function paintKoiPond(pond: KoiPond, log: RoomLog): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasSize
  canvas.height = canvasSize
  const context = canvas.getContext('2d')
  if (context === null) {
    log('the koi pond cannot be painted, because the browser gives no 2D canvas, so the white bowl shows no koi')
    return canvas
  }
  for (const koi of koiByPond[pond]) paintSwimmingKoi(context, koi, log)
  return canvas
}

function paintSwimmingKoi(context: CanvasRenderingContext2D, koi: SwimmingKoi, log: RoomLog): void {
  const painting = paintKoi(koi.markings, log)
  const height = (koi.length * painting.height) / painting.width
  context.save()
  context.translate(canvasSize / 2 + koi.x, canvasSize / 2 + koi.y)
  context.rotate((koi.degrees * Math.PI) / 180)
  context.drawImage(painting, -koi.length / 2, -height / 2, koi.length, height)
  context.restore()
}
