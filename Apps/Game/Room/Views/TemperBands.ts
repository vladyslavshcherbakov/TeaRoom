const canvasSize = 256
const bandsFromFootToRim = 2.4
const swirlsAround = 3
const swirlStrength = 0.9
const bandDepth = 0.42
const grainStrength = 0.06

export function paintTemperBands(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvasSize
  canvas.height = canvasSize
  const context = canvas.getContext('2d')
  if (context === null) return canvas
  const image = context.createImageData(canvasSize, canvasSize)
  for (let row = 0; row < canvasSize; row += 1) {
    for (let column = 0; column < canvasSize; column += 1) {
      const thickness = Math.round(thicknessAt(column / canvasSize, row / canvasSize) * 255)
      const pixel = (row * canvasSize + column) * 4
      image.data.set([thickness, thickness, thickness, 255], pixel)
    }
  }
  context.putImageData(image, 0, 0)
  return canvas
}

function thicknessAt(around: number, along: number): number {
  const swirl = swirlStrength * Math.sin(around * Math.PI * 2 * swirlsAround + along * 5)
  const band = Math.sin(along * Math.PI * 2 * bandsFromFootToRim + swirl)
  const grain = grainStrength * Math.sin(Math.PI * 2 * around * 15 + along * 57) * Math.sin(Math.PI * 2 * around * 6 - along * 83)
  return Math.min(1, Math.max(0, 0.5 + bandDepth * band + grain))
}
