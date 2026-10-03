export type Flow = { readonly x: number; readonly y: number; readonly z: number }

const differenceStep = 0.01
const offsetOfTheSecondPotential = { x: 31.7, y: 17.3, z: 5.9 }
const offsetOfTheThirdPotential = { x: -12.1, y: 43.9, z: 27.4 }

export function curlNoiseAt(x: number, y: number, z: number): Flow {
  const potentialYAt = (px: number, py: number, pz: number): number => valueNoise(px + offsetOfTheSecondPotential.x, py + offsetOfTheSecondPotential.y, pz + offsetOfTheSecondPotential.z)
  const potentialZAt = (px: number, py: number, pz: number): number => valueNoise(px + offsetOfTheThirdPotential.x, py + offsetOfTheThirdPotential.y, pz + offsetOfTheThirdPotential.z)
  const twiceTheStep = 2 * differenceStep
  const dZdY = (potentialZAt(x, y + differenceStep, z) - potentialZAt(x, y - differenceStep, z)) / twiceTheStep
  const dYdZ = (potentialYAt(x, y, z + differenceStep) - potentialYAt(x, y, z - differenceStep)) / twiceTheStep
  const dXdZ = (valueNoise(x, y, z + differenceStep) - valueNoise(x, y, z - differenceStep)) / twiceTheStep
  const dZdX = (potentialZAt(x + differenceStep, y, z) - potentialZAt(x - differenceStep, y, z)) / twiceTheStep
  const dYdX = (potentialYAt(x + differenceStep, y, z) - potentialYAt(x - differenceStep, y, z)) / twiceTheStep
  const dXdY = (valueNoise(x, y + differenceStep, z) - valueNoise(x, y - differenceStep, z)) / twiceTheStep
  return { x: dZdY - dYdZ, y: dXdZ - dZdX, z: dYdX - dXdY }
}

export function curlNoiseOnAPlaneAt(x: number, y: number, timeShift: number): { readonly x: number; readonly y: number } {
  const twiceTheStep = 2 * differenceStep
  const dPdX = (valueNoise(x + differenceStep, y, timeShift) - valueNoise(x - differenceStep, y, timeShift)) / twiceTheStep
  const dPdY = (valueNoise(x, y + differenceStep, timeShift) - valueNoise(x, y - differenceStep, timeShift)) / twiceTheStep
  return { x: dPdY, y: -dPdX }
}

export function valueNoise(x: number, y: number, z: number): number {
  const cellX = Math.floor(x)
  const cellY = Math.floor(y)
  const cellZ = Math.floor(z)
  const blendX = smoothBlend(x - cellX)
  const blendY = smoothBlend(y - cellY)
  const blendZ = smoothBlend(z - cellZ)
  const nearZ = mix(mix(cornerValue(cellX, cellY, cellZ), cornerValue(cellX + 1, cellY, cellZ), blendX), mix(cornerValue(cellX, cellY + 1, cellZ), cornerValue(cellX + 1, cellY + 1, cellZ), blendX), blendY)
  const farZ = mix(mix(cornerValue(cellX, cellY, cellZ + 1), cornerValue(cellX + 1, cellY, cellZ + 1), blendX), mix(cornerValue(cellX, cellY + 1, cellZ + 1), cornerValue(cellX + 1, cellY + 1, cellZ + 1), blendX), blendY)
  return mix(nearZ, farZ, blendZ)
}

function cornerValue(x: number, y: number, z: number): number {
  let hash = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647)
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  hash ^= hash >>> 16
  return (hash >>> 0) / 4294967295 - 0.5
}

function smoothBlend(share: number): number {
  return share * share * share * (share * (share * 6 - 15) + 10)
}

function mix(from: number, to: number, share: number): number {
  return from + (to - from) * share
}
