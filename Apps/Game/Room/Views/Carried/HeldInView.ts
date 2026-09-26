import * as THREE from 'three'
import { middleHandIndex } from '../../../../../Shared/Simulation/Ritual/Reach.ts'
import type { HandIndex } from '../../../../../Shared/Simulation/State/SessionState.ts'
import type { HeldInView } from './CarriedItemsScene.ts'
import type { CarriedModel } from './CarriedModel.ts'

export type HeldInViewFrame = {
  readonly screenWidth: number
  readonly screenHeight: number
  readonly itemWidth: number
  readonly baseInCamera: THREE.Vector3
  readonly centreInCamera: THREE.Vector3
}

const sideHandTouchAreaShareOfScreenWidth = 0.42
const middleHandTouchAreaShareOfScreenWidth = 0.2
export const handTouchAreaShareOfScreenHeight = 0.2

const heldInViewDistanceMetres = 0.9
const middleHeldInViewDistanceMetres = 0.8
const middleHeldInViewShareOfScreenHeightFromBottom = 0.14
const heldInViewShareOfScreenWidth = 0.24
const heldInFirstPersonWidestShareOfScreenHeight = 0.3
const heldInViewShareOfScreenHeightFromBottom = 0.07
const chosenHeldLiftShareOfScreenHeight = 0.05
const heldInViewTiltTowardsCameraRadians = 0.55
const heldFacingTheEyesTiltRadians = 0.5
const heldFacingTheEyesRollInwardRadians = 0.2
const heldInViewInsetShareOfItemWidth = 0.8
const touchAreaCentreShareOfItsHeight = 0.4
const heldInViewMostShareOfScreenHeight = 0.2
const sipRiseShareOfScreenHeight = 0.1
const sipTowardTheMiddleShare = 0.35
const sipNearerShare = 0.12
const headInCamera = new THREE.Vector3(0, -0.1, 0.1)

export function holdInView(model: Pick<CarriedModel, 'root' | 'footprintRadius' | 'rimHeight'>, handIndex: HandIndex, heldInView: HeldInView): void {
  const { camera } = heldInView
  const frame = heldInViewFrame(heldInView, handIndex)
  model.root.position.copy(camera.localToWorld(frame.baseInCamera))
  model.root.quaternion.copy(heldInView.isFirstPerson ? turnFacingTheEyes(frame, camera, handIndex) : turnTiltedTowardsTheCamera(camera))
  const widthScale = frame.itemWidth / (2 * model.footprintRadius)
  const heightScale = (frame.screenHeight * heldInViewMostShareOfScreenHeight) / model.rimHeight
  model.root.scale.setScalar(Math.min(widthScale, heightScale))
}

export function raiseTowardTheEyes(model: Pick<CarriedModel, 'root'>, handIndex: HandIndex, heldInView: HeldInView, liftShare: number): void {
  const { camera } = heldInView
  const frame = heldInViewFrame(heldInView, handIndex)
  const atTheLips = new THREE.Vector3(frame.baseInCamera.x * (1 - sipTowardTheMiddleShare), frame.baseInCamera.y + frame.screenHeight * sipRiseShareOfScreenHeight, frame.baseInCamera.z * (1 - sipNearerShare))
  model.root.position.copy(camera.localToWorld(frame.baseInCamera.clone().lerp(atTheLips, liftShare)))
  const openingAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(model.root.quaternion)
  const towardTheHead = headOf(camera).sub(model.root.position).normalize()
  const openingFacingTheHead = new THREE.Quaternion().setFromUnitVectors(openingAxis, towardTheHead)
  model.root.quaternion.premultiply(new THREE.Quaternion().slerp(openingFacingTheHead, liftShare))
}

export function headOf(camera: THREE.Camera): THREE.Vector3 {
  return camera.localToWorld(headInCamera.clone())
}

function turnFacingTheEyes(frame: HeldInViewFrame, camera: THREE.Camera, handIndex: HandIndex): THREE.Quaternion {
  const sightLine = frame.centreInCamera.clone().normalize()
  const alongTheSightLine = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), sightLine)
  const side = handIndex === middleHandIndex ? 0 : handIndex === 0 ? -1 : 1
  const topLeaningInward = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * heldFacingTheEyesRollInwardRadians)
  const tiltedTowardsTheEyes = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), heldFacingTheEyesTiltRadians)
  return camera.quaternion.clone().multiply(alongTheSightLine).multiply(topLeaningInward).multiply(tiltedTowardsTheEyes)
}

function turnTiltedTowardsTheCamera(camera: THREE.Camera): THREE.Quaternion {
  return camera.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), heldInViewTiltTowardsCameraRadians))
}

export function heldInViewFrame(heldInView: HeldInView, handIndex: HandIndex): HeldInViewFrame {
  const { camera, chosenHandIndex } = heldInView
  const isMiddle = handIndex === middleHandIndex
  const distance = isMiddle ? middleHeldInViewDistanceMetres : heldInViewDistanceMetres
  const screenHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const screenWidth = screenHeight * camera.aspect
  const itemWidth = heldInView.isFirstPerson ? Math.min(screenWidth * heldInViewShareOfScreenWidth, screenHeight * heldInFirstPersonWidestShareOfScreenHeight) : screenWidth * heldInViewShareOfScreenWidth
  const side = handIndex === 0 ? -1 : 1
  const x = isMiddle ? 0 : side * (screenWidth / 2 - itemWidth * heldInViewInsetShareOfItemWidth)
  const lift = chosenHandIndex === handIndex ? screenHeight * chosenHeldLiftShareOfScreenHeight : 0
  const fromBottom = isMiddle ? middleHeldInViewShareOfScreenHeightFromBottom : heldInViewShareOfScreenHeightFromBottom
  const bottom = -screenHeight / 2 + screenHeight * (fromBottom + heldInView.screenHeightShareTakenByControls) + lift
  return {
    screenWidth,
    screenHeight,
    itemWidth,
    baseInCamera: new THREE.Vector3(x, bottom, -distance),
    centreInCamera: new THREE.Vector3(x, bottom + screenHeight * handTouchAreaShareOfScreenHeight * touchAreaCentreShareOfItsHeight, -distance),
  }
}

export function handTouchAreaShareOfScreenWidthFor(handIndex: HandIndex): number {
  return handIndex === middleHandIndex ? middleHandTouchAreaShareOfScreenWidth : sideHandTouchAreaShareOfScreenWidth
}
