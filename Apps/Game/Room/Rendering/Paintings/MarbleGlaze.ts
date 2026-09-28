import type { AppLog } from '../../../../Engine/AppLog.ts'
import { paintedCanvas, paintPixels, roundedMix, type Rgb } from '../../../../Engine/Rendering/Painting/CanvasPainting.ts'

const canvasWidth = 1024
const canvasHeight = 512
const canvasSize = { width: canvasWidth, height: canvasHeight }
const deepGreen = [10, 74, 54] as const
const emerald = [31, 138, 104] as const
const paleVein = [214, 236, 224] as const
const veinSharpness = 40
const veinStrength = 0.85
const cloudStrength = 0.55
const turbulenceOctaves = 4

export function paintGreenMarble(log: AppLog): HTMLCanvasElement {
  return paintedCanvas(canvasSize, 'the green marble cannot be painted, because the browser gives no 2D canvas, so the green bowl is blank', log, (context) => {
    paintPixels(context, canvasSize, (column, row) => [...marbleAt(column / canvasWidth, row / canvasHeight), 255])
  })
}

function marbleAt(around: number, along: number): Rgb {
  const flow = turbulence(around, along)
  const cloud = 0.5 + 0.5 * Math.sin(Math.PI * 2 * (around * 2 + along * 0.7) + flow * 1.8)
  const body = roundedMix(deepGreen, emerald, cloudStrength * cloud + (1 - cloudStrength) * 0.5)
  const vein = Math.pow(1 - Math.abs(Math.sin(Math.PI * 2 * (around * 3 + along * 1.2) + flow * 4)), veinSharpness)
  const fineVein = Math.pow(1 - Math.abs(Math.sin(Math.PI * 2 * (around * 5 - along * 2.1) + flow * 5 + 1.7)), veinSharpness * 1.6)
  return roundedMix(body, paleVein, Math.min(1, (vein + fineVein * 0.5) * veinStrength))
}

function turbulence(around: number, along: number): number {
  let sum = 0
  let scale = 1
  for (let octave = 0; octave < turbulenceOctaves; octave += 1) {
    const turns = 2 ** octave
    sum += scale * Math.sin(Math.PI * 2 * around * turns + along * 4 * turns + octave * 1.3) * Math.cos(along * 5 * turns - Math.PI * 2 * around * turns * 2 + octave * 2.1)
    scale /= 2.2
  }
  return sum
}
