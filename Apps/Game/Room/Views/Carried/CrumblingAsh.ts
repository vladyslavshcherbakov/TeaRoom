import * as THREE from 'three'
import type { SurfaceMaterials } from '../RoomMaterials.ts'

const flakeCount = 36
const flakeSizeMetres = 0.007
const smallestFlakeShare = 0.5
const handleFromMetres = -0.12
const handleToMetres = 0.03
const handleHalfWidthMetres = 0.012
const bowlCentreMetres = 0.07
const bowlRadiusMetres = 0.04
const fallsFromMetres = 0.03
const fallSeconds = 0.45
const liesSeconds = 3
const goldenAngleRadians = 2.4

export class CrumblingAsh {
  private readonly flakes: readonly THREE.Mesh[]
  private readonly whereItCrumbled = new THREE.Object3D()
  private crumbledAtSeconds: number | null = null
  readonly meshes: readonly THREE.Object3D[]

  constructor(materials: SurfaceMaterials) {
    const ash = materials.materialFor('ash')
    this.flakes = Array.from({ length: flakeCount }, () => new THREE.Mesh(new THREE.BoxGeometry(flakeSizeMetres, flakeSizeMetres / 3, flakeSizeMetres), ash))
    for (const flake of this.flakes) {
      flake.castShadow = false
      flake.visible = false
    }
    this.meshes = this.flakes
  }

  crumble(item: THREE.Object3D, timeSeconds: number): void {
    item.updateMatrixWorld()
    item.matrixWorld.decompose(this.whereItCrumbled.position, this.whereItCrumbled.quaternion, this.whereItCrumbled.scale)
    this.whereItCrumbled.updateMatrixWorld()
    this.crumbledAtSeconds = timeSeconds
  }

  show(timeSeconds: number): void {
    const secondsSince = this.crumbledAtSeconds === null ? Infinity : timeSeconds - this.crumbledAtSeconds
    const isShown = secondsSince >= 0 && secondsSince < fallSeconds + liesSeconds
    this.flakes.forEach((flake, index) => {
      flake.visible = isShown
      if (!isShown) return
      const fallenShare = Math.min(1, secondsSince / fallSeconds)
      const height = flakeSizeMetres / 6 + fallsFromMetres * (1 - fallenShare * fallenShare)
      const { x, z } = restingSpotOf(index)
      flake.position.copy(this.whereItCrumbled.localToWorld(new THREE.Vector3(x, height, z)))
      flake.rotation.y = index * goldenAngleRadians
      const sizeShare = smallestFlakeShare + (1 - smallestFlakeShare) * Math.abs(Math.sin(index * 1.7))
      flake.scale.setScalar(sizeShare * Math.max(0, 1 - Math.max(0, secondsSince - fallSeconds) / liesSeconds))
    })
  }
}

function restingSpotOf(index: number): { x: number; z: number } {
  const flakesOnTheHandle = flakeCount / 2
  if (index < flakesOnTheHandle) {
    const alongShare = (index + 0.5) / flakesOnTheHandle
    return { x: handleFromMetres + alongShare * (handleToMetres - handleFromMetres), z: Math.sin(index * goldenAngleRadians) * handleHalfWidthMetres }
  }
  const inTheBowl = index - flakesOnTheHandle
  const reach = bowlRadiusMetres * Math.sqrt((inTheBowl + 0.5) / (flakeCount - flakesOnTheHandle))
  return { x: bowlCentreMetres + Math.cos(inTheBowl * goldenAngleRadians) * reach, z: Math.sin(inTheBowl * goldenAngleRadians) * reach }
}
