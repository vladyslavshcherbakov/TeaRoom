import type Phaser from 'phaser'
import type { Atmosphere } from '../../../../Shared/Simulation/Definitions/Atmosphere.ts'
import {
  caddyHome,
  figurineHomes,
  godsPlaque,
  heaterPlate,
  heaterSwitch,
  puddleCentre,
  puddleRadius,
  saucerOf,
  sceneHeight,
  sceneWidth,
  tableTopY,
  windowFrame,
} from '../RoomLayout.ts'
import type { RoomViewState } from '../RoomViewState.ts'
import type { ObjectPose } from '../Touch/TableTouches.ts'
import { palette, windowSkyByTime } from './Palette.ts'

const rainStreaks = 26
const figurineColours: Readonly<Record<string, number>> = { dragon: palette.dragon, toad: palette.toad }

export class TablePainter {
  private readonly graphics: Phaser.GameObjects.Graphics

  constructor(graphics: Phaser.GameObjects.Graphics) {
    this.graphics = graphics
  }

  paint(room: RoomViewState, atmosphere: Atmosphere, spoon: ObjectPose, cloth: ObjectPose, timeMs: number): void {
    this.graphics.clear()
    this.paintRoom(atmosphere, timeMs)
    this.paintPuddle(room.puddleShare)
    this.paintHeater(room.heater, timeMs)
    this.paintCaddy(room.caddy)
    this.paintFigurines()
    this.paintGodsPlaque(room.godsPlaque)
    this.paintCloth(cloth)
    this.paintSpoon(spoon, room.spoonFillShare)
  }

  private paintRoom(atmosphere: Atmosphere, timeMs: number): void {
    const graphics = this.graphics
    graphics.fillStyle(palette.wall)
    graphics.fillRect(0, 0, sceneWidth, tableTopY)
    graphics.fillStyle(windowSkyByTime[atmosphere.timeOfDay])
    graphics.fillRect(windowFrame.x - windowFrame.width / 2, windowFrame.y - windowFrame.height / 2, windowFrame.width, windowFrame.height)
    if (atmosphere.weather === 'rain' || atmosphere.weather === 'heavyRain') this.paintRain(timeMs)
    graphics.lineStyle(8, palette.tableEdge)
    graphics.strokeRect(windowFrame.x - windowFrame.width / 2, windowFrame.y - windowFrame.height / 2, windowFrame.width, windowFrame.height)
    graphics.lineBetween(windowFrame.x, windowFrame.y - windowFrame.height / 2, windowFrame.x, windowFrame.y + windowFrame.height / 2)
    graphics.fillStyle(palette.table)
    graphics.fillRect(0, tableTopY, sceneWidth, sceneHeight - tableTopY)
    graphics.fillStyle(palette.tableEdge)
    graphics.fillRect(0, tableTopY, sceneWidth, 10)
  }

  private paintRain(timeMs: number): void {
    const left = windowFrame.x - windowFrame.width / 2
    const top = windowFrame.y - windowFrame.height / 2
    this.graphics.lineStyle(1, 0xffffff, 0.35)
    for (let streak = 0; streak < rainStreaks; streak += 1) {
      const x = left + ((streak * 37) % windowFrame.width)
      const y = top + ((streak * 53 + timeMs * 0.35) % windowFrame.height)
      this.graphics.lineBetween(x, y, x - 3, Math.min(top + windowFrame.height, y + 14))
    }
  }

  private paintPuddle(puddleShare: number): void {
    if (puddleShare <= 0) return
    this.graphics.fillStyle(palette.puddle, 0.45)
    this.graphics.fillEllipse(puddleCentre.x, puddleCentre.y, puddleRadius * 2 * puddleShare, puddleRadius * puddleShare)
  }

