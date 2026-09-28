export function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

export function pseudoRandom(seed: number, phase = 0): number {
  const wave = Math.sin(seed * 12.9898 + phase) * 43758.5453
  return wave - Math.floor(wave)
}
