import * as THREE from 'three'
import type { Spot } from '../../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { itemLocationIn, middleHandIndex } from '../../../../Shared/Simulation/Ritual/Reach.ts'
import type { HandIndex } from '../../../../Shared/Simulation/State/SessionState.ts'
import type { TableViewState } from '../../Table/TableViewState.ts'
import type { AimedPourView } from '../AimedPour.ts'
import type { CarriedShape, ShapedItem } from '../CarriedShapes.ts'
import type { WorldPoint } from '../RoomLayout.ts'
import type { Walk } from '../Walking/Walk.ts'
import { aimOver } from './Carried/AimedVessel.ts'
import type { CarriedItemsScene } from './Carried/CarriedItemsScene.ts'
import { newCarriedModel, type CarriedModel } from './Carried/CarriedModel.ts'
import { ChosenGlow } from './Carried/ChosenGlow.ts'
import { CrumblingAsh } from './Carried/CrumblingAsh.ts'
import { ItemFire } from './Carried/ItemFire.ts'
import { handTouchAreaShareOfScreenHeight, handTouchAreaShareOfScreenWidthFor, heldInViewFrame, holdInView } from './Carried/HeldInView.ts'
import { inspectInView } from './Carried/InspectedInView.ts'
import { showContentsOf } from './Carried/ItemContents.ts'
import type { Surroundings } from '../Placement.ts'
import { WaterStreams } from './Carried/WaterStreams.ts'
import { isATouchArea, putOnLayer, roomLayers, touchAreaOf } from './RoomLayers.ts'
import type { RoomMaterials } from './RoomMaterials.ts'
import type { TapTargetTag } from './RoomModel.ts'

const handHeightMetres = 0.55
const handSideMetres = 0.26
const handForwardMetres = 0.14
const middleHandForwardMetres = 0.26
const everyHandIndex: readonly HandIndex[] = [0, 1, middleHandIndex]

export class CarriedItems {
  private readonly materials: RoomMaterials
  private readonly clothMaterialsByClothId = new Map<string, THREE.MeshStandardMaterial | THREE.MeshBasicMaterial>()
  private readonly models: CarriedModel[]
  private readonly waterStreams: WaterStreams
  private readonly chosenGlow = new ChosenGlow()
  private readonly fires: readonly ItemFire[]
  private readonly ash: CrumblingAsh
  private readonly surroundings: Surroundings
  private readonly handTouchAreas: readonly { readonly handIndex: HandIndex; readonly area: THREE.Mesh }[]
  readonly root = new THREE.Group()
  readonly tappableMeshes: THREE.Object3D[] = []

  constructor(materials: RoomMaterials, items: readonly ShapedItem[], sinkSpot: Spot | null, surroundings: Surroundings) {
    this.surroundings = surroundings
    this.materials = materials
    const claySeenFromInside = materials.unsharedMaterialFor('clay')
    claySeenFromInside.side = THREE.DoubleSide
    this.models = items.map(({ itemId, shape }) => newCarriedModel(itemId, shape, { room: materials, claySeenFromInside, cloth: this.clothMaterialFor(itemId, shape) }))
    for (const model of this.models) {
      this.root.add(model.root, ...model.puffs)
      this.tappableMeshes.push(model.root)
    }
    this.waterStreams = new WaterStreams(materials, sinkSpot, surroundings.layout.faucetSpout)
    this.fires = this.models.flatMap((model) => (model.look.fire === null || model.charTo === null ? [] : [new ItemFire(materials, model, model.look.fire, model.charTo)]))
    this.ash = new CrumblingAsh(materials)
    this.root.add(...this.waterStreams.meshes, ...this.fires.flatMap((fire) => fire.meshes), ...this.ash.meshes, this.chosenGlow.mesh)
    this.handTouchAreas = everyHandIndex.map((handIndex) => ({ handIndex, area: this.handTouchArea(handIndex) }))
  }

  show(scene: CarriedItemsScene): void {
    for (const model of this.models) this.place(model, scene)
    for (const model of this.models) showContentsOf(model, scene, this.surroundings)
    for (const [clothId, material] of this.clothMaterialsByClothId) material.color.copy(this.clothColourFor(scene.table.cloths[clothId]))
    for (const fire of this.fires) fire.show(scene.table, scene.timeSeconds)
    this.ash.show(scene.timeSeconds)
    this.waterStreams.show(scene, this.models)
    for (const { handIndex, area } of this.handTouchAreas) this.placeHandTouchArea(area, handIndex, scene)
    this.chosenGlow.show(scene, this.models)
  }

  shadowCastersPose(): string {
    return this.models
      .filter((model) => model.castsShadow && model.root.visible)
      .map((model) => `${model.itemId} ${model.layer} ${poseOf(model.root)}`)
      .join('; ')
  }

  private clothMaterialFor(itemId: string, shape: CarriedShape): THREE.Material {
    if (shape !== 'cloth') return this.materials.materialFor('cloth')
    const material = this.materials.unsharedMaterialFor('cloth')
    this.clothMaterialsByClothId.set(itemId, material)
    return material
  }

  private clothColourFor(cloth: TableViewState.Cloth | undefined): THREE.Color {
    const dryColour = this.materials.colourOf('cloth').lerp(this.materials.colourOf('teaStainedCloth'), cloth?.teaStain ?? 0)
    const wetDarkening = this.materials.colourOf('cloth').lerp(this.materials.colourOf('wetCloth'), cloth?.wetShare ?? 0)
    return dryColour.multiply(wetDarkening)
  }

