export type ProfilePoint = {
  readonly radiusMetres: number
  readonly heightMetres: number
}

export type LiquidInAVessel = {
  readonly aboveTheFloorMetres: number
  readonly belowTheRimMetres: number
  readonly insetFromTheWallMetres: number
}

export type VesselProfile = {
  readonly outside: readonly ProfilePoint[]
  readonly inside: readonly ProfilePoint[]
  readonly liquid: LiquidInAVessel
}

export type LiquidLevel = {
  readonly heightMetres: number
  readonly radiusMetres: number
}

export const overflowOverTheLipMetres = 0.003
export const liquidBelowTheRimMetres = 0.006

export function openingOf(profile: VesselProfile): ProfilePoint {
  return profile.inside.at(-1) ?? { radiusMetres: 0, heightMetres: 0 }
}

export function liquidLevelIn(profile: VesselProfile, fillShare: number): LiquidLevel {
  const { aboveTheFloorMetres, belowTheRimMetres, insetFromTheWallMetres } = profile.liquid
  const lowest = (profile.inside[0]?.heightMetres ?? 0) + aboveTheFloorMetres
  const heightMetres = lowest + fillShare * (openingOf(profile).heightMetres - belowTheRimMetres - lowest)
  return { heightMetres, radiusMetres: insideRadiusAt(profile, heightMetres) - insetFromTheWallMetres }
}

export function insideRadiusAt(profile: VesselProfile, heightMetres: number): number {
  const { inside } = profile
  const above = inside.findIndex((point, index) => index > 0 && point.heightMetres >= heightMetres)
  const after = inside[above]
  const before = inside[above - 1]
  if (after === undefined) return inside.at(-1)?.radiusMetres ?? 0
  if (before === undefined) return after.radiusMetres
  return before.radiusMetres + ((after.radiusMetres - before.radiusMetres) * (heightMetres - before.heightMetres)) / (after.heightMetres - before.heightMetres)
}

export function pathDownTheOutside(profile: VesselProfile): readonly ProfilePoint[] {
  const rimHeight = Math.max(openingOf(profile).heightMetres, profile.outside.at(-1)?.heightMetres ?? 0)
  const overTheLip = { radiusMetres: openingOf(profile).radiusMetres, heightMetres: rimHeight + overflowOverTheLipMetres }
  const downTheWall = [...profile.outside].reverse().map((point) => ({ radiusMetres: point.radiusMetres + overflowOverTheLipMetres, heightMetres: point.heightMetres }))
  return [overTheLip, ...downTheWall]
}
