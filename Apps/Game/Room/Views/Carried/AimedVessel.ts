import * as THREE from 'three'
import type { AimedPourView } from '../../AimedPour.ts'
import { isATouchArea } from '../RoomLayers.ts'
import type { CarriedModel } from './CarriedModel.ts'

export type AimedModel = Pick<CarriedModel, 'root' | 'spoutTip' | 'footprintRadius'>

export type PourTargetModel = Pick<CarriedModel, 'root' | 'rimHeight'>

const spoutAboveTargetRimMetres = 0.1
const aimedVesselAboveTheSurfaceMetres = 0.01
const aimedVesselAboveWhatStandsBelowMetres = 0.01
const aimedVesselUnderTheCeilingMetres = 0.01
const tiltsTheLiftClears = [0, 10, 20, 30, 40, 50]
const liftByAimedRoot = new WeakMap<THREE.Object3D, { readonly key: string; readonly lift: number }>()

export function aimOver(model: AimedModel, aim: AimedPourView, target: PourTargetModel, standingBelow: readonly THREE.Object3D[], ceiling: number | null = null): void {
  const lift = liftClearAtEveryTilt(model, aim, target, standingBelow, ceiling)
  poseOver(model, aim, target, aim.tiltDegrees)
  model.root.position.y += lift
}

function poseOver(model: AimedModel, aim: AimedPourView, target: PourTargetModel, tiltDegrees: number): void {
  const tiltRadians = -THREE.MathUtils.degToRad(Math.max(0, tiltDegrees))
  const turnRadians = Math.atan2(-aim.spoutDirection.z, aim.spoutDirection.x)
  const tipAfterTilt = model.spoutTip.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), tiltRadians).applyAxisAngle(new THREE.Vector3(0, 1, 0), turnRadians)
  const tipGoal = new THREE.Vector3(aim.spout.x, target.root.position.y + target.rimHeight + spoutAboveTargetRimMetres, aim.spout.z)
  model.root.visible = true
  model.root.rotation.set(0, turnRadians, tiltRadians)
  model.root.position.copy(tipGoal.sub(tipAfterTilt))
}

function liftAboveTheSurfaceAt(model: AimedModel, target: PourTargetModel, tiltDegrees: number): number {
  const lowestBase = target.root.position.y + model.footprintRadius * Math.sin(THREE.MathUtils.degToRad(Math.max(0, tiltDegrees))) + aimedVesselAboveTheSurfaceMetres
  return Math.max(0, lowestBase - model.root.position.y)
}

function liftClearAtEveryTilt(model: AimedModel, aim: AimedPourView, target: PourTargetModel, standingBelow: readonly THREE.Object3D[], ceiling: number | null): number {
  const key = [aim.spout.x, aim.spout.z, aim.spoutDirection.x, aim.spoutDirection.z, target.root.position.y, ceiling ?? 'open', ...standingBelow.flatMap((root) => [root.position.x, root.position.y, root.position.z])].join(' ')
  const kept = liftByAimedRoot.get(model.root)
  if (kept?.key === key) return kept.lift
  const poses = tiltsTheLiftClears.map((tiltDegrees) => {
    poseOver(model, aim, target, tiltDegrees)
    const aboveTheSurface = liftAboveTheSurfaceAt(model, target, tiltDegrees)
    const topBeforeTheLift = highestDrawnPointOf(model.root)
    model.root.position.y += aboveTheSurface
    return { aboveTheSurface, clear: aboveTheSurface + liftThatClears(model.root, standingBelow), topBeforeTheLift }
  })
  const liftThatClearsBelow = Math.max(...poses.map((pose) => pose.clear))
  const highestLiftUnderTheCeiling = ceiling === null ? Number.POSITIVE_INFINITY : ceiling - aimedVesselUnderTheCeilingMetres - Math.max(...poses.map((pose) => pose.topBeforeTheLift))
  const lift = Math.max(Math.max(...poses.map((pose) => pose.aboveTheSurface)), Math.min(liftThatClearsBelow, highestLiftUnderTheCeiling))
  liftByAimedRoot.set(model.root, { key, lift })
  return lift
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

function highestDrawnPointOf(root: THREE.Object3D): number {
  return Math.max(...drawnPartBoundsUnder(root).map((bounds) => bounds.max.y))
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
