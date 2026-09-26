import * as THREE from 'three'
import type { AimedPourView } from '../../AimedPour.ts'
import { isATouchArea } from '../RoomLayers.ts'
import type { CarriedModel } from './CarriedModel.ts'

export type AimedModel = Pick<CarriedModel, 'root' | 'spoutTip' | 'footprintRadius'>

export type PourTargetModel = Pick<CarriedModel, 'root' | 'rimHeight'>

const spoutAboveTargetRimMetres = 0.1
const aimedVesselAboveTheSurfaceMetres = 0.01
const aimedVesselAboveWhatStandsBelowMetres = 0.01

export function aimOver(model: AimedModel, aim: AimedPourView, target: PourTargetModel, standingBelow: readonly THREE.Object3D[]): void {
  const tiltRadians = -THREE.MathUtils.degToRad(Math.max(0, aim.tiltDegrees))
  const turnRadians = Math.atan2(-aim.spoutDirection.z, aim.spoutDirection.x)
  const tipAfterTilt = model.spoutTip.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), tiltRadians).applyAxisAngle(new THREE.Vector3(0, 1, 0), turnRadians)
  const tipGoal = new THREE.Vector3(aim.spout.x, target.root.position.y + target.rimHeight + spoutAboveTargetRimMetres, aim.spout.z)
  model.root.visible = true
  model.root.rotation.set(0, turnRadians, tiltRadians)
  model.root.position.copy(tipGoal.sub(tipAfterTilt))
  const lowestBase = target.root.position.y + model.footprintRadius * Math.sin(-tiltRadians) + aimedVesselAboveTheSurfaceMetres
  model.root.position.y = Math.max(model.root.position.y, lowestBase)
  model.root.position.y += liftThatClears(model.root, standingBelow)
}

function liftThatClears(aimed: THREE.Object3D, standingBelow: readonly THREE.Object3D[]): number {
  aimed.updateMatrixWorld(true)
  const aimedBounds = drawnPartBoundsUnder(aimed).reduce((all, bounds) => all.union(bounds), new THREE.Box3())
  const partsBelow = standingBelow.flatMap(drawnPartBoundsUnder).filter((bounds) => overlapsAcross(bounds, aimedBounds))
  if (partsBelow.length === 0) return 0
  let lift = 0
  const point = new THREE.Vector3()
  aimed.traverseVisible((part) => {
    if (!(part instanceof THREE.Mesh) || isATouchArea(part)) return
    const positions: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined = part.geometry.getAttribute('position')
    if (positions === undefined) return
    for (let index = 0; index < positions.count; index += 1) {
      point.fromBufferAttribute(positions, index).applyMatrix4(part.matrixWorld)
      for (const bounds of partsBelow) {
        const isAbove = point.x >= bounds.min.x && point.x <= bounds.max.x && point.z >= bounds.min.z && point.z <= bounds.max.z
        if (isAbove) lift = Math.max(lift, bounds.max.y + aimedVesselAboveWhatStandsBelowMetres - point.y)
      }
    }
  })
  return lift
}

function drawnPartBoundsUnder(root: THREE.Object3D): THREE.Box3[] {
  root.updateMatrixWorld(true)
  const partBounds: THREE.Box3[] = []
  root.traverseVisible((part) => {
    if (!(part instanceof THREE.Mesh) || isATouchArea(part)) return
    if (part.geometry.boundingBox === null) part.geometry.computeBoundingBox()
    const bounds = part.geometry.boundingBox?.clone().applyMatrix4(part.matrixWorld)
    if (bounds !== undefined && !bounds.isEmpty()) partBounds.push(bounds)
  })
  return partBounds
}

function overlapsAcross(bounds: THREE.Box3, other: THREE.Box3): boolean {
  return bounds.min.x <= other.max.x && bounds.max.x >= other.min.x && bounds.min.z <= other.max.z && bounds.max.z >= other.min.z
}
