import type { AppLog } from '../../AppLog.ts'

export type Rgb = readonly [number, number, number]

export type Rgba = readonly [number, number, number, number]

export type CanvasSize = {
  readonly width: number
  readonly height: number
}

export function paintedCanvas(size: CanvasSize, whenThereIsNoCanvas: string, log: AppLog, paint: (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (context === null) {
    if (import.meta.env?.DEV === true) throw new Error(whenThereIsNoCanvas)
    log(whenThereIsNoCanvas, 'error')
    return canvas
  }
  paint(context, canvas)
  return canvas
}

export function aspectOf(size: CanvasSize): number {
  return size.width / size.height
}

export function paintPixels(context: CanvasRenderingContext2D, size: CanvasSize, colourAt: (column: number, row: number) => Rgba): void {
  const image = context.createImageData(size.width, size.height)
  for (let row = 0; row < size.height; row += 1) {
    for (let column = 0; column < size.width; column += 1) image.data.set(colourAt(column, row), (row * size.width + column) * 4)
  }
  context.putImageData(image, 0, 0)
}

export function roundedMix(from: Rgb, to: Rgb, share: number): Rgb {
  return [Math.round(from[0] + (to[0] - from[0]) * share), Math.round(from[1] + (to[1] - from[1]) * share), Math.round(from[2] + (to[2] - from[2]) * share)]
}

export function circlePath(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
}

export function fillCircle(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  circlePath(context, x, y, radius)
  context.fill()
}
