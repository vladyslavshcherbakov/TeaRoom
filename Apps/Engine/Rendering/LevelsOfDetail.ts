import * as THREE from 'three'

export type LevelOfDetail = {
  readonly mesh: THREE.Mesh
  readonly near: THREE.BufferGeometry
  readonly far: THREE.BufferGeometry
}

export type DistantDetail = {
  readonly camera: THREE.PerspectiveCamera
  readonly screenHeightPixels: number
}

export function pixelsAcross(root: THREE.Object3D, radiusMetres: number, { camera, screenHeightPixels }: DistantDetail): number {
  const distance = camera.position.distanceTo(root.getWorldPosition(new THREE.Vector3()))
  const visibleHeightMetres = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  return ((2 * radiusMetres * root.scale.x) / visibleHeightMetres) * screenHeightPixels
}

export function drawAtTheDetail(levels: readonly LevelOfDetail[], isSimple: boolean): void {
  for (const level of levels) level.mesh.geometry = isSimple ? level.far : level.near
}
