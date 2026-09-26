import * as THREE from 'three'
import type { Spot } from '../../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { itemLocationIn, middleHandIndex } from '../../../../Shared/Simulation/Ritual/Reach.ts'
import type { HandIndex } from '../../../../Shared/Simulation/State/SessionState.ts'
import type { ClothView } from '../../Table/TableViewState.ts'
import type { AimedPourView } from '../AimedPour.ts'
import type { CarriedShape, ShapedItem } from '../CarriedShapes.ts'
import { turnOfItemAt, undersideOfTheBoardAbove, type WorldPoint } from '../RoomLayout.ts'
import type { SipGestureView } from '../SipGesture.ts'
import type { Walk } from '../Walking/Walk.ts'
import { aimOver } from './Carried/AimedVessel.ts'
import type { CarriedItemsScene, DistantDetail, HeldInView } from './Carried/CarriedItemsScene.ts'
import { newCarriedModel, type CarriedModel } from './Carried/CarriedModel.ts'
import { ChosenGlow } from './Carried/ChosenGlow.ts'
import { UnchosenHandVeils } from './Carried/UnchosenHandVeils.ts'
import { CrumblingAsh } from './Carried/CrumblingAsh.ts'
import { ItemFire } from './Carried/ItemFire.ts'
import { handTouchAreaShareOfScreenHeight, handTouchAreaShareOfScreenWidthFor, heldInViewFrame, holdInView, raiseTowardTheEyes } from './Carried/HeldInView.ts'
import { inspectInView } from './Carried/InspectedInView.ts'
import { showContentsOf } from './Carried/ItemContents.ts'
import type { Surroundings } from '../Placement.ts'
import type { ClothPattern } from '../RoomArrangement.ts'
import { WaterStreams } from './Carried/WaterStreams.ts'
import { isATouchArea, putOnLayer, roomLayers, touchAreaOf } from './RoomLayers.ts'
import { surfaceByClothPattern, type RoomMaterials } from './RoomMaterials.ts'
import type { TapTargetTag } from './RoomModel.ts'

const handHeightMetres = 0.55
const handSideMetres = 0.26
const handForwardMetres = 0.14
const middleHandForwardMetres = 0.26
const everyHandIndex: readonly HandIndex[] = [0, 1, middleHandIndex]
const fewestPixelsAcrossDrawnInFull = 60

export class CarriedItems {
  private readonly materials: RoomMaterials
  private readonly clothMaterialsByClothId = new Map<string, THREE.MeshStandardMaterial | THREE.MeshBasicMaterial>()
  private readonly models: CarriedModel[]
  private readonly waterStreams: WaterStreams
  private readonly chosenGlow = new ChosenGlow()
  private readonly unchosenHandVeils = new UnchosenHandVeils()
  private readonly fires: readonly ItemFire[]
  private readonly ash: CrumblingAsh
  private readonly surroundings: Surroundings
  private readonly clothPatternsById: ReadonlyMap<string, ClothPattern>
  private readonly handTouchAreas: readonly { readonly handIndex: HandIndex; readonly area: THREE.Mesh }[]
  readonly root = new THREE.Group()
  readonly tappableMeshes: THREE.Object3D[] = []

  constructor(materials: RoomMaterials, items: readonly ShapedItem[], sinkSpot: Spot | null, surroundings: Surroundings, clothPatternsById: ReadonlyMap<string, ClothPattern>) {
    this.surroundings = surroundings
    this.clothPatternsById = clothPatternsById
    this.materials = materials
    const claySeenFromInside = materials.unsharedMaterialFor('clay')
    claySeenFromInside.side = THREE.DoubleSide
    this.models = items.map(({ itemId, shape }) => newCarriedModel(itemId, shape, { room: materials, claySeenFromInside, cloth: this.clothMaterialFor(itemId, shape) }))
    for (const model of this.models) {
      this.root.add(model.root, ...model.puffs, ...model.sipPuffs)
      this.tappableMeshes.push(model.root)
    }
    this.waterStreams = new WaterStreams(materials, sinkSpot, surroundings.layout.faucetSpout)
    this.fires = this.models.flatMap((model) => (model.look.fire === null || model.charTo === null ? [] : [new ItemFire(materials, model, model.look.fire, model.charTo)]))
    this.ash = new CrumblingAsh(materials)
    this.root.add(...this.waterStreams.meshes, ...this.fires.flatMap((fire) => fire.meshes), ...this.ash.meshes, this.chosenGlow.mesh, ...this.unchosenHandVeils.meshes)
    this.handTouchAreas = everyHandIndex.map((handIndex) => ({ handIndex, area: this.handTouchArea(handIndex) }))
  }

  show(scene: CarriedItemsScene): void {
    for (const model of this.models) this.place(model, scene)
    const sceneOfTheContents = withTheSipStillInTheCup(scene)
    for (const model of this.models) showContentsOf(model, sceneOfTheContents, this.surroundings)
    for (const model of this.models) drawInTheDetailItsSizeNeeds(model, scene.distantDetail)
    for (const [clothId, material] of this.clothMaterialsByClothId) material.color.copy(this.clothColourFor(scene.table.cloths[clothId]))
    for (const fire of this.fires) fire.show(scene.table, scene.timeSeconds)
    this.ash.show(scene.timeSeconds)
    this.waterStreams.show(scene, this.models)
    for (const { handIndex, area } of this.handTouchAreas) this.placeHandTouchArea(area, handIndex, scene)
    this.chosenGlow.show(scene, this.models)
    this.unchosenHandVeils.show(scene, this.models)
  }

