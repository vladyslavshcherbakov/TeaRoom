import type { PuddleView } from '../../Presentation/WorldViewState.ts'

type RadiusAt = {
  readonly timeSeconds: number
  readonly radiusMetres: number
}

type PuddleHistory = {
  readonly radii: RadiusAt[]
  radiusShownMetres: number | null
}

export class PuddlesShown {
  private readonly historyByPuddle = new Map<string, PuddleHistory>()

  puddlesAfterAFrame(puddles: readonly PuddleView[], timeSeconds: number, secondsWaterTakesToLand: number): PuddleView[] {
    const puddleIdsNow = new Set(puddles.map((puddle) => puddle.puddleId))
    for (const puddleId of this.historyByPuddle.keys()) if (!puddleIdsNow.has(puddleId)) this.historyByPuddle.delete(puddleId)
    return puddles.flatMap((puddle) => {
      const radiusShownMetres = this.radiusShownAfter(puddle, timeSeconds, timeSeconds - secondsWaterTakesToLand)
      return radiusShownMetres === null ? [] : [{ ...puddle, radiusMetres: radiusShownMetres }]
    })
  }

  private radiusShownAfter(puddle: PuddleView, timeSeconds: number, landedBySeconds: number): number | null {
    const history = this.historyByPuddle.get(puddle.puddleId) ?? { radii: [], radiusShownMetres: null }
    this.historyByPuddle.set(puddle.puddleId, history)
    history.radii.push({ timeSeconds, radiusMetres: puddle.radiusMetres })
    while (history.radii.length > 1 && (history.radii[1]?.timeSeconds ?? Infinity) <= landedBySeconds) history.radii.shift()
    const [oldest] = history.radii
    const landedRadiusMetres = oldest === undefined || oldest.timeSeconds > landedBySeconds ? null : oldest.radiusMetres
    const radiusReachedMetres = Math.max(landedRadiusMetres ?? -1, history.radiusShownMetres ?? -1)
    history.radiusShownMetres = radiusReachedMetres < 0 ? null : Math.min(puddle.radiusMetres, radiusReachedMetres)
    return history.radiusShownMetres
  }
}
