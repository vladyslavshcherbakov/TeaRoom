import * as THREE from 'three'
import type { AimedPourView } from '../../AimedPour.ts'
import type { CarriedModel } from './CarriedModel.ts'

export type AimedModel = Pick<CarriedModel, 'root' | 'spoutTip' | 'footprintRadius'>

export type PourTargetModel = Pick<CarriedModel, 'root' | 'rimHeight'>

const spoutAboveTargetRimMetres = 0.1
const aimedVesselAboveTheSurfaceMetres = 0.01

export function aimOver(model: AimedModel, aim: AimedPourView, target: PourTargetModel): void {
  const tiltRadians = -THREE.MathUtils.degToRad(Math.max(0, aim.tiltDegrees))
  const turnRadians = Math.atan2(-aim.spoutDirection.z, aim.spoutDirection.x)
  const tipAfterTilt = model.spoutTip.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), tiltRadians).applyAxisAngle(new THREE.Vector3(0, 1, 0), turnRadians)
  const tipGoal = new THREE.Vector3(aim.spout.x, target.root.position.y + target.rimHeight + spoutAboveTargetRimMetres, aim.spout.z)
  model.root.visible = true
  model.root.rotation.set(0, turnRadians, tiltRadians)
  model.root.position.copy(tipGoal.sub(tipAfterTilt))
  const lowestBase = target.root.position.y + model.footprintRadius * Math.sin(-tiltRadians) + aimedVesselAboveTheSurfaceMetres
  model.root.position.y = Math.max(model.root.position.y, lowestBase)
}