  isHeldInView(part: THREE.Object3D): boolean {
    if (this.handTouchAreas.some(({ area }) => area === part)) return true
    const rootsHeldInView = new Set<THREE.Object3D>(this.models.filter((model) => model.layer === roomLayers.heldInView).map((model) => model.root))
    for (let current: THREE.Object3D | null = part; current !== null; current = current.parent) if (rootsHeldInView.has(current)) return true
    return false
  }

  shadowCastersPose(): string {
    return this.models
      .filter((model) => model.castsShadow && model.root.visible)
      .map((model) => `${model.itemId} ${model.layer} ${poseOf(model.root)}`)
      .join('; ')
  }

  private clothMaterialFor(itemId: string, shape: CarriedShape): THREE.Material {
    if (shape !== 'cloth') return this.materials.materialFor('cloth')
    const material = this.materials.unsharedMaterialFor(surfaceByClothPattern[this.clothPatternsById.get(itemId) ?? 'blueStripes'])
    this.clothMaterialsByClothId.set(itemId, material)
    return material
  }

  private clothColourFor(cloth: ClothView | undefined): THREE.Color {
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
    if (aim !== null) return this.aimOverItsTarget(model, aim, scene)
    if (wipingAt !== null) return wipeAt(model, wipingAt)
    model.root.rotation.set(0, 0, 0)
    if (location.kind === 'onSurface') {
      model.root.visible = true
      model.root.position.set(location.spot.x, location.spot.y, location.spot.z)
      model.root.rotation.y = turnOfItemAt(this.surroundings.layout, location.spot)
      return this.retag(model, { itemId: model.itemId })
    }
    model.root.visible = true
    this.retag(model, { handIndex: location.handIndex })
    if (inspected !== null) return inspectInView(model, inspected)
    if (heldInView !== null) return this.holdInViewOrRaiseToTheLips(model, location.handIndex, heldInView, scene.sipGesture)
    model.root.position.copy(handPosition(scene.walk, location.handIndex))
    model.root.rotation.y = scene.walk.headingRadians
  }

  private holdInViewOrRaiseToTheLips(model: CarriedModel, handIndex: HandIndex, heldInView: HeldInView, sipGesture: SipGestureView | null): void {
    holdInView(model, handIndex, heldInView)
    if (sipGesture?.cupId === model.itemId) raiseTowardTheEyes(model, handIndex, heldInView, sipGesture.liftShare)
  }

  private aimOverItsTarget(model: CarriedModel, aim: AimedPourView, scene: CarriedItemsScene): void {
    const target = this.models.find((candidate) => candidate.itemId === aim.targetId)
    if (target === undefined) return
    const standingBelow = this.models.filter((candidate) => candidate !== model && itemLocationIn(scene.state, candidate.itemId)?.kind === 'onSurface').map((candidate) => candidate.root)
    const targetLocation = itemLocationIn(scene.state, target.itemId)
    const ceiling = targetLocation?.kind === 'onSurface' ? undersideOfTheBoardAbove(this.surroundings.layout, targetLocation.spot) : null
    aimOver(model, aim, target, standingBelow, ceiling)
  }

  private retag(model: CarriedModel, tag: TapTargetTag): void {
    const tagKey = JSON.stringify(tag)
    if (model.tagKey === tagKey) return
    model.tagKey = tagKey
    model.root.traverse((part) => (part.userData = { ...part.userData, tapTarget: tag }))
    if (model.opening !== null && 'itemId' in tag) model.opening.userData = { ...model.opening.userData, tapTarget: { openingOfItemId: model.itemId } satisfies TapTargetTag }
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

export function drawInTheDetailItsSizeNeeds(model: CarriedModel, distantDetail: DistantDetail | null): void {
  if (model.levelsOfDetail.length === 0) return
  const isSimple = distantDetail !== null && !model.isHeldInView && pixelsAcross(model, distantDetail) < fewestPixelsAcrossDrawnInFull
  if (isSimple === model.isDrawnSimply) return
  model.isDrawnSimply = isSimple
  for (const level of model.levelsOfDetail) {
    if (level.far === null) level.mesh.visible = !isSimple
    else level.mesh.geometry = isSimple ? level.far : level.near
  }
}

function pixelsAcross(model: CarriedModel, { camera, screenHeightPixels }: DistantDetail): number {
  const distance = camera.position.distanceTo(model.root.getWorldPosition(new THREE.Vector3()))
  const visibleHeightMetres = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  return ((2 * model.footprintRadius * model.root.scale.x) / visibleHeightMetres) * screenHeightPixels
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

function withTheSipStillInTheCup(scene: CarriedItemsScene): CarriedItemsScene {
  const sip: SipGestureView | null = scene.sipGesture
  const cup = sip === null ? undefined : scene.table.vessels[sip.cupId]
  if (sip === null || cup === undefined || sip.fillShareNotYetSipped <= 0) return scene
  return { ...scene, table: { ...scene.table, vessels: { ...scene.table.vessels, [sip.cupId]: { ...cup, fillShare: cup.fillShare + sip.fillShareNotYetSipped } } } }
}

function poseOf(object: THREE.Object3D): string {
  const { position, rotation } = object
  return [position.x, position.y, position.z, rotation.x, rotation.y, rotation.z].map((value) => value.toFixed(3)).join(' ')
}
