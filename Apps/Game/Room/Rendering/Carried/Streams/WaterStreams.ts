import * as THREE from 'three'
import { itemIdInTheSink, type Spot } from '../../../../../../Shared/GameLogic/GameLogic.ts'
import type { PourLanding, TapLanding } from '../../../../Presentation/WorldViewState.ts'
import type { CarriedShape } from '../../../CarriedShapes.ts'
import type { WorldPoint } from '../../../../../Engine/Points.ts'
import type { RoomMaterials, SurfaceMaterial } from '../../RoomMaterials.ts'
import type { CarriedItemsScene } from '../CarriedItemsScene.ts'
import type { CarriedModel } from '../CarriedModel.ts'
import { CreepingStream } from '../../../../../Engine/Rendering/Streams/CreepingStream.ts'
import { FallingStream } from '../../../../../Engine/Rendering/Streams/FallingStream.ts'
import { pathDownTheOutside } from '../VesselProfile.ts'
import type { WaterReceiver } from '../../../WaterReceiversShown.ts'

const streamRadiusMetres = 0.007
const pourStreamEndsAboveTheTargetMetres = 0.01
const floorTopY = 0
export const overflowSideFromTheGaugeRadians = 0.7
export const overflowStreamRadiusMetres = 0.009
const heightShareWhereTheTapLands: Readonly<Record<TapLanding, number>> = { onTheLid: 1, intoTheItem: 0.5, onTheSinkFloor: 0 }

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
    const pour = scene.view.pourStream
    const source = models.find((model) => model.itemId === pour?.sourceId)
    const target = models.find((model) => model.itemId === pour?.targetId)
    const spoutTip = source?.vessel?.spoutTip ?? null
    if (pour === null || source === undefined || target === undefined || spoutTip === null) return this.pourStream.show(null, scene.timeSeconds)
    const top = source.root.localToWorld(spoutTip.clone())
    this.pourStream.show({ top, bottomY: pourStreamBottomY(pour.landing, target.root.position.y) }, scene.timeSeconds)
    this.pouredLiquid.color.set(pour.colour)
  }

  private showTapWater(scene: CarriedItemsScene, models: readonly CarriedModel[]): void {
    const tap = scene.view.tapStream
    const underTheTap = models.find((model) => model.itemId === tap?.itemIdUnderIt)
    const overflowing = tap?.isOverflowingTheItem === true ? underTheTap : this.overfilledPourTarget(scene, models)
    const overflowPath = overflowing === undefined ? null : this.overflowPathOf(overflowing)
    this.overflowStream.show(overflowing === undefined || overflowPath === null ? null : { path: overflowPath, position: overflowing.root.position, quaternion: overflowing.root.quaternion }, scene.timeSeconds)
    if (tap === null || this.sinkSpot === null) return this.tapStream.show(null, scene.timeSeconds)
    const bottomY = underTheTap === undefined ? this.sinkSpot.y : underTheTap.root.position.y + underTheTap.heightMetres * heightShareWhereTheTapLands[tap.landing]
    this.tapStream.show({ top: new THREE.Vector3(this.faucetSpout.x, this.faucetSpout.y, this.faucetSpout.z), bottomY }, scene.timeSeconds)
  }

  private overfilledPourTarget(scene: CarriedItemsScene, models: readonly CarriedModel[]): CarriedModel | undefined {
    const pour = scene.view.pourStream
    if (pour === null || !pour.isOverflowingItsTarget) return undefined
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

function pourStreamBottomY(landing: PourLanding, targetY: number): number {
  switch (landing.kind) {
    case 'onTheTarget':
      return targetY + pourStreamEndsAboveTheTargetMetres
    case 'atAHeight':
      return landing.heightMetres
    case 'onTheFloor':
      return floorTopY
  }
}
