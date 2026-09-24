import Phaser from 'phaser'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { RitualSession } from '../../../Shared/Simulation/Ritual/RitualSession.ts'
import { ConsoleLog } from '../ConsoleLog.ts'
import { sceneHeight, sceneWidth } from './RoomLayout.ts'

const roomId = 'quietRoom'

export class RoomScene extends Phaser.Scene {
  private session: RitualSession | null = null

  constructor() {
    super('room')
  }

  create(): void {
    const opening = RitualSession.open(defaultCatalog, roomId, new ConsoleLog(), import.meta.env.DEV)
    if (opening.kind === 'unavailable') return this.showQuietScreen()
    this.session = opening.session
    this.add.rectangle(sceneWidth / 2, sceneHeight * 0.62, sceneWidth - 32, 220, 0x8a6a4a)
  }

  override update(_time: number, deltaMs: number): void {
    this.session?.advance(deltaMs / 1000)
  }

  private showQuietScreen(): void {
    this.add
      .text(sceneWidth / 2, sceneHeight / 2, 'The room could not be prepared.', { color: '#ece4d8', fontSize: '18px' })
      .setOrigin(0.5)
  }
}
