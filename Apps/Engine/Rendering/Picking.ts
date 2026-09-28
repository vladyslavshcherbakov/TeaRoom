import * as THREE from 'three'
import type { ScreenPoint } from '../ScreenPoint.ts'
import type { ScreenBox } from '../TouchAreasOnScreen.ts'

export type ScreenRectangle = {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

const boxCorners = Array.from({ length: 8 }, () => new THREE.Vector3())
const vertexInTheWorld = new THREE.Vector3()

export function hitsSeenBy(raycaster: THREE.Raycaster, camera: THREE.PerspectiveCamera, pointer: THREE.Vector2, tappable: readonly THREE.Object3D[]): THREE.Intersection[] {
  raycaster.setFromCamera(pointer, camera)
  return raycaster.intersectObjects([...tappable], true).filter((hit) => isShown(hit.object))
}

export function pointerAt(point: ScreenPoint, screen: ScreenRectangle): THREE.Vector2 {
  return new THREE.Vector2(((point.x - screen.left) / screen.width) * 2 - 1, -((point.y - screen.top) / screen.height) * 2 + 1)
}

export function screenBoxOf(meshes: readonly THREE.Mesh[], camera: THREE.PerspectiveCamera, screen: ScreenRectangle): ScreenBox | null {
  const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  for (const mesh of meshes) {
    if (mesh.geometry.boundingBox === null) mesh.geometry.computeBoundingBox()
    const { min, max } = mesh.geometry.boundingBox ?? new THREE.Box3()
    for (const [index, corner] of boxCorners.entries()) {
      corner.set(index & 1 ? max.x : min.x, index & 2 ? max.y : min.y, index & 4 ? max.z : min.z).applyMatrix4(mesh.matrixWorld)
      if (corner.clone().applyMatrix4(camera.matrixWorldInverse).z > -camera.near) return null
      corner.project(camera)
      const x = screen.left + ((corner.x + 1) / 2) * screen.width
      const y = screen.top + ((1 - corner.y) / 2) * screen.height
      box.left = Math.min(box.left, x)
      box.right = Math.max(box.right, x)
      box.top = Math.min(box.top, y)
      box.bottom = Math.max(box.bottom, y)
    }
  }
  return box
}

export function isDrawnWithin(box: ScreenBox, meshes: readonly THREE.Mesh[], camera: THREE.PerspectiveCamera, screen: ScreenRectangle): boolean {
  return meshes.some((mesh) => trianglesOnTheScreen(mesh, camera, screen).some((triangle) => doesTriangleOverlap(triangle, box)))
}

export function tagOf<Tag>(object: THREE.Object3D, key: string): Tag | undefined {
  for (let current: THREE.Object3D | null = object; current !== null; current = current.parent) {
    const tag = current.userData[key] as Tag | undefined
    if (tag !== undefined) return tag
  }
  return undefined
}

export function isUnderAnyOf(roots: ReadonlySet<THREE.Object3D>, object: THREE.Object3D): boolean {
  for (let current: THREE.Object3D | null = object; current !== null; current = current.parent) if (roots.has(current)) return true
  return false
}

export function isShown(object: THREE.Object3D): boolean {
  for (let current: THREE.Object3D | null = object; current !== null; current = current.parent) if (!current.visible) return false
  return true
}

function trianglesOnTheScreen(mesh: THREE.Mesh, camera: THREE.PerspectiveCamera, screen: ScreenRectangle): (readonly ScreenPoint[])[] {
  const positions = mesh.geometry.getAttribute('position')
  const pointsOnTheScreen = Array.from({ length: positions.count }, (_, index) => screenPointOf(vertexInTheWorld.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld), camera, screen))
  const cornerIndices = mesh.geometry.index === null ? Array.from({ length: positions.count }, (_, index) => index) : Array.from(mesh.geometry.index.array)
  const triangles: (readonly ScreenPoint[])[] = []
  for (let first = 0; first + 2 < cornerIndices.length; first += 3) {
    const corners = [pointsOnTheScreen[cornerIndices[first] ?? -1], pointsOnTheScreen[cornerIndices[first + 1] ?? -1], pointsOnTheScreen[cornerIndices[first + 2] ?? -1]]
    if (corners.every((corner) => corner !== null && corner !== undefined)) triangles.push(corners as ScreenPoint[])
  }
  return triangles
}

function screenPointOf(point: THREE.Vector3, camera: THREE.PerspectiveCamera, screen: ScreenRectangle): ScreenPoint | null {
  if (point.clone().applyMatrix4(camera.matrixWorldInverse).z > -camera.near) return null
  point.project(camera)
  return { x: screen.left + ((point.x + 1) / 2) * screen.width, y: screen.top + ((1 - point.y) / 2) * screen.height }
}

function doesTriangleOverlap(triangle: readonly ScreenPoint[], box: ScreenBox): boolean {
  const xs = triangle.map((corner) => corner.x)
  const ys = triangle.map((corner) => corner.y)
  if (Math.max(...xs) < box.left || Math.min(...xs) > box.right || Math.max(...ys) < box.top || Math.min(...ys) > box.bottom) return false
  const boxCornerPoints = [{ x: box.left, y: box.top }, { x: box.right, y: box.top }, { x: box.left, y: box.bottom }, { x: box.right, y: box.bottom }]
  return triangle.every((corner, index) => {
    const next = triangle[(index + 1) % triangle.length] ?? corner
    const opposite = triangle[(index + 2) % triangle.length] ?? corner
    const across = { x: next.y - corner.y, y: corner.x - next.x }
    const sideOfTheOpposite = across.x * (opposite.x - corner.x) + across.y * (opposite.y - corner.y)
    return boxCornerPoints.some((boxCorner) => (across.x * (boxCorner.x - corner.x) + across.y * (boxCorner.y - corner.y)) * sideOfTheOpposite >= 0)
  })
}
