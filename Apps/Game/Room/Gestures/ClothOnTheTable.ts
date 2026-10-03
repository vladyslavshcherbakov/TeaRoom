import { definitionIn, isACloth, puddleRadiusMetres, sameTopWithinMetres, wetMlAt, type Catalog } from '../../../../Shared/GameLogic/GameLogic.ts'
import { floorDistanceBetween } from '../../../Engine/Arithmetic.ts'
import type { SessionPort } from '../SessionPort.ts'
import type { FurnitureId, RoomLayout } from '../Layout/RoomLayout.ts'
import type { FloorPoint, WorldPoint } from '../../../Engine/Points.ts'
import type { AppLog } from '../../../Engine/AppLog.ts'
import type { TapTarget } from '../Input/TapTarget.ts'
import { clothShape } from '../Shapes/ClothShape.ts'
import { WipeStroke } from './WipeStroke.ts'
import { isUnderAnotherItem, type LyingLids, type Surroundings } from '../Layout/Placement.ts'

type PuddleOnTheTable = {
  readonly puddleId: string
  readonly centre: WorldPoint
  readonly radiusMetres: number
}

const clothHalfWidthMetres = clothShape.widthMetres / 2
const clothAreaSquareMetres = clothShape.widthMetres * clothShape.lengthMetres

export class ClothOnTheTable {
  private readonly session: SessionPort
  private readonly catalog: Catalog
  private readonly layout: RoomLayout
  private readonly lyingLids: LyingLids
  private readonly log: AppLog

  constructor(session: SessionPort, catalog: Catalog, layout: RoomLayout, lyingLids: LyingLids, log: AppLog) {
    this.session = session
    this.catalog = catalog
    this.layout = layout
    this.lyingLids = lyingLids
    this.log = log
  }

  strokeStartingAt(chosenItemId: string | null, target: TapTarget): WipeStroke | null {
    if (chosenItemId === null || !isACloth(this.session.state, chosenItemId) || target.kind !== 'surface') return null
    return new WipeStroke(chosenItemId, target.furnitureId, target.point, this.isTheClothUnderAnotherItem(chosenItemId, target.furnitureId, target.point))
  }

  strokeMovedTo(stroke: WipeStroke, point: WorldPoint, heldSeconds: number): void {
    const isTimeToWipe = stroke.movedTo(point, (middle) => this.puddlesUnderTheClothAt(stroke.furnitureId, middle).map((puddle) => puddle.puddleId))
    if (isTimeToWipe) this.wipeWhatTheStrokeCovered(stroke, heldSeconds)
  }

  strokeAfterAFrame(stroke: WipeStroke, realSeconds: number): void {
    const isUnderAnItem = this.isTheClothUnderAnotherItem(stroke.clothId, stroke.furnitureId, stroke.lastPoint)
    if (isUnderAnItem !== stroke.isUnderAnItem) this.log(`${stroke.clothId} ${isUnderAnItem ? 'slides under another item' : 'comes out from under the items'} on the ${stroke.furnitureId}, so it ${isUnderAnItem ? 'lies flat' : 'rumples again'}`)
    stroke.flattenedAfterAFrame(realSeconds, isUnderAnItem)
  }

  strokeEnded(stroke: WipeStroke, heldSeconds: number): void {
    if (stroke.hasUnwipedLength) this.wipeWhatTheStrokeCovered(stroke, heldSeconds)
    this.log(`stroke with ${stroke.clothId} ended: ${stroke.describe(heldSeconds)}, the ${stroke.furnitureId} is ${wetMlAt(this.session.state, stroke.furnitureId).toFixed(1)} ml wet`)
  }

  putDown(clothId: string, furnitureId: FurnitureId, point: WorldPoint): void {
    const puddle = this.puddleMostUnderTheClothAt(furnitureId, point)
    if (puddle === null) return this.log(`${clothId} goes down on the ${furnitureId} where no puddle reaches it`)
    this.log(`${clothId} goes down in ${puddle.puddleId}, ${floorDistanceBetween(point, puddle.centre).toFixed(2)} m from its centre`)
    this.session.dispatch({ type: 'soakUpThePuddle', clothId, puddleId: puddle.puddleId, coveredFraction: coveredFractionOf(puddle) })
  }

  soakWherePuddlesReachLyingCloths(): void {
    for (const cloth of Object.values(this.session.state.cloths)) {
      if (cloth.location.kind !== 'onSurface' || cloth.soakingPuddleId !== null) continue
      const puddle = this.puddleMostUnderTheClothAt(cloth.location.spot.placeId, cloth.location.spot)
      if (puddle === null) continue
      this.log(`${puddle.puddleId} has spread ${puddle.radiusMetres.toFixed(2)} m, under ${cloth.id} ${floorDistanceBetween(cloth.location.spot, puddle.centre).toFixed(2)} m from its centre`)
      this.session.dispatch({ type: 'puddleReachesTheCloth', clothId: cloth.id, puddleId: puddle.puddleId, coveredFraction: coveredFractionOf(puddle) })
    }
  }

  private isTheClothUnderAnotherItem(clothId: string, furnitureId: FurnitureId, point: WorldPoint): boolean {
    return isUnderAnotherItem(clothId, { placeId: furnitureId, ...point }, this.session.state, this.surroundings(), this.lyingLids)
  }

  private surroundings(): Surroundings {
    return { layout: this.layout, heaterSpot: definitionIn(this.catalog, 'rooms', this.session.state.roomId).heaterSpot }
  }

  private wipeWhatTheStrokeCovered(stroke: WipeStroke, heldSeconds: number): void {
    const wipes = stroke.wipeWhatWasCovered(heldSeconds, (puddleId) => Math.PI * puddleRadiusMetres(this.session.state.puddles[puddleId]?.wetMl ?? 0) ** 2)
    for (const wipe of wipes) this.session.dispatch({ type: 'wipeTable', clothId: stroke.clothId, ...wipe })
  }

  private puddleMostUnderTheClothAt(placeId: string, point: WorldPoint): PuddleOnTheTable | null {
    const [nearest] = this.puddlesUnderTheClothAt(placeId, point).sort((first, second) => floorDistanceBetween(point, first.centre) - floorDistanceBetween(point, second.centre))
    return nearest ?? null
  }

  private puddlesUnderTheClothAt(placeId: string, point: WorldPoint): PuddleOnTheTable[] {
    return Object.entries(this.session.state.puddles).flatMap(([puddleId, puddle]) => {
      const onTheTop = { puddleId, centre: puddle.centre, radiusMetres: puddleRadiusMetres(puddle.wetMl) }
      const isOnTheSameTop = puddle.centre.placeId === placeId && Math.abs(puddle.centre.y - point.y) <= sameTopWithinMetres
      return isOnTheSameTop && isTheClothOver(onTheTop, point) ? [onTheTop] : []
    })
  }
}

function coveredFractionOf(puddle: PuddleOnTheTable): number {
  return Math.min(1, clothAreaSquareMetres / (Math.PI * puddle.radiusMetres ** 2))
}

function isTheClothOver(puddle: PuddleOnTheTable, point: FloorPoint): boolean {
  return puddle.radiusMetres > 0 && floorDistanceBetween(point, puddle.centre) < puddle.radiusMetres + clothHalfWidthMetres
}