  private place(model: CarriedModel, scene: CarriedItemsScene): void {
    const location = itemLocationIn(scene.state, model.itemId)
    if (location === undefined) return
    if (location.kind === 'gone') {
      if (model.root.visible) this.ash.crumble(model.root, scene.timeSeconds)
      model.root.visible = false
      return
    }
    const aim = scene.aimedPour?.sourceId === model.itemId ? scene.aimedPour : null
    const wipingAt = scene.clothWiping?.clothId === model.itemId ? scene.clothWiping.at : null
    const inspected = location.kind === 'inHand' && scene.inspected?.inspection.itemId === model.itemId ? scene.inspected : null
    const heldInView = location.kind === 'inHand' && aim === null && wipingAt === null && inspected === null ? scene.heldInView : null
    moveToLayer(model, layerFor(inspected !== null, heldInView !== null, wipingAt !== null))
    this.castShadowUnlessStanding(model, location.kind !== 'onSurface' && wipingAt === null && inspected === null)
    model.root.scale.setScalar(1)
    if (aim !== null) return this.aimOverItsTarget(model, aim)
    if (wipingAt !== null) return wipeAt(model, wipingAt)
    model.root.rotation.set(0, 0, 0)
    if (location.kind === 'onSurface') {
      model.root.visible = true
      model.root.position.set(location.spot.x, location.spot.y, location.spot.z)
      return this.retag(model, { itemId: model.itemId })
    }
    model.root.visible = true
    this.retag(model, { handIndex: location.handIndex })
    if (inspected !== null) return inspectInView(model, inspected)
    if (heldInView !== null) return holdInView(model, location.handIndex, heldInView)
    model.root.position.copy(handPosition(scene.walk, location.handIndex))
    model.root.rotation.y = scene.walk.headingRadians
  }

  private aimOverItsTarget(model: CarriedModel, aim: AimedPourView): void {
    const target = this.models.find((candidate) => candidate.itemId === aim.targetId)
    if (target !== undefined) aimOver(model, aim, target)
  }

  private retag(model: CarriedModel, tag: TapTargetTag): void {
    const tagKey = JSON.stringify(tag)
    if (model.tagKey === tagKey) return
    model.tagKey = tagKey
    model.root.traverse((part) => (part.userData = { ...part.userData, tapTarget: tag }))
    if (model.lid === null || !('itemId' in tag || 'handIndex' in tag)) return
    const lidTag: TapTargetTag = { lidOfItemId: model.itemId }
    model.lid.traverse((part) => (part.userData = { ...part.userData, tapTarget: lidTag }))
  }

  private castShadowUnlessStanding(model: CarriedModel, shouldCast: boolean): void {
    if (model.castsShadow === shouldCast) return
    model.castsShadow = shouldCast
    model.root.traverse((part) => (part.castShadow = shouldCast && !isATouchArea(part)))
  }

  private handTouchArea(handIndex: HandIndex): THREE.Mesh {
    const area = touchAreaOf(new THREE.PlaneGeometry(1, 1))
    area.visible = false
    const tag: TapTargetTag = { handIndex }
    area.userData = { tapTarget: tag, isForgivingTouchArea: true }
    this.root.add(area)
    this.tappableMeshes.push(area)
    return area
  }

  private placeHandTouchArea(area: THREE.Mesh, handIndex: HandIndex, scene: CarriedItemsScene): void {
    const itemId = scene.state.keeper.hands[handIndex] ?? null
    const isPouringFromIt = itemId !== null && scene.state.pour?.sourceId === itemId
    const isWipingWithIt = itemId !== null && scene.clothWiping?.clothId === itemId
    const isInspectingIt = scene.inspected?.inspection.handIndex === handIndex
    area.visible = scene.heldInView !== null && itemId !== null && !isPouringFromIt && !isWipingWithIt && !isInspectingIt
    if (!area.visible || scene.heldInView === null) return
    const frame = heldInViewFrame(scene.heldInView, handIndex)
    area.position.copy(scene.heldInView.camera.localToWorld(frame.centreInCamera))
    area.quaternion.copy(scene.heldInView.camera.quaternion)
    area.scale.set(frame.screenWidth * handTouchAreaShareOfScreenWidthFor(handIndex), frame.screenHeight * handTouchAreaShareOfScreenHeight, 1)
  }
}

function wipeAt(model: CarriedModel, point: WorldPoint): void {
  model.root.visible = true
  model.root.rotation.set(0, 0, 0)
  model.root.position.set(point.x, point.y, point.z)
}

function layerFor(isInspected: boolean, isHeldInView: boolean, isWiping: boolean): number {
  if (isInspected) return roomLayers.inspected
  if (isHeldInView) return roomLayers.heldInView
  return isWiping ? roomLayers.untappableRoom : roomLayers.room
}

function moveToLayer(model: CarriedModel, layer: number): void {
  if (model.layer === layer) return
  model.layer = layer
  model.isHeldInView = layer === roomLayers.heldInView || layer === roomLayers.inspected
  putOnLayer(model.root, layer)
  const look = model.heldInViewLook
  if (look !== null) look.mesh.material = model.isHeldInView ? look.heldInView : look.inRoom
}

function handPosition(walk: Walk, handIndex: HandIndex): THREE.Vector3 {
  const side = handIndex === middleHandIndex ? 0 : handIndex === 0 ? handSideMetres : -handSideMetres
  const forward = handIndex === middleHandIndex ? middleHandForwardMetres : handForwardMetres
  const heading = walk.headingRadians
  const x = walk.position.x + Math.cos(heading) * side + Math.sin(heading) * forward
  const z = walk.position.z - Math.sin(heading) * side + Math.cos(heading) * forward
  return new THREE.Vector3(x, handHeightMetres, z)
}

function poseOf(object: THREE.Object3D): string {
  const { position, rotation } = object
  return [position.x, position.y, position.z, rotation.x, rotation.y, rotation.z].map((value) => value.toFixed(3)).join(' ')
}
