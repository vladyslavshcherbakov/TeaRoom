export function pseudoRandom(seed: number, phase = 0): number {
  const wave = Math.sin(seed * 12.9898 + phase) * 43758.5453
  return wave - Math.floor(wave)
}
