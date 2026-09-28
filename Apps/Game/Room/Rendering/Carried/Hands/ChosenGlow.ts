import * as THREE from 'three'
import { itemIdInHand } from '../../../../../../Shared/GameLogic/GameLogic.ts'
import { roomLayers } from '../../RoomLayers.ts'
import type { CarriedItemsScene } from '../CarriedItemsScene.ts'
import type { CarriedModel } from '../CarriedModel.ts'
import { heldInViewFrame } from './HeldInView.ts'
import { radialFadingTexture } from '../LatheParts.ts'

const glowShareOfItemWidth = 2
const textureSize = 256
const peakOpacity = 0.7
const behindTheItemMetres = 0.08
const aboveTheBaseShareOfItemWidth = 0.2
const pulsesPerSecond = 0.2
const pulseShareOfTheSize = 0.03
const dimmingAtThePulseLow = 0.2
const glowColour = [255, 236, 170] as const
const falloffSteepness = 2.5

export class ChosenGlow {
  private readonly material: THREE.MeshBasicMaterial
  readonly mesh: THREE.Mesh

  constructor() {
    const texture = radialFadingTexture(textureSize, glowColour, glowOpacityAt)
    this.material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material)
    roomLayers.putOnLayer(this.mesh, 'heldInView', 'decoration')
    this.mesh.visible = false
  }

  show(scene: CarriedItemsScene, models: readonly CarriedModel[]): void {
    const heldInView = scene.heldInView
    const handIndex = heldInView?.chosenHandIndex ?? null
    const itemId = handIndex === null ? null : itemIdInHand(scene.state, handIndex)
    const chosen = models.find((model) => model.itemId === itemId)
    this.mesh.visible = heldInView !== null && handIndex !== null && chosen?.now.pass === 'heldInView'
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

function glowOpacityAt(shareOfTheRadius: number): number {
  return peakOpacity * Math.exp(-falloffSteepness * shareOfTheRadius * shareOfTheRadius) * (1 - shareOfTheRadius)
}
