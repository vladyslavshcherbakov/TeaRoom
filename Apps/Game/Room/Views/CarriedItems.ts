import * as THREE from 'three'
import type { Spot } from '../../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { clothItemId, itemLocationIn } from '../../../../Shared/Simulation/Ritual/Reach.ts'
import type { HandIndex } from '../../../../Shared/Simulation/State/SessionState.ts'
import type { TableViewState } from '../../Table/TableViewState.ts'
import type { AimedPourView } from '../AimedPour.ts'
import type { ShapedItem } from '../CarriedShapes.ts'
import type { WorldPoint } from '../RoomLayout.ts'
import type { Walk } from '../Walking/Walk.ts'
import { aimOver } from './Carried/AimedVessel.ts'
import type { CarriedItemsScene } from './Carried/CarriedItemsScene.ts'
import { newCarriedModel, type CarriedModel } from './Carried/CarriedModel.ts'
import { ChosenGlow } from './Carried/ChosenGlow.ts'
import { ClothFire } from './Carried/ClothFire.ts'
import { handTouchAreaShareOfScreenHeight, handTouchAreaShareOfScreenWidth, heldInViewFrame, holdInView } from './Carried/HeldInView.ts'
import { showContentsOf } from './Carried/ItemContents.ts'
import { WaterStreams } from './Carried/WaterStreams.ts'
import { roomLayers } from './RoomLayers.ts'
import type { RoomMaterials } from './RoomMaterials.ts'
import type { TapTargetTag } from './RoomModel.ts'

const handHeightMetres = 0.55
const handSideMetres = 0.26
const handForwardMetres = 0.14

export class CarriedItems {
  private readonly materials: RoomMaterials
  private readonly touchPadMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  private readonly clothMaterial: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial
  private readonly models: CarriedModel[]
  private readonly waterStreams: WaterStreams
  private readonly chosenGlow = new ChosenGlow()
  private readonly clothFire: ClothFire
  private readonly heaterSpot: Spot
  private readonly handTouchAreas: readonly [THREE.Mesh, THREE.Mesh]
  readonly root = new THREE.Group()
  readonly tappableMeshes: THREE.Object3D[] = []

  constructor(materials: RoomMaterials, items: readonly ShapedItem[], sinkSpot: Spot | null, heaterSpot: Spot) {
    this.heaterSpot = heaterSpot
    this.materials = materials
    this.clothMaterial = materials.unsharedMaterialFor('cloth')
    const claySeenFromInside = materials.unsharedMaterialFor('clay')
    claySeenFromInside.side = THREE.DoubleSide
    const modelMaterials = { room: materials, claySeenFromInside, touchPad: this.touchPadMaterial, cloth: this.clothMaterial }
    this.models = items.map(({ itemId, shape }) => newCarriedModel(itemId, shape, modelMaterials))
    for (const model of this.models) {
      this.root.add(model.root, ...model.puffs)
      this.tappableMeshes.push(model.root)
    }
    this.waterStreams = new WaterStreams(materials, sinkSpot)
    this.clothFire = new ClothFire(materials)
    this.root.add(...this.waterStreams.meshes, ...this.clothFire.meshes, this.chosenGlow.mesh)
    this.handTouchAreas = [this.handTouchArea(0), this.handTouchArea(1)]
  }

  show(scene: CarriedItemsScene): void {
    for (const model of this.models) this.place(model, scene)
    for (const model of this.models) showContentsOf(model, scene, this.heaterSpot)
    this.clothMaterial.color.copy(this.clothColourFor(scene.table))
    const clothModel = this.models.find((model) => model.itemId === clothItemId)
    this.clothFire.show(clothModel, scene.table.clothHeating, scene.timeSeconds)
    this.clothFire.char(clothModel, scene.table.clothCharring)
    this.waterStreams.show(scene, this.models)
    this.handTouchAreas.forEach((area, handIndex) => this.placeHandTouchArea(area, handIndex === 0 ? 0 : 1, scene))
    this.chosenGlow.show(scene, this.models)
  }

  shadowCastersPose(): string {
    return this.models
      .filter((model) => model.castsShadow && model.root.visible)
      .map((model) => `${model.itemId} ${model.layer} ${poseOf(model.root)}`)
      .join('; ')
  }

  private clothColourFor(table: TableViewState): THREE.Color {
    const dryColour = this.materials.colourOf('cloth').lerp(this.materials.colourOf('teaStainedCloth'), table.clothTeaStain)
    const wetDarkening = this.materials.colourOf('cloth').lerp(this.materials.colourOf('wetCloth'), table.clothWetShare)
    return dryColour.multiply(wetDarkening)
  }

  private place(model: CarriedModel, scene: CarriedItemsScene): void {
    const location = itemLocationIn(scene.state, model.itemId)
    if (location === undefined) return
    const aim = scene.aimedPour?.sourceId === model.itemId ? scene.aimedPour : null
    const wipingAt = model.itemId === clothItemId ? scene.clothOnTheTableAt : null
    const heldInView = location.kind === 'inHand' && aim === null && wipingAt === null ? scene.heldInView : null
    moveToLayer(model, heldInView !== null ? roomLayers.heldInView : wipingAt !== null ? roomLayers.untappableRoom : roomLayers.room)
    this.castShadowUnlessStanding(model, location.kind !== 'onSurface' && wipingAt === null)
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
    model.root.traverse((part) => (part.castShadow = shouldCast && !(part instanceof THREE.Mesh && part.material === this.touchPadMaterial)))
  }

  private handTouchArea(handIndex: HandIndex): THREE.Mesh {
    const area = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.touchPadMaterial)
    area.layers.set(roomLayers.heldInView)
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
    const isWipingWithIt = itemId === clothItemId && scene.clothOnTheTableAt !== null
    area.visible = scene.heldInView !== null && itemId !== null && !isPouringFromIt && !isWipingWithIt
    if (!area.visible || scene.heldInView === null) return
    const frame = heldInViewFrame(scene.heldInView, handIndex)
    area.position.copy(scene.heldInView.camera.localToWorld(frame.centreInCamera))
    area.quaternion.copy(scene.heldInView.camera.quaternion)
    area.scale.set(frame.screenWidth * handTouchAreaShareOfScreenWidth, frame.screenHeight * handTouchAreaShareOfScreenHeight, 1)
  }
}

function wipeAt(model: CarriedModel, point: WorldPoint): void {
  model.root.visible = true
  model.root.rotation.set(0, 0, 0)
  model.root.position.set(point.x, point.y, point.z)
}

function moveToLayer(model: CarriedModel, layer: number): void {
  if (model.layer === layer) return
  model.layer = layer
  model.isHeldInView = layer === roomLayers.heldInView
  model.root.traverse((part) => part.layers.set(layer))
  const look = model.heldInViewLook
  if (look !== null) look.mesh.material = model.isHeldInView ? look.heldInView : look.inRoom
}

function handPosition(walk: Walk, handIndex: HandIndex): THREE.Vector3 {
  const side = handIndex === 0 ? handSideMetres : -handSideMetres
  const heading = walk.headingRadians
  const x = walk.position.x + Math.cos(heading) * side + Math.sin(heading) * handForwardMetres
  const z = walk.position.z - Math.sin(heading) * side + Math.cos(heading) * handForwardMetres
  return new THREE.Vector3(x, handHeightMetres, z)
}

function poseOf(object: THREE.Object3D): string {
  const { position, rotation } = object
  return [position.x, position.y, position.z, rotation.x, rotation.y, rotation.z].map((value) => value.toFixed(3)).join(' ')
}
