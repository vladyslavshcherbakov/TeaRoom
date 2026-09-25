import * as THREE from 'three'
import type { FaceFeature } from '../RoomSettings.ts'
import { isWalking, type Walk } from '../Walking/Walk.ts'
import type { RoomMaterials } from './RoomMaterials.ts'

const bobHeightMetres = 0.03
const stepsPerSecond = 4
const headHeightMetres = 0.95
const headRadiusMetres = 0.14
const eyeRadiusMetres = 0.022
const eyesApartMetres = 0.1
const eyesAboveTheHeadsMiddleMetres = 0.03
const earRadiusMetres = 0.068
const earFlatness = 0.35
const earsStickOutMetres = 0.012
const earsTurnForwardRadians = 0.35
const curlCount = 170
const curlRadiusMetres = 0.045
const afroRadiiMetres = { across: 0.24, up: 0.23, along: 0.23 }
const afroCentre = { y: 1.08, z: -0.07 }
const afroFillingShare = 0.85
const faceLeftOpenBelowMetres = 1.07
const faceLeftOpenFromMetres = 0.06

export class WalkerModel {
  readonly root = new THREE.Group()
  private readonly body: THREE.Mesh
  private readonly faces: Record<FaceFeature, THREE.Object3D>

  constructor(materials: RoomMaterials) {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), materials.unsharedMaterialFor('walkerCoat'))
    body.position.y = 0.45
    this.body = body
    const head = new THREE.Mesh(new THREE.SphereGeometry(headRadiusMetres, 12, 10), materials.materialFor('walkerSkin'))
    head.position.y = headHeightMetres
    this.faces = { nose: nose(materials), eyes: eyes(materials), ears: ears(materials), afro: afro(materials) }
    this.root.add(body, head, ...Object.values(this.faces))
    this.root.traverse((part) => (part.castShadow = true))
  }

  paintTheBody(colour: string): void {
    const material = this.body.material
    if (material instanceof THREE.MeshStandardMaterial) material.color.set(colour)
  }

  showTheFace(feature: FaceFeature): void {
    for (const [shownFeature, face] of Object.entries(this.faces)) face.visible = shownFeature === feature
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

function nose(materials: RoomMaterials): THREE.Object3D {
  const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), materials.materialFor('walkerSkin'))
  noseMesh.position.set(0, headHeightMetres, headRadiusMetres)
  return noseMesh
}

function eyes(materials: RoomMaterials): THREE.Object3D {
  const pair = new THREE.Group()
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeRadiusMetres, 8, 6), materials.materialFor('walkerEye'))
    const x = (side * eyesApartMetres) / 2
    const y = eyesAboveTheHeadsMiddleMetres
    eye.position.set(x, headHeightMetres + y, Math.sqrt(headRadiusMetres ** 2 - x ** 2 - y ** 2) - eyeRadiusMetres * 0.4)
    pair.add(eye)
  }
  return pair
}

function ears(materials: RoomMaterials): THREE.Object3D {
  const pair = new THREE.Group()
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(earRadiusMetres, 10, 8), materials.materialFor('walkerSkin'))
    ear.scale.set(earFlatness, 1, 0.75)
    ear.position.set(side * (headRadiusMetres + earsStickOutMetres), headHeightMetres, -0.01)
    ear.rotation.y = side * earsTurnForwardRadians
    pair.add(ear)
  }
  return pair
}

function afro(materials: RoomMaterials): THREE.Object3D {
  const hair = materials.materialFor('walkerHair')
  const cloud = new THREE.Group()
  const filling = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), hair)
  filling.scale.set(afroRadiiMetres.across * afroFillingShare, afroRadiiMetres.up * afroFillingShare, afroRadiiMetres.along * afroFillingShare)
  filling.position.set(0, afroCentre.y, afroCentre.z)
  const curls = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(curlRadiusMetres, 1), hair, curlCount)
  const placement = new THREE.Object3D()
  let placed = 0
  for (let index = 0; index < curlCount; index += 1) {
    const point = pointOnTheAfro(index)
    if (isOverTheFace(point)) continue
    placement.position.copy(point)
    placement.rotation.set(index * 1.3, index * 2.1, 0)
    placement.scale.setScalar(0.8 + ((index * 37) % 10) / 25)
    placement.updateMatrix()
    curls.setMatrixAt(placed, placement.matrix)
    placed += 1
  }
  curls.count = placed
  cloud.add(filling, curls)
  return cloud
}

function pointOnTheAfro(index: number): THREE.Vector3 {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const up = 1 - (2 * (index + 0.5)) / curlCount
  const around = Math.sqrt(1 - up * up)
  const angle = index * goldenAngle
  return new THREE.Vector3(Math.cos(angle) * around * afroRadiiMetres.across, afroCentre.y + up * afroRadiiMetres.up, afroCentre.z + Math.sin(angle) * around * afroRadiiMetres.along)
}

function isOverTheFace(point: THREE.Vector3): boolean {
  return point.z > faceLeftOpenFromMetres && point.y < faceLeftOpenBelowMetres
}
