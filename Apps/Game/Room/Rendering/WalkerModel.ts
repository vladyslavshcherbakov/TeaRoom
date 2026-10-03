import * as THREE from 'three'
import { GooglyPupil, type EyePlaneVector } from '../../../Engine/GooglyPupil.ts'
import type { FaceFeature, ObjectDetail } from '../RoomSettings.ts'
import { isWalking, type Walk } from '../../../Engine/Walking/Walk.ts'
import type { RoomMaterials } from './RoomMaterials.ts'
import { SparrowModel } from './SparrowModel.ts'
import type { SparrowAnimation } from '../SparrowAnimations.ts'
import type { AppLog } from '../../../Engine/AppLog.ts'

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
const sparrowSinksIntoTheCurlsMetres = 0.02
const isTheSparrowShadowCastIn: Readonly<Record<ObjectDetail, boolean>> = { full: true, reduced: false }

type GooglyEye = {
  readonly eye: THREE.Object3D
  readonly pupilMesh: THREE.Mesh
  readonly pupil: GooglyPupil
}

type HeadMotion = {
  readonly timeSeconds: number
  readonly position: THREE.Vector3
  readonly velocity: THREE.Vector3
}

export class WalkerModel {
  private readonly body: THREE.Mesh
  private readonly faces: Record<FaceFeature, THREE.Object3D>
  private readonly googlyEyes: readonly GooglyEye[]
  private readonly sparrow: SparrowModel
  private lastShownSeconds: number | null = null
  private headMotion: HeadMotion | null = null
  readonly root = new THREE.Group()

  constructor(materials: RoomMaterials, sparrowAnimation: SparrowAnimation, log: AppLog) {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), materials.unsharedMaterialFor('walkerCoat'))
    body.position.y = 0.45
    this.body = body
    const head = new THREE.Mesh(new THREE.SphereGeometry(headRadiusMetres, 12, 10), materials.materialFor('walkerSkin'))
    head.position.y = headHeightMetres
    this.googlyEyes = [-1, 1].map((side) => googlyEye(materials, side))
    this.sparrow = new SparrowModel(sparrowAnimation, log)
    this.faces = { nose: nose(materials), eyes: eyes(materials), googlyEyes: new THREE.Group().add(...this.googlyEyes.map((eye) => eye.eye)), ears: ears(materials), afro: afro(materials), giantAfro: giantAfro(materials, this.sparrow.root) }
    this.showTheFaces(['nose'])
    this.root.add(body, head, ...Object.values(this.faces))
    this.root.traverse((part) => (part.castShadow = true))
  }

  get shadowPose(): string {
    const { position, rotation } = this.root
    if (!this.root.visible) return 'walker hidden'
    const shownFaces = Object.entries(this.faces).filter(([, face]) => face.visible).map(([feature]) => feature).join('+')
    return `walker ${position.x.toFixed(3)} ${position.y.toFixed(3)} ${position.z.toFixed(3)} ${rotation.y.toFixed(3)} with ${shownFaces}, ${this.sparrow.shadowPose}`
  }

  paintTheBody(colour: string): void {
    const material = this.body.material
    if (material instanceof THREE.MeshStandardMaterial) material.color.set(colour)
  }

  showTheSparrowShadow(objectDetail: ObjectDetail): void {
    this.sparrow.castAShadow(isTheSparrowShadowCastIn[objectDetail])
  }

  playTheSparrowAnimation(animation: SparrowAnimation): void {
    this.sparrow.play(animation)
  }

  showTheFaces(featuresShown: readonly FaceFeature[]): void {
    for (const [feature, face] of Object.entries(this.faces)) face.visible = featuresShown.some((shown) => shown === feature)
  }

  show(walk: Walk, timeSeconds: number): void {
    const bob = isWalking(walk) ? Math.abs(Math.sin(timeSeconds * stepsPerSecond * Math.PI)) * bobHeightMetres : 0
    this.root.position.set(walk.position.x, bob, walk.position.z)
    this.root.rotation.y = walk.headingRadians
    if (this.faces.googlyEyes.visible) this.shakeTheGooglyEyes(timeSeconds)
    if (this.lastShownSeconds !== null && this.faces.giantAfro.visible) this.sparrow.advance(Math.max(0, timeSeconds - this.lastShownSeconds))
    this.lastShownSeconds = timeSeconds
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

function googlyEye(materials: RoomMaterials, side: number): GooglyEye {
  const eye = new THREE.Group()
  const white = new THREE.Mesh(new THREE.CylinderGeometry(googlyEyeRadiusMetres, googlyEyeRadiusMetres, googlyEyeDepthMetres, 20).rotateX(Math.PI / 2), materials.materialFor('googlyEyeWhite'))
  const pupilMesh = new THREE.Mesh(new THREE.CylinderGeometry(googlyPupilRadiusMetres, googlyPupilRadiusMetres, googlyEyeDepthMetres / 2, 16).rotateX(Math.PI / 2), materials.materialFor('walkerEye'))
  eye.add(white, pupilMesh)
  const x = (side * googlyEyesApartMetres) / 2
  const y = eyesAboveTheHeadsMiddleMetres
  eye.position.set(x, headHeightMetres + y, Math.sqrt(headRadiusMetres ** 2 - x ** 2 - y ** 2))
  eye.rotation.y = side * googlyEyesTurnOutwardRadians
  return { eye, pupilMesh, pupil: new GooglyPupil(googlyEyeRadiusMetres - googlyPupilRadiusMetres) }
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

function giantAfro(materials: RoomMaterials, sparrow: THREE.Object3D): THREE.Object3D {
  const cloud = afro(materials)
  sparrow.scale.setScalar(1 / giantAfroScale)
  sparrow.position.set(0, afroCentre.y + afroRadiiMetres.up + curlRadiusMetres - sparrowSinksIntoTheCurlsMetres, afroCentre.z)
  sparrow.rotation.y = Math.PI
  cloud.add(sparrow)
  cloud.scale.setScalar(giantAfroScale)
  cloud.position.copy(giantAfroGrowsFrom).multiplyScalar(1 - giantAfroScale)
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
