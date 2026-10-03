import * as THREE from 'three'
import type { HandIndex } from '../../../../../../Shared/GameLogic/GameLogic.ts'
import type { CarriedModel } from '../CarriedModel.ts'
import { roomLayers } from '../../RoomLayers.ts'
import type { TapTargetTag } from '../../../TapTarget.ts'

export type HeldInView = {
  readonly camera: THREE.PerspectiveCamera
  readonly isFirstPerson: boolean
  readonly screenHeightShareTakenByControls: number
}

export type HeldInViewFrame = {
  readonly screenWidth: number
  readonly screenHeight: number
  readonly itemWidth: number
  readonly baseInCamera: THREE.Vector3
  readonly centreInCamera: THREE.Vector3
}

const handTouchAreaShareOfItemWidth = 1.3
const handTouchAreaShareOfScreenHeight = 0.16

const heldInViewDistanceMetres = 0.9
const heldInViewShareOfScreenWidth = 0.16
const heldInFirstPersonWidestShareOfScreenHeight = 0.2
const heldInViewShareOfScreenHeightFromBottom = 0.045
const heldInViewTiltTowardsCameraRadians = 0.55
const heldFacingTheEyesTiltRadians = 0.5
const heldFacingTheEyesRollInwardRadians = 0.2
const heldInViewCentreShareOfScreenWidthFromTheEdge = 0.16
const touchAreaCentreShareOfItsHeight = 0.4
const heldInViewMostShareOfScreenHeight = 0.137
const sipRiseShareOfScreenHeight = 0.1
const sipTowardTheMiddleShare = 0.35
const sipNearerShare = 0.12
const headInCamera = new THREE.Vector3(0, -0.1, 0.1)
const mostSipTiltRadians = (40 * Math.PI) / 180

export function holdInView(model: Pick<CarriedModel, 'root' | 'bodyRadius' | 'heightMetres'>, handIndex: HandIndex, heldInView: HeldInView): void {
  const { camera } = heldInView
  const frame = heldInViewFrame(heldInView, handIndex)
  model.root.position.copy(camera.localToWorld(frame.baseInCamera))
  model.root.quaternion.copy(heldInView.isFirstPerson ? turnFacingTheEyes(frame, camera, handIndex) : turnTiltedTowardsTheCamera(camera))
  const widthScale = frame.itemWidth / (2 * model.bodyRadius)
  const heightScale = (frame.screenHeight * heldInViewMostShareOfScreenHeight) / model.heightMetres
  model.root.scale.setScalar(Math.min(widthScale, heightScale))
}

export function turnTiltedTowardsTheCamera(camera: THREE.Camera): THREE.Quaternion {
  return camera.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), heldInViewTiltTowardsCameraRadians))
}

export function handAreaOnTheScreen(handIndex: HandIndex): THREE.Mesh {
  const area = roomLayers.touchAreaOf(new THREE.PlaneGeometry(1, 1))
  const tag: TapTargetTag = { kind: 'hand', handIndex }
  area.userData = { tapTarget: tag }
  return area
}

export function placeTheHandsAreaOnTheScreen(area: THREE.Object3D, handIndex: HandIndex, heldInView: HeldInView): void {
  const frame = heldInViewFrame(heldInView, handIndex)
  area.position.copy(heldInView.camera.localToWorld(frame.centreInCamera))
  area.quaternion.copy(heldInView.camera.quaternion)
  area.scale.set(frame.itemWidth * handTouchAreaShareOfItemWidth, frame.screenHeight * handTouchAreaShareOfScreenHeight, 1)
}

export function raiseTowardTheEyes(model: Pick<CarriedModel, 'root'>, handIndex: HandIndex, heldInView: HeldInView, liftShare: number): void {
  const { camera } = heldInView
  const frame = heldInViewFrame(heldInView, handIndex)
  const atTheLips = new THREE.Vector3(frame.baseInCamera.x * (1 - sipTowardTheMiddleShare), frame.baseInCamera.y + frame.screenHeight * sipRiseShareOfScreenHeight, frame.baseInCamera.z * (1 - sipNearerShare))
  model.root.position.copy(camera.localToWorld(frame.baseInCamera.clone().lerp(atTheLips, liftShare)))
  const openingAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(model.root.quaternion)
  const openingTiltedTowardTheHead = sipAxisToward(headOf(camera).sub(model.root.position).normalize())
  const openingFacingTheHead = new THREE.Quaternion().setFromUnitVectors(openingAxis, openingTiltedTowardTheHead)
  model.root.quaternion.premultiply(new THREE.Quaternion().slerp(openingFacingTheHead, liftShare))
}

function sipAxisToward(towardTheHead: THREE.Vector3): THREE.Vector3 {
  const up = new THREE.Vector3(0, 1, 0)
  const tiltToTheHead = up.angleTo(towardTheHead)
  const tiltShown = Math.min(1, mostSipTiltRadians / Math.max(tiltToTheHead, Number.EPSILON))
  return up.clone().applyQuaternion(new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(up, towardTheHead), tiltShown))
}

function headOf(camera: THREE.Camera): THREE.Vector3 {
  return camera.localToWorld(headInCamera.clone())
}

function turnFacingTheEyes(frame: HeldInViewFrame, camera: THREE.Camera, handIndex: HandIndex): THREE.Quaternion {
  const sightLine = frame.centreInCamera.clone().normalize()
  const alongTheSightLine = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), sightLine)
  const side = handIndex === 0 ? -1 : 1
  const topLeaningInward = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * heldFacingTheEyesRollInwardRadians)
  const tiltedTowardsTheEyes = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), heldFacingTheEyesTiltRadians)
  return camera.quaternion.clone().multiply(alongTheSightLine).multiply(topLeaningInward).multiply(tiltedTowardsTheEyes)
}

export function heldInViewFrame(heldInView: HeldInView, handIndex: HandIndex): HeldInViewFrame {
  const { camera } = heldInView
  const distance = heldInViewDistanceMetres
  const screenHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const screenWidth = screenHeight * camera.aspect
  const itemWidth = heldInView.isFirstPerson ? Math.min(screenWidth * heldInViewShareOfScreenWidth, screenHeight * heldInFirstPersonWidestShareOfScreenHeight) : screenWidth * heldInViewShareOfScreenWidth
  const side = handIndex === 0 ? -1 : 1
  const x = side * screenWidth * (0.5 - heldInViewCentreShareOfScreenWidthFromTheEdge)
  const bottom = -screenHeight / 2 + screenHeight * (heldInViewShareOfScreenHeightFromBottom + heldInView.screenHeightShareTakenByControls)
  return {
    screenWidth,
    screenHeight,
    itemWidth,
    baseInCamera: new THREE.Vector3(x, bottom, -distance),
    centreInCamera: new THREE.Vector3(x, bottom + screenHeight * handTouchAreaShareOfScreenHeight * touchAreaCentreShareOfItsHeight, -distance),
  }
}
