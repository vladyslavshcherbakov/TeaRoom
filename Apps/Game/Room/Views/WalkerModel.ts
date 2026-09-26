import * as THREE from 'three'
import { GooglyPupil, type EyePlaneVector } from '../GooglyPupil.ts'
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
const googlyEyeRadiusMetres = 0.036
const googlyPupilRadiusMetres = 0.017
const googlyEyesApartMetres = 0.11
const googlyEyeDepthMetres = 0.008
const googlyEyesTurnOutwardRadians = 0.3
const hardestHeadShakeMetresPerSecondSquared = 60
const giantAfroScale = 3
const giantAfroGrowsFrom = new THREE.Vector3(0, headHeightMetres, headRadiusMetres)

type GooglyEye = {
  readonly pupilMesh: THREE.Mesh
  readonly pupil: GooglyPupil
}

type HeadMotion = {
  readonly timeSeconds: number
  readonly position: THREE.Vector3
  readonly velocity: THREE.Vector3
}

export class WalkerModel {
  readonly root = new THREE.Group()
  private readonly body: THREE.Mesh
  private readonly faces: Record<FaceFeature, THREE.Object3D>
  private readonly dottedEyes: THREE.Object3D
  private readonly googlyEyesPair = new THREE.Group()
  private readonly googlyEyes: readonly GooglyEye[]
  private headMotion: HeadMotion | null = null
  private chosenFace: FaceFeature = 'nose'
  private isEveryFaceShown = false

  constructor(materials: RoomMaterials) {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), materials.unsharedMaterialFor('walkerCoat'))
    body.position.y = 0.45
    this.body = body
    const head = new THREE.Mesh(new THREE.SphereGeometry(headRadiusMetres, 12, 10), materials.materialFor('walkerSkin'))
    head.position.y = headHeightMetres
    this.dottedEyes = eyes(materials)
    this.googlyEyes = [-1, 1].map((side) => this.googlyEye(materials, side))
    this.googlyEyesPair.visible = false
    this.faces = { nose: nose(materials), eyes: new THREE.Group().add(this.dottedEyes, this.googlyEyesPair), ears: ears(materials), afro: afro(materials) }
    this.root.add(body, head, ...Object.values(this.faces))
    this.root.traverse((part) => (part.castShadow = true))
  }

  paintTheBody(colour: string): void {
    const material = this.body.material
    if (material instanceof THREE.MeshStandardMaterial) material.color.set(colour)
  }

  showTheFace(feature: FaceFeature): void {
    this.chosenFace = feature
    this.showTheFaces()
  }

  showEveryFaceAtOnce(isEveryFaceShown: boolean): void {
    this.isEveryFaceShown = isEveryFaceShown
    this.showTheFaces()
  }

  growTheAfroGiant(isGiant: boolean): void {
    const scale = isGiant ? giantAfroScale : 1
    this.faces.afro.scale.setScalar(scale)
    this.faces.afro.position.copy(giantAfroGrowsFrom).multiplyScalar(1 - scale)
  }

  showGooglyEyes(areGoogly: boolean): void {
    this.googlyEyesPair.visible = areGoogly
    this.dottedEyes.visible = !areGoogly
  }

  get shadowPose(): string {
    const { position, rotation } = this.root
    return this.root.visible ? `walker ${position.x.toFixed(3)} ${position.y.toFixed(3)} ${position.z.toFixed(3)} ${rotation.y.toFixed(3)}` : 'walker hidden'
  }

  show(walk: Walk, timeSeconds: number): void {
    const bob = isWalking(walk) ? Math.abs(Math.sin(timeSeconds * stepsPerSecond * Math.PI)) * bobHeightMetres : 0
    this.root.position.set(walk.position.x, bob, walk.position.z)
    this.root.rotation.y = walk.headingRadians
    if (this.googlyEyesPair.visible && this.faces.eyes.visible) this.shakeTheGooglyEyes(timeSeconds)
  }

  private showTheFaces(): void {
    for (const [feature, face] of Object.entries(this.faces)) face.visible = this.isEveryFaceShown || feature === this.chosenFace
  }

  private shakeTheGooglyEyes(timeSeconds: number): void {
    const position = new THREE.Vector3(0, headHeightMetres, headRadiusMetres).applyMatrix4(new THREE.Matrix4().compose(this.root.position, this.root.quaternion, this.root.scale))
    const before = this.headMotion
    const seconds = before === null ? 0 : timeSeconds - before.timeSeconds
    const velocity = before === null || seconds <= 0 ? new THREE.Vector3() : position.clone().sub(before.position).divideScalar(seconds)
    const acceleration = before === null || seconds <= 0 ? new THREE.Vector3() : velocity.clone().sub(before.velocity).divideScalar(seconds).clampLength(0, hardestHeadShakeMetresPerSecondSquared)
    this.headMotion = { timeSeconds, position, velocity }
    if (seconds <= 0) return
    const accelerationInTheEyes = this.inTheEyePlane(acceleration)
    for (const eye of this.googlyEyes) {
      eye.pupil.advance(seconds, accelerationInTheEyes)
      eye.pupilMesh.position.set(eye.pupil.offset.x, eye.pupil.offset.y, googlyEyeDepthMetres)
    }
  }

  private inTheEyePlane(acceleration: THREE.Vector3): EyePlaneVector {
    const heading = this.root.rotation.y
    return { x: acceleration.x * Math.cos(heading) - acceleration.z * Math.sin(heading), y: acceleration.y }
  }

  private googlyEye(materials: RoomMaterials, side: number): GooglyEye {
    const eye = new THREE.Group()
    const white = new THREE.Mesh(new THREE.CylinderGeometry(googlyEyeRadiusMetres, googlyEyeRadiusMetres, googlyEyeDepthMetres, 20).rotateX(Math.PI / 2), materials.materialFor('googlyEyeWhite'))
    const pupilMesh = new THREE.Mesh(new THREE.CylinderGeometry(googlyPupilRadiusMetres, googlyPupilRadiusMetres, googlyEyeDepthMetres / 2, 16).rotateX(Math.PI / 2), materials.materialFor('walkerEye'))
    eye.add(white, pupilMesh)
    const x = (side * googlyEyesApartMetres) / 2
    const y = eyesAboveTheHeadsMiddleMetres
    eye.position.set(x, headHeightMetres + y, Math.sqrt(headRadiusMetres ** 2 - x ** 2 - y ** 2))
    eye.rotation.y = side * googlyEyesTurnOutwardRadians
    this.googlyEyesPair.add(eye)
    return { pupilMesh, pupil: new GooglyPupil(googlyEyeRadiusMetres - googlyPupilRadiusMetres) }
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
