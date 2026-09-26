import * as THREE from 'three'

export const roomLayers = {
  room: 0,
  heldInView: 1,
  untappableRoom: 2,
  touchAreas: 3,
  inspected: 4,
} as const

const touchAreaMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })

export function touchAreaOf(geometry: THREE.BufferGeometry): THREE.Mesh {
  const area = new THREE.Mesh(geometry, touchAreaMaterial)
  area.layers.set(roomLayers.touchAreas)
  area.castShadow = false
  return area
}

export function isATouchArea(part: THREE.Object3D): boolean {
  return part instanceof THREE.Mesh && part.material === touchAreaMaterial
}

export function putOnLayer(root: THREE.Object3D, layer: number): void {
  root.traverse((part) => {
    if (!isATouchArea(part)) return part.layers.set(layer)
    if (layer === roomLayers.untappableRoom || layer === roomLayers.inspected) return part.layers.disableAll()
    part.layers.set(roomLayers.touchAreas)
  })
}

export function markAsGlowing(object: THREE.Object3D): void {
  object.userData = { ...object.userData, glows: true }
}

export function isMarkedAsGlowing(object: THREE.Object3D): boolean {
  return object.userData['glows'] === true
}
