import type { FurnitureId, FloorPoint, WorldPoint } from './RoomLayout.ts'

export type Wipe = {
  readonly strokeSpeedCmPerSecond: number
  readonly coveredFraction: number
}

const clothWipingWidthMetres = 0.2
const wipeEveryMetres = 0.02

export class WipeStroke {
  readonly clothId: string
  readonly furnitureId: FurnitureId
  private lengthMetres = 0
  private unwipedMetres = 0
  private unwipedMetresOverThePuddle = 0
  private metresOverThePuddle = 0
  private heldSecondsAtLastWipe = 0
  private lastPointOfTheStroke: WorldPoint

  constructor(clothId: string, furnitureId: FurnitureId, start: WorldPoint) {
    this.clothId = clothId
    this.furnitureId = furnitureId
    this.lastPointOfTheStroke = start
  }

  get lastPoint(): WorldPoint {
    return this.lastPointOfTheStroke
  }

  get hasUnwipedLength(): boolean {
    return this.unwipedMetres > 0
  }

  movedTo(point: WorldPoint, isOverThePuddleAt: (middle: FloorPoint) => boolean): boolean {
    const segmentMetres = Math.hypot(point.x - this.lastPointOfTheStroke.x, point.z - this.lastPointOfTheStroke.z)
    const middle = { x: (point.x + this.lastPointOfTheStroke.x) / 2, z: (point.z + this.lastPointOfTheStroke.z) / 2 }
    this.lengthMetres += segmentMetres
    this.unwipedMetres += segmentMetres
    if (isOverThePuddleAt(middle)) {
      this.unwipedMetresOverThePuddle += segmentMetres
      this.metresOverThePuddle += segmentMetres
    }
    this.lastPointOfTheStroke = point
    return this.unwipedMetres >= wipeEveryMetres
  }

  wipeWhatWasCovered(heldSeconds: number, puddleAreaSquareMetres: number): Wipe | null {
    const seconds = Math.max(heldSeconds - this.heldSecondsAtLastWipe, Number.EPSILON)
    const strokeSpeedCmPerSecond = (this.unwipedMetres * 100) / seconds
    const overThePuddle = this.unwipedMetresOverThePuddle
    this.unwipedMetres = 0
    this.unwipedMetresOverThePuddle = 0
    this.heldSecondsAtLastWipe = heldSeconds
    if (overThePuddle === 0 || puddleAreaSquareMetres === 0) return null
    return { strokeSpeedCmPerSecond, coveredFraction: Math.min(1, (overThePuddle * clothWipingWidthMetres) / puddleAreaSquareMetres) }
  }

  describe(heldSeconds: number): string {
    return `${this.lengthMetres.toFixed(2)} m in ${heldSeconds.toFixed(1)} s, ${this.metresOverThePuddle.toFixed(2)} m of it over the puddle`
  }
}
