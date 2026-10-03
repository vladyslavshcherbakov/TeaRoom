import type { FurnitureId } from '../Layout/RoomLayout.ts'
import type { WorldPoint } from '../../../Engine/Points.ts'
import { floorDistanceBetween } from '../../../Engine/Arithmetic.ts'

export type Wipe = {
  readonly puddleId: string
  readonly strokeSpeedCmPerSecond: number
  readonly coveredFraction: number
}

const clothWipingWidthMetres = 0.2
const wipeEveryMetres = 0.02
const flatteningSettleSeconds = 0.12

export class WipeStroke {
  private readonly unwipedMetresByPuddle = new Map<string, number>()
  private lengthMetres = 0
  private unwipedMetres = 0
  private metresOverAPuddle = 0
  private heldSecondsAtLastWipe = 0
  private lastPointOfTheStroke: WorldPoint
  private isTheClothUnderAnItem: boolean
  private flatShareOfTheCloth: number
  readonly clothId: string
  readonly furnitureId: FurnitureId

  constructor(clothId: string, furnitureId: FurnitureId, start: WorldPoint, isTheClothUnderAnItem: boolean) {
    this.clothId = clothId
    this.furnitureId = furnitureId
    this.lastPointOfTheStroke = start
    this.isTheClothUnderAnItem = isTheClothUnderAnItem
    this.flatShareOfTheCloth = isTheClothUnderAnItem ? 1 : 0
  }

  get lastPoint(): WorldPoint {
    return this.lastPointOfTheStroke
  }

  get isUnderAnItem(): boolean {
    return this.isTheClothUnderAnItem
  }

  get flatShare(): number {
    return this.flatShareOfTheCloth
  }

  get hasUnwipedLength(): boolean {
    return this.unwipedMetres > 0
  }

  movedTo(point: WorldPoint, puddleIdsUnder: (middle: WorldPoint) => readonly string[]): boolean {
    const segmentMetres = floorDistanceBetween(point, this.lastPointOfTheStroke)
    const middle = { x: (point.x + this.lastPointOfTheStroke.x) / 2, y: point.y, z: (point.z + this.lastPointOfTheStroke.z) / 2 }
    this.lengthMetres += segmentMetres
    this.unwipedMetres += segmentMetres
    const puddleIdsUnderTheMiddle = puddleIdsUnder(middle)
    for (const puddleId of puddleIdsUnderTheMiddle) this.unwipedMetresByPuddle.set(puddleId, (this.unwipedMetresByPuddle.get(puddleId) ?? 0) + segmentMetres)
    if (puddleIdsUnderTheMiddle.length > 0) this.metresOverAPuddle += segmentMetres
    this.lastPointOfTheStroke = point
    return this.unwipedMetres >= wipeEveryMetres
  }

  flattenedAfterAFrame(realSeconds: number, isTheClothUnderAnItem: boolean): void {
    const flatShareAimedAt = isTheClothUnderAnItem ? 1 : 0
    const shareOfTheWay = 1 - Math.exp(-realSeconds / flatteningSettleSeconds)
    this.isTheClothUnderAnItem = isTheClothUnderAnItem
    this.flatShareOfTheCloth += (flatShareAimedAt - this.flatShareOfTheCloth) * shareOfTheWay
  }

  wipeWhatWasCovered(heldSeconds: number, puddleAreaSquareMetresOf: (puddleId: string) => number): Wipe[] {
    const seconds = Math.max(heldSeconds - this.heldSecondsAtLastWipe, Number.EPSILON)
    const strokeSpeedCmPerSecond = (this.unwipedMetres * 100) / seconds
    const metresByPuddle = [...this.unwipedMetresByPuddle]
    this.unwipedMetres = 0
    this.unwipedMetresByPuddle.clear()
    this.heldSecondsAtLastWipe = heldSeconds
    return metresByPuddle.flatMap(([puddleId, metresOverIt]) => {
      const areaSquareMetres = puddleAreaSquareMetresOf(puddleId)
      return areaSquareMetres === 0 ? [] : [{ puddleId, strokeSpeedCmPerSecond, coveredFraction: Math.min(1, (metresOverIt * clothWipingWidthMetres) / areaSquareMetres) }]
    })
  }

  describe(heldSeconds: number): string {
    return `${this.lengthMetres.toFixed(2)} m in ${heldSeconds.toFixed(1)} s, ${this.metresOverAPuddle.toFixed(2)} m of it over a puddle`
  }
}