  private paintHeater(heater: RoomViewState.Heater, timeMs: number): void {
    const graphics = this.graphics
    graphics.fillStyle(palette.heaterPlate)
    graphics.fillRoundedRect(heaterPlate.x - heaterPlate.width / 2, heaterPlate.y - heaterPlate.height / 2, heaterPlate.width, heaterPlate.height, 6)
    if (heater.isOn) {
      graphics.fillStyle(palette.heaterGlow, 0.55 + 0.15 * Math.sin(timeMs / 300))
      graphics.fillRoundedRect(heaterPlate.x - heaterPlate.width / 2 + 8, heaterPlate.y - 4, heaterPlate.width - 16, 8, 4)
    }
    graphics.fillStyle(palette.switchOff)
    graphics.fillRoundedRect(heaterSwitch.x - heaterSwitch.width / 2, heaterSwitch.y - heaterSwitch.height / 2, heaterSwitch.width, heaterSwitch.height, 15)
    graphics.fillStyle(heater.isOn ? palette.switchOn : palette.porcelainShade)
    graphics.fillCircle(heaterSwitch.x + (heater.isOn ? 16 : -16), heaterSwitch.y, 11)
  }

  private paintCaddy(caddy: RoomViewState.Caddy): void {
    const graphics = this.graphics
    const left = caddyHome.x - caddyHome.width / 2
    const top = caddyHome.y - caddyHome.height / 2
    graphics.fillStyle(palette.caddy)
    graphics.fillRoundedRect(left, top, caddyHome.width, caddyHome.height, 8)
    graphics.fillStyle(palette.caddyLid)
    if (!caddy.isOpen) {
      graphics.fillRoundedRect(left - 3, top - 6, caddyHome.width + 6, 12, 5)
      return
    }
    graphics.fillRoundedRect(left + caddyHome.width - 6, top - 26, caddyHome.width * 0.8, 10, 5)
    graphics.fillStyle(palette.leaves)
    graphics.fillRect(left + 6, top + 6 + (1 - caddy.fillShare) * (caddyHome.height - 16), caddyHome.width - 12, 6)
  }

  private paintFigurines(): void {
    for (const [figurineId, figurine] of Object.entries(figurineHomes)) {
      const saucer = saucerOf(figurine)
      this.graphics.fillStyle(palette.porcelainShade)
      this.graphics.fillEllipse(saucer.x, saucer.y, saucer.width, saucer.height / 2)
      this.graphics.fillStyle(figurineColours[figurineId] ?? palette.clay)
      this.graphics.fillEllipse(figurine.x, figurine.y + figurine.height / 6, figurine.width, figurine.height * 0.7)
      this.graphics.fillCircle(figurine.x, figurine.y - figurine.height / 3, figurine.width / 3.2)
    }
  }

  private paintGodsPlaque(plaque: RoomViewState.GodsPlaque): void {
    const graphics = this.graphics
    graphics.fillStyle(palette.plaque)
    graphics.fillRoundedRect(godsPlaque.x - godsPlaque.width / 2, godsPlaque.y - godsPlaque.height / 2, godsPlaque.width, godsPlaque.height, 6)
    const spacing = (godsPlaque.width - 28) / (plaque.totalMarks - 1)
    for (let mark = 0; mark < plaque.totalMarks; mark += 1) {
      graphics.fillStyle(mark < plaque.litMarks ? palette.plaqueMarkLit : palette.plaqueMarkDim)
      graphics.fillCircle(godsPlaque.x - godsPlaque.width / 2 + 14 + mark * spacing, godsPlaque.y, 5)
    }
  }

  private paintCloth(cloth: ObjectPose): void {
    this.graphics.fillStyle(palette.cloth)
    this.graphics.fillRoundedRect(cloth.x - 43, cloth.y - 17 - (cloth.isHeld ? 4 : 0), 86, 34, 8)
  }

  private paintSpoon(spoon: ObjectPose, spoonFillShare: number): void {
    const graphics = this.graphics
    graphics.lineStyle(5, palette.clayDark)
    graphics.lineBetween(spoon.x - 34, spoon.y, spoon.x + 6, spoon.y)
    graphics.fillStyle(palette.clayDark)
    graphics.fillEllipse(spoon.x + 20, spoon.y, 30, 16)
    if (spoonFillShare <= 0) return
    graphics.fillStyle(palette.leaves)
    graphics.fillEllipse(spoon.x + 20, spoon.y - 2, 24 * spoonFillShare + 4, 10)
  }
}
