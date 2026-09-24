import * as THREE from 'three'
import { faucetSpout, type CarriedShape } from '../../RoomLayout.ts'
import type { RoomMaterials } from '../RoomMaterials.ts'
import type { CarriedItemsScene } from './CarriedItemsScene.ts'
import type { CarriedModel } from './CarriedModel.ts'
import { CreepingStream } from './CreepingStream.ts'
import { FallingStream } from './FallingStream.ts'
import { kettleShape } from './KettleShape.ts'

type PointOnTheSide = {
  readonly distance: number
  readonly height: number
}

const streamRadiusMetres = 0.007
const smallestVisibleTiltDegrees = 10
const pourStreamEndsAboveTheTargetMetres = 0.01
const overflowSideFromTheGaugeRadians = 0.7
const overflowAboveTheSurfaceMetres = 0.005
const overflowLeavesTheKettleAtRadians = 2.4
const overflowPointsOnTheKettle = 12
const overflowStreamRadiusMetres = 0.009

export class WaterStreams {
  private readonly pouredLiquid: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial
  private readonly pourStream: FallingStream
  private readonly tapStream: FallingStream
  private readonly overflowStream: CreepingStream
  private readonly overflowPathByShape = new Map<CarriedShape, THREE.TubeGeometry>()
  readonly meshes: readonly THREE.Object3D[]

  constructor(materials: RoomMaterials) {
    this.pouredLiquid = materials.unsharedMaterialFor('pouredLiquid')
    this.pourStream = new FallingStream(streamRadiusMetres, this.pouredLiquid)
    this.tapStream = new FallingStream(streamRadiusMetres, materials.unsharedMaterialFor('tapWater'))
    this.overflowStream = new CreepingStream(materials.unsharedMaterialFor('tapWater'))
    this.meshes = [this.pourStream.mesh, this.tapStream.mesh, this.overflowStream.mesh]
  }

  show(scene: CarriedItemsScene, models: readonly CarriedModel[]): void {
    this.showPour(scene, models)
    this.showTapWater(scene, models)
  }

  private showPour(scene: CarriedItemsScene, models: readonly CarriedModel[]): void {
    const pour = scene.state.pour
    const source = models.find((model) => model.itemId === pour?.sourceId)
    const target = models.find((model) => model.itemId === pour?.targetId)
    const isStreamShown = pour !== null && pour.tiltDegrees >= smallestVisibleTiltDegrees && source !== undefined && target !== undefined
    if (!isStreamShown || source === undefined || target === undefined) return this.pourStream.show(null, scene.timeSeconds)
    const top = source.root.localToWorld(source.spoutTip.clone())
    this.pourStream.show({ top, bottomY: target.root.position.y + pourStreamEndsAboveTheTargetMetres }, scene.timeSeconds)
    const pouredColour = scene.table.vessels[source.itemId]?.liquorColour
    if (pouredColour !== undefined) this.pouredLiquid.color.set(pouredColour)
  }

  private showTapWater(scene: CarriedItemsScene, models: readonly CarriedModel[]): void {
    const filled = models.find((model) => model.itemId === scene.state.filling?.vesselId)
    const isRunningOverTheLid = scene.state.filling?.isRunningOverTheLid === true
    const isOverflowing = filled !== undefined && scene.state.filling?.hasOverflowed === true && !isRunningOverTheLid
    this.overflowStream.show(isOverflowing ? { path: this.overflowPathOf(filled), position: filled.root.position, quaternion: filled.root.quaternion } : null, scene.timeSeconds)
    if (filled === undefined) return this.tapStream.show(null, scene.timeSeconds)
    const bottomY = filled.root.position.y + filled.rimHeight * (isRunningOverTheLid ? 1 : 0.5)
    this.tapStream.show({ top: new THREE.Vector3(faucetSpout.x, faucetSpout.y, faucetSpout.z), bottomY }, scene.timeSeconds)
  }

  private overflowPathOf(model: CarriedModel): THREE.TubeGeometry {
    const known = this.overflowPathByShape.get(model.shape)
    if (known !== undefined) return known
    const side = new THREE.Vector3(Math.sin(overflowSideFromTheGaugeRadians), 0, Math.cos(overflowSideFromTheGaugeRadians))
    const pointsOnTheSide = model.shape === 'kettle' ? pointsDownTheKettle() : pointsDownAStraightSide(model)
    const lastOnTheSide = pointsOnTheSide[pointsOnTheSide.length - 1] ?? { distance: 0, height: 0 }
    const points = [...pointsOnTheSide, { distance: lastOnTheSide.distance, height: 0 }].map(({ distance, height }) => side.clone().multiplyScalar(distance).setY(height))
    const path = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, overflowStreamRadiusMetres, 6, false)
    this.overflowPathByShape.set(model.shape, path)
    return path
  }
}

function pointsDownTheKettle(): PointOnTheSide[] {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash, openingAngle } = kettleShape
  return Array.from({ length: overflowPointsOnTheKettle + 1 }, (_, index) => {
    const angleFromTheTop = openingAngle + ((overflowLeavesTheKettleAtRadians - openingAngle) * index) / overflowPointsOnTheKettle
    return {
      distance: (bodyRadiusMetres + overflowAboveTheSurfaceMetres) * Math.sin(angleFromTheTop),
      height: bodyCentreMetres + (bodyRadiusMetres * bodySquash + overflowAboveTheSurfaceMetres) * Math.cos(angleFromTheTop),
    }
  })
}

function pointsDownAStraightSide(model: CarriedModel): PointOnTheSide[] {
  const distance = model.footprintRadius + overflowAboveTheSurfaceMetres
  return [
    { distance, height: model.rimHeight },
    { distance, height: model.rimHeight / 2 },
  ]
}
