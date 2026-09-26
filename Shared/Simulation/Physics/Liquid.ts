export type Liquid = {
  readonly volumeMl: number
  readonly temperatureC: number
  readonly strength: number
  readonly strengthByTeaId: Readonly<Record<string, number>>
  readonly bitterness: number
}

export const smallestMeaningfulVolumeMl = 0.01
const strengthBelowWhichItIsPlainWater = 5

export function water(volumeMl: number, temperatureC: number): Liquid {
  return { volumeMl, temperatureC, strength: 0, strengthByTeaId: {}, bitterness: 0 }
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
    strengthByTeaId: strengthByTeaIdMixed(existing, added),
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

export function strengthenedBy(liquid: Liquid, teaId: string, addedStrength: number): Liquid {
  const strengthOfTheTea = (liquid.strengthByTeaId[teaId] ?? 0) + addedStrength
  return { ...liquid, strength: liquid.strength + addedStrength, strengthByTeaId: { ...liquid.strengthByTeaId, [teaId]: strengthOfTheTea } }
}

export function shareOfTheStrengthByTeaId(liquid: Liquid): Readonly<Record<string, number>> {
  const strengthOfEveryTea = Object.values(liquid.strengthByTeaId).reduce((total, strength) => total + strength, 0)
  if (strengthOfEveryTea <= 0) return {}
  return Object.fromEntries(Object.entries(liquid.strengthByTeaId).map(([teaId, strength]) => [teaId, strength / strengthOfEveryTea]))
}

function strengthByTeaIdMixed(first: Liquid, second: Liquid): Record<string, number> {
  const teaIds = new Set([...Object.keys(first.strengthByTeaId), ...Object.keys(second.strengthByTeaId)])
  return Object.fromEntries([...teaIds].map((teaId) => [teaId, averageByVolume(first, second, (liquid) => liquid.strengthByTeaId[teaId] ?? 0)]))
}

function averageByVolume(first: Liquid, second: Liquid, property: (liquid: Liquid) => number): number {
  const totalMl = first.volumeMl + second.volumeMl
  return (property(first) * first.volumeMl + property(second) * second.volumeMl) / totalMl
}
