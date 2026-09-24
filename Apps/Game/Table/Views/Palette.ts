import type { TimeOfDay } from '../../../../Shared/Simulation/Definitions/Atmosphere.ts'

export const palette = {
  wall: 0x3b322a,
  table: 0x7a5a40,
  tableEdge: 0x5e4430,
  clay: 0x8c5a3c,
  clayDark: 0x6e4630,
  steel: 0x5d6b6f,
  steelDark: 0x46525a,
  porcelain: 0xe9e2d4,
  porcelainShade: 0xcfc6b4,
  heaterPlate: 0x2e2a28,
  heaterGlow: 0xd0502e,
  switchOff: 0x6b635a,
  switchOn: 0xe0a24a,
  caddy: 0x4a6a58,
  caddyLid: 0x3c5748,
  leaves: 0x5b6b2f,
  cloth: 0xc9c0a8,
  puddle: 0x9fb2bc,
  steam: 0xf4f1ea,
  dragon: 0x5f8a6e,
  toad: 0x8a7a4e,
  plaque: 0x2b2620,
  plaqueMarkLit: 0xe8c36a,
  plaqueMarkDim: 0x5a5046,
  text: '#ece4d8',
  mutedText: '#b8ab9b',
} as const

export const windowSkyByTime: Readonly<Record<TimeOfDay, number>> = {
  dawn: 0xa9bccd,
  morning: 0xc4d6e2,
  day: 0xd8e6ee,
  sunset: 0xe2a574,
  dusk: 0x6a6f8a,
  night: 0x1c2438,
}

export function colourNumber(hexColour: string): number {
  return Number.parseInt(hexColour.slice(1), 16)
}
