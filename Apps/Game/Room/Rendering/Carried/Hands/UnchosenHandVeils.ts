import * as THREE from 'three'
import { itemIdInHand, middleHandIndex, type HandIndex } from '../../../../../../Shared/GameLogic/GameLogic.ts'
import { roomLayers } from '../../RoomLayers.ts'
import type { CarriedItemsScene } from '../CarriedItemsScene.ts'
import type { CarriedModel } from '../CarriedModel.ts'
import { heldInViewFrame } from './HeldInView.ts'
import { easedAtBothEnds } from '../../../../../Engine/Arithmetic.ts'
import { radialFadingTexture } from '../LatheParts.ts'

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
      const itemId = itemIdInHand(scene.state, handIndex)
      const model = models.find((candidate) => candidate.itemId === itemId)
      if (veil === undefined || handIndex === chosenHandIndex || model?.now.pass !== 'heldInView') return
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
  roomLayers.putOnLayer(mesh, 'heldInView', 'decoration')
  mesh.visible = false
  return mesh
}

function veilMaterial(): THREE.MeshBasicMaterial {
  const texture = radialFadingTexture(textureSize, veilColour, veilOpacityAt)
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false })
}

function veilOpacityAt(shareOfTheRadius: number): number {
  return veilOpacity * (1 - easedAtBothEnds((shareOfTheRadius - veilClearFromShareOfTheRadius) / (1 - veilClearFromShareOfTheRadius)))
}
