import { clampedToShare } from '../../../../../Shared/GameLogic/GameLogic.ts'
import type { AppLog } from '../../../../Engine/AppLog.ts'
import { paintedCanvas, paintPixels } from '../../../../Engine/Rendering/Painting/CanvasPainting.ts'

const canvasSize = 256
const bandsFromFootToRim = 2.4
const swirlsAround = 3
const swirlStrength = 0.9
const bandDepth = 0.42
const grainStrength = 0.06

export function paintTemperBands(log: AppLog): HTMLCanvasElement {
  return paintedCanvas({ width: canvasSize, height: canvasSize }, 'the temper bands cannot be painted, because the browser gives no 2D canvas, so the temper-coloured bowl shows one colour', log, (context) => {
    paintPixels(context, { width: canvasSize, height: canvasSize }, (column, row) => {
      const thickness = Math.round(thicknessAt(column / canvasSize, row / canvasSize) * 255)
      return [thickness, thickness, thickness, 255]
    })
  })
}

function thicknessAt(around: number, along: number): number {
  const swirl = swirlStrength * Math.sin(around * Math.PI * 2 * swirlsAround + along * 5)
  const band = Math.sin(along * Math.PI * 2 * bandsFromFootToRim + swirl)
  const grain = grainStrength * Math.sin(Math.PI * 2 * around * 15 + along * 57) * Math.sin(Math.PI * 2 * around * 6 - along * 83)
  return clampedToShare(0.5 + bandDepth * band + grain)
}
