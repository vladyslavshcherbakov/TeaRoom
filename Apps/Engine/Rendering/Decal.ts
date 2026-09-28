import * as THREE from 'three'
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js'
import type { WorldPoint } from '../Points.ts'

const reachAboveAndBelowMetres = 0.005
const smallestUpwardNormal = 0.7
const straightDown = new THREE.Euler(-Math.PI / 2, 0, 0)
const valuesPerPoint = { position: 3, normal: 3, uv: 2 } as const
const maskSizePixels = 128
const maskEdgeShareOfTheRadius = 0.96

type Attribute = keyof typeof valuesPerPoint

export class Decal {
  readonly mesh: THREE.Mesh

  constructor(material: THREE.Material) {
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), material)
  }

  projectDown(receivers: readonly THREE.Mesh[], centre: WorldPoint, widthMetres: number): void {
    const projector = { position: new THREE.Vector3(centre.x, centre.y, centre.z), size: new THREE.Vector3(widthMetres, widthMetres, reachAboveAndBelowMetres * 2) }
    const pieces = receivers.map((receiver) => new DecalGeometry(receiver, projector.position, straightDown, projector.size))
    const shape = facesTurnedUpOf(pieces)
    for (const piece of pieces) piece.dispose()
    this.mesh.geometry.dispose()
    this.mesh.geometry = shape
  }

  free(): void {
    this.mesh.geometry.dispose()
    this.mesh.removeFromParent()
  }
}

export function roundDecalMask(): THREE.DataTexture {
  const pixels = new Uint8Array(maskSizePixels * maskSizePixels * 4)
  const centre = maskSizePixels / 2
  for (let row = 0; row < maskSizePixels; row += 1) {
    for (let column = 0; column < maskSizePixels; column += 1) {
      const shareOfTheRadius = Math.hypot(column + 0.5 - centre, row + 0.5 - centre) / centre
      const shown = Math.round(255 * Math.min(1, Math.max(0, (1 - shareOfTheRadius) / (1 - maskEdgeShareOfTheRadius))))
      pixels.set([shown, shown, shown, 255], (row * maskSizePixels + column) * 4)
    }
  }
  const mask = new THREE.DataTexture(pixels, maskSizePixels, maskSizePixels)
  mask.magFilter = THREE.LinearFilter
  mask.minFilter = THREE.LinearFilter
  mask.needsUpdate = true
  return mask
}

function facesTurnedUpOf(pieces: readonly THREE.BufferGeometry[]): THREE.BufferGeometry {
  const valuesByAttribute: Record<Attribute, number[]> = { position: [], normal: [], uv: [] }
  for (const piece of pieces) {
    const normals = piece.getAttribute('normal')
    for (let firstPoint = 0; normals !== undefined && firstPoint < normals.count; firstPoint += 3) {
      if (normals.getY(firstPoint) < smallestUpwardNormal) continue
      for (const attribute of Object.keys(valuesPerPoint) as Attribute[]) copyTheTriangle(piece.getAttribute(attribute), firstPoint, valuesPerPoint[attribute], valuesByAttribute[attribute])
    }
  }
  const shape = new THREE.BufferGeometry()
  for (const attribute of Object.keys(valuesPerPoint) as Attribute[]) shape.setAttribute(attribute, new THREE.Float32BufferAttribute(valuesByAttribute[attribute], valuesPerPoint[attribute]))
  return shape
}

function copyTheTriangle(from: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, firstPoint: number, valuesOfAPoint: number, into: number[]): void {
  for (let point = firstPoint; point < firstPoint + 3; point += 1) {
    for (let value = 0; value < valuesOfAPoint; value += 1) into.push(from.getComponent(point, value))
  }
}
