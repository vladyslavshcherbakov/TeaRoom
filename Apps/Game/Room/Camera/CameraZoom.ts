import type { FurnitureId } from '../RoomLayout.ts'
import type { RoomView } from '../RoomNavigator.ts'
import { unzoomedDistanceShare } from './CameraPoses.ts'

export class CameraZoom {
  private roomDistanceShare = unzoomedDistanceShare
  private closeUpDistanceShare = unzoomedDistanceShare
  private closeUpShown: FurnitureId | null = null

  get distanceShare(): number {
    return this.closeUpShown === null ? this.roomDistanceShare : this.closeUpDistanceShare
  }

  viewShown(view: RoomView): void {
    const furnitureId = view.kind === 'closeUp' ? view.furnitureId : null
    if (furnitureId === this.closeUpShown) return
    this.closeUpShown = furnitureId
    this.closeUpDistanceShare = unzoomedDistanceShare
  }

  zoomTo(distanceShare: number): void {
    if (this.closeUpShown === null) this.roomDistanceShare = distanceShare
    else this.closeUpDistanceShare = distanceShare
  }
}
