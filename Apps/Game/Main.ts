import Phaser from 'phaser'
import { TableScene } from './Table/TableScene.ts'
import { sceneHeight, sceneWidth } from './Table/TableLayout.ts'

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#2b2620',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: sceneWidth, height: sceneHeight },
  scene: [TableScene],
})
