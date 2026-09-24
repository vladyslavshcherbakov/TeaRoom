import * as THREE from 'three'

export type LeafShape = 'needle' | 'ball' | 'chunk'

export type LeafLook = {
  readonly colour: string
  readonly shape: LeafShape
}

export type LeafPileSize = {
  readonly leafCount: number
  readonly radiusMetres: number
  readonly heightMetres: number
}

const leafLooksByTeaId: Readonly<Record<string, LeafLook>> = {
  sencha: { colour: '#3f5f24', shape: 'needle' },
  oolong: { colour: '#4a5a2c', shape: 'ball' },
  shouPuerh: { colour: '#3b2417', shape: 'chunk' },
}

const unknownTeaLook: LeafLook = { colour: '#4d4a2a', shape: 'needle' }
const shadeSpread = 0.35
const smallestLeafScale = 0.7
const leafScaleSpread = 0.6
const layoutSeed = 20260924

export function leafLookFor(teaId: string | null): LeafLook {
  return teaId === null ? unknownTeaLook : (leafLooksByTeaId[teaId] ?? unknownTeaLook)
}

export class LeafPile {
  readonly mesh: THREE.InstancedMesh
  private readonly leafCount: number

  constructor(look: LeafLook, size: LeafPileSize) {
    this.leafCount = size.leafCount
    const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, flatShading: true })
    this.mesh = new THREE.InstancedMesh(leafGeometryOf(look.shape), material, size.leafCount)
    this.mesh.castShadow = false
    this.mesh.receiveShadow = true
    layOutLeaves(this.mesh, look, size)
  }

  showFill(share: number): void {
    const shownCount = Math.round(this.leafCount * Math.min(1, Math.max(0, share)))
    this.mesh.count = shownCount
    this.mesh.visible = shownCount > 0
  }
}

function leafGeometryOf(shape: LeafShape): THREE.BufferGeometry {
  switch (shape) {
    case 'needle':
      return new THREE.BoxGeometry(0.024, 0.004, 0.006)
    case 'ball':
      return new THREE.IcosahedronGeometry(0.006, 0)
    case 'chunk':
      return new THREE.DodecahedronGeometry(0.007, 0).scale(1, 0.6, 1)
  }
}

function layOutLeaves(mesh: THREE.InstancedMesh, look: LeafLook, size: LeafPileSize): void {
  const nextRandom = seededRandom(layoutSeed)
  const leaf = new THREE.Object3D()
  const baseColour = new THREE.Color(look.colour)
  for (let index = 0; index < size.leafCount; index += 1) {
    const angle = nextRandom() * Math.PI * 2
    const distanceFromCentre = Math.sqrt(nextRandom()) * size.radiusMetres
    const height = (index / size.leafCount) * size.heightMetres
    leaf.position.set(Math.cos(angle) * distanceFromCentre, height, Math.sin(angle) * distanceFromCentre)
    leaf.rotation.set(nextRandom() * Math.PI, nextRandom() * Math.PI * 2, nextRandom() * Math.PI)
    leaf.scale.setScalar(smallestLeafScale + nextRandom() * leafScaleSpread)
    leaf.updateMatrix()
    mesh.setMatrixAt(index, leaf.matrix)
    mesh.setColorAt(index, baseColour.clone().multiplyScalar(1 - shadeSpread / 2 + nextRandom() * shadeSpread))
  }
}

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}
