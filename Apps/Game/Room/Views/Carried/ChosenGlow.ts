import * as THREE from 'three'
import { roomLayers } from '../RoomLayers.ts'
import type { CarriedItemsScene } from './CarriedItemsScene.ts'
import type { CarriedModel } from './CarriedModel.ts'
import { heldInViewFrame } from './HeldInView.ts'

const glowShareOfItemWidth = 2
const textureSize = 256
const peakOpacity = 0.7
const behindTheItemMetres = 0.08
const aboveTheBaseShareOfItemWidth = 0.2
const pulsesPerSecond = 0.2
const pulseShareOfTheSize = 0.03
const dimmingAtThePulseLow = 0.2
const glowColour = [255, 236, 170] as const

export class ChosenGlow {
  private readonly material: THREE.MeshBasicMaterial
  readonly mesh: THREE.Mesh

  constructor() {
    const texture = new THREE.DataTexture(glowPixels(), textureSize, textureSize)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearFilter
    texture.needsUpdate = true
    this.material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material)
    this.mesh.layers.set(roomLayers.heldInView)
    this.mesh.visible = false
  }

  show(scene: CarriedItemsScene, models: readonly CarriedModel[]): void {
    const heldInView = scene.heldInView
    const handIndex = heldInView?.chosenHandIndex ?? null
    const itemId = handIndex === null ? null : (scene.state.keeper.hands[handIndex] ?? null)
    const chosen = models.find((model) => model.itemId === itemId)
    this.mesh.visible = heldInView !== null && handIndex !== null && chosen?.isHeldInView === true
    if (!this.mesh.visible || heldInView === null || handIndex === null) return
    const frame = heldInViewFrame(heldInView, handIndex)
    const pulsePhase = Math.sin(scene.timeSeconds * pulsesPerSecond * Math.PI * 2)
    this.material.opacity = 1 - (dimmingAtThePulseLow * (1 - pulsePhase)) / 2
    const behindTheItem = frame.baseInCamera.clone().add(new THREE.Vector3(0, frame.itemWidth * aboveTheBaseShareOfItemWidth, -behindTheItemMetres))
    this.mesh.position.copy(heldInView.camera.localToWorld(behindTheItem))
    this.mesh.quaternion.copy(heldInView.camera.quaternion)
    this.mesh.scale.setScalar(frame.itemWidth * glowShareOfItemWidth * (1 + pulsePhase * pulseShareOfTheSize))
  }
}

function glowPixels(): Uint8Array {
  const pixels = new Uint8Array(textureSize * textureSize * 4)
  const centre = textureSize / 2
  const [red, green, blue] = glowColour
  for (let row = 0; row < textureSize; row += 1) {
    for (let column = 0; column < textureSize; column += 1) {
      const shareOfTheRadius = Math.min(1, Math.hypot(column + 0.5 - centre, row + 0.5 - centre) / centre)
      const softFalloff = Math.exp(-2.5 * shareOfTheRadius * shareOfTheRadius) * (1 - shareOfTheRadius)
      const index = (row * textureSize + column) * 4
      pixels.set([red, green, blue, Math.round(255 * peakOpacity * softFalloff)], index)
    }
  }
  return pixels
}
