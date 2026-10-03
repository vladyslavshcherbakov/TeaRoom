import * as THREE from 'three'
import type { ItemInspectionView } from '../../../Gestures/ItemInspection.ts'
import type { CarriedModel } from '../CarriedModel.ts'

export type InspectedInView = {
  readonly camera: THREE.PerspectiveCamera
  readonly inspection: ItemInspectionView
}

export const inspectedDistanceMetres = 0.6

const unzoomedSizeShareOfTheNarrowerSide = 0.6

export function inspectInView(model: Pick<CarriedModel, 'root' | 'bodyRadius' | 'heightMetres'>, inspected: InspectedInView): void {
  const { camera, inspection } = inspected
  const screenHeight = 2 * inspectedDistanceMetres * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const narrowerSide = Math.min(screenHeight, screenHeight * camera.aspect)
  const itemSize = Math.max(2 * model.bodyRadius, model.heightMetres)
  const scale = (narrowerSide * unzoomedSizeShareOfTheNarrowerSide * inspection.magnification) / itemSize
  const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(inspection.pitchRadians, inspection.yawRadians, 0, 'XYZ'))
  model.root.quaternion.copy(camera.quaternion).multiply(turn)
  model.root.scale.setScalar(scale)
  const baseToTheMiddle = new THREE.Vector3(0, (model.heightMetres / 2) * scale, 0).applyQuaternion(model.root.quaternion)
  model.root.position.copy(camera.localToWorld(new THREE.Vector3(0, 0, -inspectedDistanceMetres))).sub(baseToTheMiddle)
}
