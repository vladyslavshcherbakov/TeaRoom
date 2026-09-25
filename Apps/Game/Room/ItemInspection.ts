import type { HandIndex } from '../../../Shared/Simulation/State/SessionState.ts'
import type { ScreenPoint } from './RoomGestures.ts'

export type ItemInspectionView = {
  readonly itemId: string
  readonly handIndex: HandIndex
  readonly yawRadians: number
  readonly pitchRadians: number
  readonly magnification: number
}

const turnRadiansPerPixel = 0.01
const startingPitchRadians = 0.55
const smallestMagnification = 0.6
const largestMagnification = 3
const wheelZoomPerPixel = 0.001

export class ItemInspection {
  private readonly itemId: string
  private readonly handIndex: HandIndex
  private yawRadians = 0
  private pitchRadians = startingPitchRadians
  private magnification = 1

  constructor(itemId: string, handIndex: HandIndex) {
    this.itemId = itemId
    this.handIndex = handIndex
  }

  get view(): ItemInspectionView {
    return { itemId: this.itemId, handIndex: this.handIndex, yawRadians: this.yawRadians, pitchRadians: this.pitchRadians, magnification: this.magnification }
  }

  turnBy(fingerStep: ScreenPoint): void {
    this.yawRadians += fingerStep.x * turnRadiansPerPixel
    this.pitchRadians += fingerStep.y * turnRadiansPerPixel
  }

  zoomTo(magnification: number): void {
    this.magnification = Math.min(largestMagnification, Math.max(smallestMagnification, magnification))
  }
}

export function magnificationAfterPinch(magnificationAtStart: number, fingerGapAtStart: number, fingerGapNow: number): number {
  return (magnificationAtStart * fingerGapNow) / Math.max(fingerGapAtStart, 1)
}

export function magnificationAfterWheel(magnification: number, wheelDeltaY: number): number {
  return magnification * Math.exp(-wheelDeltaY * wheelZoomPerPixel)
}
