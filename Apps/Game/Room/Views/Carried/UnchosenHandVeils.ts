import * as THREE from 'three'
import { middleHandIndex } from '../../../../../Shared/Simulation/Ritual/Reach.ts'
import type { HandIndex } from '../../../../../Shared/Simulation/State/SessionState.ts'
import { roomLayers } from '../RoomLayers.ts'
import type { CarriedItemsScene } from './CarriedItemsScene.ts'
import type { CarriedModel } from './CarriedModel.ts'
import { heldInViewFrame } from './HeldInView.ts'

const everyHandIndex: readonly HandIndex[] = [0, 1, middleHandIndex]
const textureSize = 128
const veilColour = [150, 132, 114] as const
const veilOpacity = 0.4
const veilClearFromShareOfTheRadius = 0.55
const veilShareOfItemWidth = 1.7
const veilAboveTheBaseShareOfItemWidth = 0.4
const veilInFrontMetres = 0.12

export class UnchosenHandVeils {
  readonly meshes: readonly THREE.Mesh[]

  constructor() {
    const material = veilMaterial()
    this.meshes = everyHandIndex.map(() => veilMesh(material))
  }

  show(scene: CarriedItemsScene, models: readonly CarriedModel[]): void {
    for (const mesh of this.meshes) mesh.visible = false
    const heldInView = scene.heldInView
    const chosenHandIndex = heldInView?.chosenHandIndex ?? null
    if (heldInView === null || chosenHandIndex === null) return
    everyHandIndex.forEach((handIndex, index) => {
      const veil = this.meshes[index]
      const itemId = scene.state.keeper.hands[handIndex] ?? null
      const model = models.find((candidate) => candidate.itemId === itemId)
      if (veil === undefined || handIndex === chosenHandIndex || model?.layer !== roomLayers.heldInView) return
      const frame = heldInViewFrame(heldInView, handIndex)
      veil.visible = true
      veil.position.copy(heldInView.camera.localToWorld(frame.baseInCamera.clone().add(new THREE.Vector3(0, frame.itemWidth * veilAboveTheBaseShareOfItemWidth, veilInFrontMetres))))
      veil.quaternion.copy(heldInView.camera.quaternion)
      veil.scale.setScalar(frame.itemWidth * veilShareOfItemWidth)
    })
  }
}

function veilMesh(material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
  mesh.layers.set(roomLayers.heldInView)
  mesh.visible = false
  return mesh
}

function veilMaterial(): THREE.MeshBasicMaterial {
  const texture = new THREE.DataTexture(veilPixels(), textureSize, textureSize)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false })
}

function veilPixels(): Uint8Array {
  const pixels = new Uint8Array(textureSize * textureSize * 4)
  const centre = textureSize / 2
  const [red, green, blue] = veilColour
  for (let row = 0; row < textureSize; row += 1) {
    for (let column = 0; column < textureSize; column += 1) {
      const shareOfTheRadius = Math.min(1, Math.hypot(column + 0.5 - centre, row + 0.5 - centre) / centre)
      const cover = 1 - smoothStep(veilClearFromShareOfTheRadius, 1, shareOfTheRadius)
      pixels.set([red, green, blue, Math.round(255 * veilOpacity * cover)], (row * textureSize + column) * 4)
    }
  }
  return pixels
}

function smoothStep(from: number, to: number, value: number): number {
  const share = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return share * share * (3 - 2 * share)
}
