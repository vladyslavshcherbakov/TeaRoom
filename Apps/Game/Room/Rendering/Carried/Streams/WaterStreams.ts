import * as THREE from 'three'
import { itemIdInTheSink, type DeepReadonly, type PourState, type Spot } from '../../../../../../Shared/GameLogic/GameLogic.ts'
import { isThePourRunningOverItsTarget, isThePourStreamRunning } from '../../../PourStream.ts'
import type { CarriedShape } from '../../../CarriedShapes.ts'
import type { WorldPoint } from '../../../../../Engine/Points.ts'
import type { RoomMaterials, SurfaceMaterial } from '../../RoomMaterials.ts'
import type { CarriedItemsScene } from '../CarriedItemsScene.ts'
import type { CarriedModel } from '../CarriedModel.ts'
import { CreepingStream } from './CreepingStream.ts'
import { FallingStream } from './FallingStream.ts'
import { pathDownTheOutside } from '../VesselProfile.ts'
import type { WaterReceiver } from '../../../WaterReceiversShown.ts'

const streamRadiusMetres = 0.007
const pourStreamEndsAboveTheTargetMetres = 0.01
const floorTopY = 0
export const overflowSideFromTheGaugeRadians = 0.7
export const overflowStreamRadiusMetres = 0.009

export class WaterStreams {
  private readonly pouredLiquid: SurfaceMaterial
  private readonly pourStream: FallingStream
  private readonly tapStream: FallingStream
  private readonly overflowStream: CreepingStream
  private readonly overflowPathByShape = new Map<CarriedShape, THREE.TubeGeometry>()
  private readonly sinkSpot: Spot | null
  private readonly faucetSpout: WorldPoint
  readonly meshes: readonly THREE.Object3D[]

  constructor(materials: RoomMaterials, sinkSpot: Spot | null, faucetSpout: WorldPoint) {
    this.sinkSpot = sinkSpot
    this.faucetSpout = faucetSpout
    this.pouredLiquid = materials.unsharedMaterialFor('pouredLiquid')
    this.pourStream = new FallingStream(streamRadiusMetres, this.pouredLiquid)
    this.tapStream = new FallingStream(streamRadiusMetres, materials.unsharedMaterialFor('tapWater'))
    this.overflowStream = new CreepingStream(materials.unsharedMaterialFor('tapWater'))
    this.meshes = [this.pourStream.mesh, this.tapStream.mesh, this.overflowStream.mesh]
  }

  get secondsWaterTakesToLand(): number {
    return Math.max(this.pourStream.fallSeconds, this.overflowStream.creepSeconds)
  }

  receiversOfTheFallingWater(scene: CarriedItemsScene): WaterReceiver[] {
    const pourTargetId = scene.state.pour?.targetId ?? null
    const itemIdUnderTheTap = itemIdInTheSink(scene.state)
    const receivers = [
      { itemId: pourTargetId, secondsWaterTakesToLand: this.pourStream.fallSeconds },
      { itemId: itemIdUnderTheTap, secondsWaterTakesToLand: this.tapStream.fallSeconds },
    ]
    return receivers.flatMap(({ itemId, secondsWaterTakesToLand }) => (itemId === null || secondsWaterTakesToLand === 0 ? [] : [{ itemId, secondsWaterTakesToLand }]))
  }

  show(scene: CarriedItemsScene, models: readonly CarriedModel[]): void {
    this.showPour(scene, models)
    this.showTapWater(scene, models)
  }

  private showPour(scene: CarriedItemsScene, models: readonly CarriedModel[]): void {
    const pour = scene.state.pour
    const source = models.find((model) => model.itemId === pour?.sourceId)
    const target = models.find((model) => model.itemId === pour?.targetId)
    const spoutTip = source?.vessel?.spoutTip ?? null
    const isStreamShown = pour !== null && isThePourStreamRunning(pour) && source !== undefined && target !== undefined && spoutTip !== null
    if (!isStreamShown || source === undefined || target === undefined || spoutTip === null) return this.pourStream.show(null, scene.timeSeconds)
    const top = source.root.localToWorld(spoutTip.clone())
    this.pourStream.show({ top, bottomY: pourStreamBottomY(pour, target.root.position.y) }, scene.timeSeconds)
    const pouredColour = scene.view.vessels[source.itemId]?.liquorColour
    if (pouredColour !== undefined) this.pouredLiquid.color.set(pouredColour)
  }

  private showTapWater(scene: CarriedItemsScene, models: readonly CarriedModel[]): void {
    const runningWater = scene.state.sink.runningWater
    const inTheSink = models.find((model) => model.itemId === itemIdInTheSink(scene.state))
    const isRunningOverTheLid = runningWater?.isRunningOverTheLid === true
    const isTheSinkOverflowing = inTheSink !== undefined && runningWater?.hasOverflowed === true && !isRunningOverTheLid
    const overflowing = isTheSinkOverflowing ? inTheSink : this.overfilledPourTarget(scene, models)
    const overflowPath = overflowing === undefined ? null : this.overflowPathOf(overflowing)
    this.overflowStream.show(overflowing === undefined || overflowPath === null ? null : { path: overflowPath, position: overflowing.root.position, quaternion: overflowing.root.quaternion }, scene.timeSeconds)
    if (runningWater === null || this.sinkSpot === null) return this.tapStream.show(null, scene.timeSeconds)
    const bottomY = inTheSink === undefined ? this.sinkSpot.y : inTheSink.root.position.y + inTheSink.heightMetres * (isRunningOverTheLid ? 1 : 0.5)
    this.tapStream.show({ top: new THREE.Vector3(this.faucetSpout.x, this.faucetSpout.y, this.faucetSpout.z), bottomY }, scene.timeSeconds)
  }

  private overfilledPourTarget(scene: CarriedItemsScene, models: readonly CarriedModel[]): CarriedModel | undefined {
    const pour = scene.state.pour
    if (pour === null || !isThePourRunningOverItsTarget(pour)) return undefined
    return models.find((model) => model.itemId === pour.targetId)
  }

  private overflowPathOf(model: CarriedModel): THREE.TubeGeometry | null {
    const known = this.overflowPathByShape.get(model.shape)
    if (known !== undefined) return known
    if (model.vessel === null) return null
    const pointsOnTheSide = pathDownTheOutside(model.vessel.profile)
    const side = new THREE.Vector3(Math.sin(overflowSideFromTheGaugeRadians), 0, Math.cos(overflowSideFromTheGaugeRadians))
    const lastOnTheSide = pointsOnTheSide.at(-1) ?? { radiusMetres: 0, heightMetres: 0 }
    const points = [...pointsOnTheSide, { radiusMetres: lastOnTheSide.radiusMetres, heightMetres: 0 }].map(({ radiusMetres, heightMetres }) => side.clone().multiplyScalar(radiusMetres).setY(heightMetres))
    const path = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, overflowStreamRadiusMetres, 6, false)
    this.overflowPathByShape.set(model.shape, path)
    return path
  }
}

function pourStreamBottomY(pour: DeepReadonly<PourState>, targetY: number): number {
  if (pour.streamOnTargetFraction > 0) return targetY + pourStreamEndsAboveTheTargetMetres
  return pour.missedStreamLandsAt === null ? floorTopY : pour.missedStreamLandsAt.y
}
