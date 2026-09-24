import Phaser from 'phaser'
import { RoomScene } from './Room/RoomScene.ts'
import { sceneHeight, sceneWidth } from './Room/RoomLayout.ts'

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#2b2620',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: sceneWidth, height: sceneHeight },
  scene: [RoomScene],
})
