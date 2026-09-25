import * as THREE from 'three'
import { isWalking, type Walk } from '../Walking/Walk.ts'
import type { RoomMaterials } from './RoomMaterials.ts'

const bobHeightMetres = 0.03
const stepsPerSecond = 4

export class WalkerModel {
  readonly root = new THREE.Group()
  private readonly body: THREE.Mesh

  constructor(materials: RoomMaterials) {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), materials.unsharedMaterialFor('walkerCoat'))
    body.position.y = 0.45
    this.body = body
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), materials.materialFor('walkerSkin'))
    head.position.y = 0.95
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), materials.materialFor('walkerSkin'))
    nose.position.set(0, 0.95, 0.14)
    this.root.add(body, head, nose)
    this.root.traverse((part) => (part.castShadow = true))
  }

  paintTheBody(colour: string): void {
    const material = this.body.material
    if (material instanceof THREE.MeshStandardMaterial) material.color.set(colour)
  }

  get shadowPose(): string {
    const { position, rotation } = this.root
    return this.root.visible ? `walker ${position.x.toFixed(3)} ${position.y.toFixed(3)} ${position.z.toFixed(3)} ${rotation.y.toFixed(3)}` : 'walker hidden'
  }

  show(walk: Walk, timeSeconds: number): void {
    const bob = isWalking(walk) ? Math.abs(Math.sin(timeSeconds * stepsPerSecond * Math.PI)) * bobHeightMetres : 0
    this.root.position.set(walk.position.x, bob, walk.position.z)
    this.root.rotation.y = walk.headingRadians
  }
}
