import * as THREE from 'three'
import { kettleRadiusAt, kettleShape } from './KettleShape.ts'

const pointsAcross = 3
const pointsUp = 14

export class GaugeStrip {
  readonly mesh: THREE.Mesh
  private readonly halfWidthMetres: number
  private readonly aboveTheBodyMetres: number
  private readonly positions: THREE.BufferAttribute
  private readonly normals: THREE.BufferAttribute

  constructor(halfWidthMetres: number, aboveTheBodyMetres: number, material: THREE.Material) {
    this.halfWidthMetres = halfWidthMetres
    this.aboveTheBodyMetres = aboveTheBodyMetres
    const geometry = new THREE.BufferGeometry()
    this.positions = new THREE.BufferAttribute(new Float32Array(pointsAcross * pointsUp * 3), 3)
    this.normals = new THREE.BufferAttribute(new Float32Array(pointsAcross * pointsUp * 3), 3)
    geometry.setAttribute('position', this.positions)
    geometry.setAttribute('normal', this.normals)
    geometry.setIndex(stripTriangles())
    this.mesh = new THREE.Mesh(geometry, material)
  }

  cover(fromHeightMetres: number, toHeightMetres: number): void {
    for (let row = 0; row < pointsUp; row += 1) {
      const height = fromHeightMetres + ((toHeightMetres - fromHeightMetres) * row) / (pointsUp - 1)
      const bodyRadius = Math.max(0.001, kettleRadiusAt(height))
      const halfAngle = this.halfWidthMetres / bodyRadius
      for (let column = 0; column < pointsAcross; column += 1) {
        const angle = -halfAngle + (2 * halfAngle * column) / (pointsAcross - 1)
        this.placePoint(row * pointsAcross + column, height, bodyRadius, angle)
      }
    }
    this.positions.needsUpdate = true
    this.normals.needsUpdate = true
    this.mesh.geometry.computeBoundingSphere()
  }

  private placePoint(index: number, height: number, bodyRadius: number, angle: number): void {
    const { bodyRadiusMetres, bodyCentreMetres, bodySquash } = kettleShape
    const x = Math.sin(angle) * bodyRadius
    const z = Math.cos(angle) * bodyRadius
    const bodyHalfHeight = bodyRadiusMetres * bodySquash
    const normal = new THREE.Vector3(x / bodyRadiusMetres ** 2, (height - bodyCentreMetres) / bodyHalfHeight ** 2, z / bodyRadiusMetres ** 2).normalize()
    this.positions.setXYZ(index, x + normal.x * this.aboveTheBodyMetres, height + normal.y * this.aboveTheBodyMetres, z + normal.z * this.aboveTheBodyMetres)
    this.normals.setXYZ(index, normal.x, normal.y, normal.z)
  }
}

function stripTriangles(): number[] {
  const triangles: number[] = []
  for (let row = 0; row < pointsUp - 1; row += 1) {
    for (let column = 0; column < pointsAcross - 1; column += 1) {
      const below = row * pointsAcross + column
      const above = below + pointsAcross
      triangles.push(below, below + 1, above, below + 1, above + 1, above)
    }
  }
  return triangles
}
