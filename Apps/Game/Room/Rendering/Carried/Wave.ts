import type { SurfaceMotion } from '../../../Presentation/WorldViewState.ts'

export type Wave = {
  readonly riseMetres: number
  readonly tiltXRadians: number
  readonly tiltZRadians: number
}

const tiltAcrossPaceShareOfTheRise = 0.8
const tiltAlongPaceShareOfTheRise = 1.3
const wavesByMotion: Readonly<Record<SurfaceMotion, { heightMetres: number; tiltRadians: number; wavesPerSecond: number }>> = {
  still: { heightMetres: 0, tiltRadians: 0, wavesPerSecond: 0 },
  shimmering: { heightMetres: 0.0008, tiltRadians: 0.02, wavesPerSecond: 1.5 },
  simmering: { heightMetres: 0.002, tiltRadians: 0.05, wavesPerSecond: 2.5 },
  boiling: { heightMetres: 0.004, tiltRadians: 0.09, wavesPerSecond: 4 },
}

export const stillWater: Wave = { riseMetres: 0, tiltXRadians: 0, tiltZRadians: 0 }

export function waveAt(motion: SurfaceMotion, timeSeconds: number): Wave {
  const { heightMetres, tiltRadians, wavesPerSecond } = wavesByMotion[motion]
  const phase = timeSeconds * wavesPerSecond * Math.PI * 2
  return {
    riseMetres: Math.sin(phase) * heightMetres,
    tiltXRadians: Math.sin(phase * tiltAcrossPaceShareOfTheRise) * tiltRadians,
    tiltZRadians: Math.cos(phase * tiltAlongPaceShareOfTheRise) * tiltRadians,
  }
}
