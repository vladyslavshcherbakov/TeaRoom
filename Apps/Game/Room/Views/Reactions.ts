import type Phaser from 'phaser'
import type { RitualEvent } from '../../../../Shared/Simulation/Ritual/RitualEvent.ts'
import { remarkText, tasteCardLines } from '../RoomTexts.ts'
import { palette } from './Palette.ts'

const remarkPosition = { x: 195, y: 335 }
const tasteCardPosition = { x: 195, y: 90 }
const remarkVisibleMs = 3200
const tasteCardVisibleMs = 3600
const targetTemperaturePulsesMs = [12, 90, 12]

export class Reactions {
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  show(events: readonly RitualEvent[]): void {
    for (const event of events) this.showOne(event)
  }

  private showOne(event: RitualEvent): void {
    switch (event.type) {
      case 'godsMoodChanged':
        return this.showFading(remarkText(event.remark), remarkPosition, remarkVisibleMs, palette.text)
      case 'teaTasted':
        return this.showFading(tasteCardLines(event.verdict).join('\n'), tasteCardPosition, tasteCardVisibleMs, palette.mutedText)
      case 'targetTemperatureReached':
        return this.pulse(targetTemperaturePulsesMs)
      default:
        return
    }
  }

  private showFading(text: string, position: { x: number; y: number }, visibleMs: number, colour: string): void {
    const label = this.scene.add
      .text(position.x, position.y, text, { color: colour, fontSize: '16px', align: 'center', wordWrap: { width: 320 } })
      .setOrigin(0.5)
      .setDepth(30)
    this.scene.tweens.add({ targets: label, alpha: 0, delay: visibleMs, duration: 600, onComplete: () => label.destroy() })
  }

  private pulse(pattern: readonly number[]): void {
    if (typeof navigator.vibrate === 'function') navigator.vibrate([...pattern])
  }
}
