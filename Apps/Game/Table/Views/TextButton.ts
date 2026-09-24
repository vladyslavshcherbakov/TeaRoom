import type Phaser from 'phaser'
import { palette } from './Palette.ts'

export function textButton(scene: Phaser.Scene, x: number, y: number, label: string, onPress: () => void): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, label, { color: palette.text, fontSize: '18px', backgroundColor: '#00000055', padding: { x: 14, y: 8 } })
    .setOrigin(0.5)
    .setDepth(40)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', onPress)
}
