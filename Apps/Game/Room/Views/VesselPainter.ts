import type Phaser from 'phaser'
import type { Box, VesselShape } from '../RoomLayout.ts'
import type { RoomViewState } from '../RoomViewState.ts'
import type { ObjectPose } from '../Touch/TableTouches.ts'
import { colourNumber, palette } from './Palette.ts'

const puffCountByLevel: Readonly<Record<RoomViewState.SteamLevel, number>> = { none: 0, wisps: 2, visible: 4, billowing: 7 }
const leafDotsWhenFull = 14

export class VesselPainter {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly shape: VesselShape
  private readonly size: Box

  constructor(graphics: Phaser.GameObjects.Graphics, shape: VesselShape, size: Box) {
    this.graphics = graphics
    this.shape = shape
    this.size = size
  }

  paint(vessel: RoomViewState.Vessel, pose: ObjectPose, timeMs: number): void {
    const graphics = this.graphics
    graphics.clear()
    graphics.setPosition(pose.x, pose.y - (pose.isHeld ? 6 : 0))
    graphics.setRotation((-pose.tiltDegrees * Math.PI) / 180)
    graphics.setDepth(pose.isHeld ? 20 : 10)
    this.paintShadow(pose.isHeld)
    this.paintBody()
    this.paintLiquid(vessel)
    this.paintLeaves(vessel.leavesShare)
    this.paintLid(vessel.isLidOpen)
    this.paintSteam(vessel.steam, timeMs)
  }

  private paintShadow(isHeld: boolean): void {
    const { width, height } = this.size
    this.graphics.fillStyle(0x000000, isHeld ? 0.12 : 0.22)
    this.graphics.fillEllipse(0, height / 2 + (isHeld ? 12 : 4), width * 0.9, 10)
  }

  private paintBody(): void {
    const { width, height } = this.size
    const graphics = this.graphics
    switch (this.shape) {
      case 'kettle':
        graphics.fillStyle(palette.clay)
        graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 18)
        graphics.fillTriangle(-width / 2, -4, -width / 2 - 22, -height / 2 + 4, -width / 2, 14)
        graphics.lineStyle(5, palette.clayDark)
        graphics.strokeRoundedRect(width / 2 - 8, -height / 2 + 8, 20, height - 26, 8)
        return
      case 'thermos':
        graphics.fillStyle(palette.steel)
        graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 10)
        graphics.fillStyle(palette.steelDark)
        graphics.fillRect(-width / 2, -height / 2 + 14, width, 6)
        return
      case 'bowl':
        graphics.fillStyle(palette.porcelainShade)
        graphics.fillEllipse(0, 0, width, height)
        graphics.fillStyle(palette.porcelain)
        graphics.fillEllipse(0, -height / 4, width, height / 2)
        return
    }
  }

  private paintLiquid(vessel: RoomViewState.Vessel): void {
    if (vessel.fillShare <= 0) return
    const { width, height } = this.size
    const graphics = this.graphics
    graphics.fillStyle(colourNumber(vessel.liquorColour), 0.95)
    if (this.shape === 'bowl') {
      graphics.fillEllipse(0, -height / 4 + (1 - vessel.fillShare) * 4, width * (0.55 + 0.35 * vessel.fillShare), (height / 2) * 0.8)
      return
    }
    const windowHeight = height - 28
    const levelHeight = windowHeight * vessel.fillShare
    graphics.fillStyle(0x000000, 0.25)
    graphics.fillRect(-6, -height / 2 + 20, 12, windowHeight)
    graphics.fillStyle(colourNumber(vessel.liquorColour), 0.95)
    graphics.fillRect(-6, -height / 2 + 20 + windowHeight - levelHeight, 12, levelHeight)
  }

  private paintLeaves(leavesShare: number): void {
    if (leavesShare <= 0 || this.shape !== 'kettle') return
    const dots = Math.max(1, Math.round(leavesShare * leafDotsWhenFull))
    this.graphics.fillStyle(palette.leaves)
    for (let dot = 0; dot < dots; dot += 1) this.graphics.fillCircle(-18 + (dot % 7) * 6, this.size.height / 2 - 8 - Math.floor(dot / 7) * 5, 2.2)
  }

  private paintLid(isLidOpen: boolean | null): void {
    if (isLidOpen === null) return
    const { width, height } = this.size
    const lidWidth = this.shape === 'kettle' ? width * 0.55 : width + 4
    this.graphics.fillStyle(this.shape === 'kettle' ? palette.clayDark : palette.steelDark)
    if (isLidOpen) this.graphics.fillRoundedRect(width / 2 - lidWidth / 3, -height / 2 - 22, lidWidth, 8, 4)
    else this.graphics.fillRoundedRect(-lidWidth / 2, -height / 2 - 6, lidWidth, 10, 4)
  }

  private paintSteam(steam: RoomViewState.SteamLevel, timeMs: number): void {
    const puffs = puffCountByLevel[steam]
    for (let puff = 0; puff < puffs; puff += 1) {
      const phase = (timeMs / 1600 + puff / puffs) % 1
      const drift = Math.sin(timeMs / 500 + puff * 1.7) * 6
      this.graphics.fillStyle(palette.steam, 0.35 * (1 - phase))
      this.graphics.fillCircle(drift + (puff % 2 === 0 ? -6 : 6), -this.size.height / 2 - 14 - phase * 46, 5 + phase * 7)
    }
  }
}
