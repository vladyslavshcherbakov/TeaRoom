import * as THREE from 'three'
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

export const handTouchAreaShareOfScreenWidth = 0.42
export const handTouchAreaShareOfScreenHeight = 0.2

const heldInViewDistanceMetres = 0.9
const heldInViewShareOfScreenWidth = 0.24
const heldInViewShareOfScreenHeightFromBottom = 0.07
const chosenHeldLiftShareOfScreenHeight = 0.05
const heldInViewTiltTowardsCameraRadians = 0.55
const heldInViewInsetShareOfItemWidth = 0.8
const touchAreaCentreShareOfItsHeight = 0.4
const heldInViewMostShareOfScreenHeight = 0.2

export function holdInView(model: Pick<CarriedModel, 'root' | 'footprintRadius' | 'rimHeight'>, handIndex: HandIndex, heldInView: HeldInView): void {
  const { camera } = heldInView
  const frame = heldInViewFrame(heldInView, handIndex)
  model.root.position.copy(camera.localToWorld(frame.baseInCamera))
  model.root.quaternion.copy(camera.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), heldInViewTiltTowardsCameraRadians))
  const widthScale = frame.itemWidth / (2 * model.footprintRadius)
  const heightScale = (frame.screenHeight * heldInViewMostShareOfScreenHeight) / model.rimHeight
  model.root.scale.setScalar(Math.min(widthScale, heightScale))
}

export function heldInViewFrame(heldInView: HeldInView, handIndex: HandIndex): HeldInViewFrame {
  const { camera, chosenHandIndex } = heldInView
  const screenHeight = 2 * heldInViewDistanceMetres * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const screenWidth = screenHeight * camera.aspect
  const itemWidth = screenWidth * heldInViewShareOfScreenWidth
  const side = handIndex === 0 ? -1 : 1
  const x = side * (screenWidth / 2 - itemWidth * heldInViewInsetShareOfItemWidth)
  const lift = chosenHandIndex === handIndex ? screenHeight * chosenHeldLiftShareOfScreenHeight : 0
  const bottom = -screenHeight / 2 + screenHeight * heldInViewShareOfScreenHeightFromBottom + lift
  return {
    screenWidth,
    screenHeight,
    itemWidth,
    baseInCamera: new THREE.Vector3(x, bottom, -heldInViewDistanceMetres),
    centreInCamera: new THREE.Vector3(x, bottom + screenHeight * handTouchAreaShareOfScreenHeight * touchAreaCentreShareOfItsHeight, -heldInViewDistanceMetres),
  }
}
