import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { Decal, roundDecalMask } from '../../Apps/Engine/Rendering/Decal.ts'

type Rectangle = { readonly left: number; readonly right: number; readonly back: number; readonly front: number }

const plateTopY = 0.9
const plateThicknessMetres = 0.08
const plate: Rectangle = { left: -0.5, right: 0.5, back: -0.3, front: 0.3 }
const hole: Rectangle = { left: 0, right: 0.3, back: -0.15, front: 0.15 }
const smallestUpwardNormal = 0.7
const roundingMetres = 1e-6

test('decal_overTheEdgeOfAHoleInAPlate_liesOnlyOnThePlatesTop', () => {
  const decal = new Decal(new THREE.MeshBasicMaterial())

  decal.projectDown(plateWithAHole(), { x: 0, y: plateTopY, z: 0 }, 0.3)

  const points = pointsOf(decal)
  assert.ok(points.length > 0, 'the decal has no points')
  assert.deepEqual(points.filter((point) => isInside(hole, point)), [], 'points over the hole')
  assert.deepEqual(normalsOf(decal).filter((normal) => normal.y < smallestUpwardNormal), [], 'points on a face that is not turned up')
})

test('decal_overTheEdgeOfAPlate_endsAtTheEdge', () => {
  const decal = new Decal(new THREE.MeshBasicMaterial())

  decal.projectDown(plateWithAHole(), { x: plate.right, y: plateTopY, z: 0 }, 0.3)

  assert.deepEqual(pointsOf(decal).filter((point) => point.x > plate.right + roundingMetres), [])
})

test('decal_projectedAgain_freesTheShapeItReplaces', () => {
  const decal = new Decal(new THREE.MeshBasicMaterial())
  decal.projectDown(plateWithAHole(), { x: -0.3, y: plateTopY, z: 0 }, 0.2)
  const replacedShape = decal.mesh.geometry
  let isReplacedShapeFreed = false
  replacedShape.addEventListener('dispose', () => (isReplacedShapeFreed = true))

  decal.projectDown(plateWithAHole(), { x: -0.3, y: plateTopY, z: 0 }, 0.25)

  assert.equal(isReplacedShapeFreed, true)
})

test('roundDecalMask_showsItsMiddleAndHidesItsCorners', () => {
  const mask = roundDecalMask()

  const { width, height, data } = mask.image
  const shownAt = (column: number, row: number): number | undefined => data?.[(row * width + column) * 4]
  assert.deepEqual([shownAt(width / 2, height / 2), shownAt(0, 0), shownAt(width - 1, height - 1)], [255, 0, 0])
})

function plateWithAHole(): THREE.Mesh[] {
  const pieces: Rectangle[] = [
    { left: plate.left, right: hole.left, back: plate.back, front: plate.front },
    { left: hole.right, right: plate.right, back: plate.back, front: plate.front },
    { left: hole.left, right: hole.right, back: plate.back, front: hole.back },
    { left: hole.left, right: hole.right, back: hole.front, front: plate.front },
  ]
  return pieces.map((piece) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(piece.right - piece.left, plateThicknessMetres, piece.front - piece.back))
    box.position.set((piece.left + piece.right) / 2, plateTopY - plateThicknessMetres / 2, (piece.back + piece.front) / 2)
    box.updateMatrixWorld(true)
    return box
  })
}

function pointsOf(decal: Decal): THREE.Vector3[] {
  const positions = decal.mesh.geometry.getAttribute('position')
  return Array.from({ length: positions.count }, (_, index) => new THREE.Vector3().fromBufferAttribute(positions, index))
}

function normalsOf(decal: Decal): THREE.Vector3[] {
  const normals = decal.mesh.geometry.getAttribute('normal')
  return Array.from({ length: normals.count }, (_, index) => new THREE.Vector3().fromBufferAttribute(normals, index))
}

function isInside(rectangle: Rectangle, point: THREE.Vector3): boolean {
  return point.x > rectangle.left + roundingMetres && point.x < rectangle.right - roundingMetres && point.z > rectangle.back + roundingMetres && point.z < rectangle.front - roundingMetres
}
