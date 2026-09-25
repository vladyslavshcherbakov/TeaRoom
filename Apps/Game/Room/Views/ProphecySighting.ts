import * as THREE from 'three'
import { roomLayers } from './RoomLayers.ts'

const facingNormalInPlane = new THREE.Vector3(0, 0, 1)
const clearanceMetres = 0.01

export function isSeenWhole(inscription: THREE.Mesh, camera: THREE.Camera, blockers: readonly THREE.Object3D[]): boolean {
  const corners = cornersInWorld(inscription)
  return isFacing(inscription, camera) && corners.every((corner) => isOnScreen(corner, camera)) && corners.every((corner) => isInSight(corner, camera, inscription, blockers))
}

function cornersInWorld(inscription: THREE.Mesh): THREE.Vector3[] {
  const geometry = inscription.geometry
  if (geometry.boundingBox === null) geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox ?? new THREE.Box3()
  return [new THREE.Vector3(min.x, min.y, 0), new THREE.Vector3(max.x, min.y, 0), new THREE.Vector3(min.x, max.y, 0), new THREE.Vector3(max.x, max.y, 0)].map((corner) => inscription.localToWorld(corner))
}

function isFacing(inscription: THREE.Mesh, camera: THREE.Camera): boolean {
  const normal = facingNormalInPlane.clone().transformDirection(inscription.matrixWorld)
  const towardsTheCamera = camera.getWorldPosition(new THREE.Vector3()).sub(inscription.getWorldPosition(new THREE.Vector3()))
  return normal.dot(towardsTheCamera) > 0
}

function isOnScreen(corner: THREE.Vector3, camera: THREE.Camera): boolean {
  const onScreen = corner.clone().project(camera)
  return Math.abs(onScreen.x) <= 1 && Math.abs(onScreen.y) <= 1 && Math.abs(onScreen.z) <= 1
}

function isInSight(corner: THREE.Vector3, camera: THREE.Camera, inscription: THREE.Mesh, blockers: readonly THREE.Object3D[]): boolean {
  const eye = camera.getWorldPosition(new THREE.Vector3())
  const towardsTheCorner = corner.clone().sub(eye)
  const raycaster = new THREE.Raycaster(eye, towardsTheCorner.clone().normalize(), 0, towardsTheCorner.length() - clearanceMetres)
  raycaster.layers.set(roomLayers.room)
  return raycaster.intersectObjects([...blockers], true).every((hit) => hit.object === inscription || !isDrawn(hit.object))
}

function isDrawn(part: THREE.Object3D): boolean {
  for (let current: THREE.Object3D | null = part; current !== null; current = current.parent) if (!current.visible) return false
  return true
}
