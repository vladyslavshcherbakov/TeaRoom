export type Liquid = {
  readonly volumeMl: number
  readonly temperatureC: number
  readonly strength: number
  readonly bitterness: number
}

const smallestMeaningfulVolumeMl = 0.01
const strengthBelowWhichItIsPlainWater = 5

export function water(volumeMl: number, temperatureC: number): Liquid {
  return { volumeMl, temperatureC, strength: 0, bitterness: 0 }
}

export function isEmpty(liquid: Liquid): boolean {
  return liquid.volumeMl < smallestMeaningfulVolumeMl
}

export function isPlainWater(liquid: Liquid): boolean {
  return liquid.strength < strengthBelowWhichItIsPlainWater
}

export function mixLiquids(existing: Liquid, added: Liquid): Liquid {
  if (isEmpty(added)) return existing
  if (isEmpty(existing)) return added
  return {
    volumeMl: existing.volumeMl + added.volumeMl,
    temperatureC: averageByVolume(existing, added, (liquid) => liquid.temperatureC),
    strength: averageByVolume(existing, added, (liquid) => liquid.strength),
    bitterness: averageByVolume(existing, added, (liquid) => liquid.bitterness),
  }
}

export function splitLiquid(liquid: Liquid, requestedMl: number): { taken: Liquid; left: Liquid } {
  const takenMl = Math.min(Math.max(requestedMl, 0), liquid.volumeMl)
  const leftMl = liquid.volumeMl - takenMl
  return {
    taken: { ...liquid, volumeMl: takenMl },
    left: { ...liquid, volumeMl: leftMl < smallestMeaningfulVolumeMl ? 0 : leftMl },
  }
}

function averageByVolume(first: Liquid, second: Liquid, property: (liquid: Liquid) => number): number {
  const totalMl = first.volumeMl + second.volumeMl
  return (property(first) * first.volumeMl + property(second) * second.volumeMl) / totalMl
}
