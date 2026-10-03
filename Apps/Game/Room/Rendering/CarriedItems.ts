import * as THREE from 'three'
import { itemIdInHand, itemIdInTheInventory, itemIdsInTheInventory, itemLocationIn, standingSpotOf, type DeepReadonly, type HandIndex, type InventorySlot, type Spot } from '../../../../Shared/GameLogic/GameLogic.ts'
import type { AimedPourView } from '../AimedPour.ts'
import type { ShapedItem } from '../CarriedShapes.ts'
import { turnOfItemAt, undersideOfTheBoardAbove } from '../RoomLayout.ts'
import type { SipGestureView } from '../SipGesture.ts'
import type { Walk } from '../../../Engine/Walking/Walk.ts'
import { aimOver } from './Carried/Hands/AimedVessel.ts'
import type { CarriedItemsScene } from './Carried/CarriedItemsScene.ts'
import type { ClothWiping } from '../PlayerController.ts'
import type { DistantDetail } from '../../../Engine/Rendering/LevelsOfDetail.ts'
import { newCarriedModel, tagForTaps, type CarriedModel } from './Carried/CarriedModel.ts'
import { CrumblingAsh } from './Carried/Burning/CrumblingAsh.ts'
import { ItemFire } from './Carried/Burning/ItemFire.ts'
import { handAreaOnTheScreen, holdInView, placeTheHandsAreaOnTheScreen, raiseTowardTheEyes, type HeldInView } from './Carried/Hands/HeldInView.ts'
import { inspectInView, type InspectedInView } from './Carried/Hands/InspectedInView.ts'
import { inventoryAreaOnTheScreen, inventoryShelf, inventorySlots, keepInTheInventory, placeTheInventoryAreaOnTheScreen, placeTheInventoryShelf } from './Carried/Hands/InventoryInView.ts'
import { openingHeightOf, showContentsOf } from './Carried/ItemContents.ts'
import type { DyeInflow } from '../../../Engine/Rendering/Flow/SwirlingDye.ts'
import { isThePourStreamRunning } from '../PourStream.ts'
import type { LyingLids, Surroundings } from '../Placement.ts'
import type { AppLog } from '../../../Engine/AppLog.ts'
import type { ClothPattern } from '../RoomArrangement.ts'
import { WaterStreams } from './Carried/Streams/WaterStreams.ts'
import { WaterReceiversShown } from '../WaterReceiversShown.ts'
import { roomLayers, type Pass } from './RoomLayers.ts'
import type { LayerRole } from '../../../Engine/Rendering/Layers.ts'
import type { RoomMaterials } from './RoomMaterials.ts'
import { drawAtTheDetail, pixelsAcross } from '../../../Engine/Rendering/LevelsOfDetail.ts'

const handHeightMetres = 0.55
const smallestSurfaceRadiusMetres = 0.01
const inflowFarthestFromTheMiddleShare = 0.8
const streamPushSurfaceWidthsPerSecond = 1
const degreesOfDifferenceThatKeepAStreamInOneLayer = 15
const handSideMetres = 0.26
const handForwardMetres = 0.14
const everyHandIndex: readonly HandIndex[] = [0, 1]
const fewestPixelsAcrossDrawnInFull = 60
const fewestPixelsAcrossOfTransmittingGlass = 50
const pixelsAcrossOfFullyTransmittingGlass = 70
const flatClothHeightShare = 0.12
const flatClothLiftMetres = 0.001

export class CarriedItems {
  private readonly models: CarriedModel[]
  private readonly waterStreams: WaterStreams
  private readonly waterReceiversShown = new WaterReceiversShown()
  private readonly fires: readonly ItemFire[]
  private readonly ashByItemId: ReadonlyMap<string, CrumblingAsh>
  private readonly surroundings: Surroundings
  private readonly lyingLids: LyingLids
  private readonly handTouchAreas: readonly { readonly handIndex: HandIndex; readonly area: THREE.Mesh }[]
  private readonly inventoryTouchAreas: readonly { readonly slotIndex: InventorySlot; readonly area: THREE.Mesh }[]
  private readonly inventoryShelf: THREE.Group
  private readonly log: AppLog
  private readonly itemIdsReportedWithoutALocation = new Set<string>()
  private readonly targetIdsReportedWithoutAModel = new Set<string>()
  private readonly itemIdsAimedWithoutASpout = new Set<string>()
  readonly root = new THREE.Group()
  readonly tappableMeshes: THREE.Object3D[] = []

  constructor(materials: RoomMaterials, items: readonly ShapedItem[], sinkSpot: Spot | null, surroundings: Surroundings, lyingLids: LyingLids, clothPatternsById: ReadonlyMap<string, ClothPattern>, bowlIdWithTheToadUnderneath: string, log: AppLog) {
    this.log = log
    this.surroundings = surroundings
    this.lyingLids = lyingLids
    this.models = items.map(({ itemId, shape }) => newCarriedModel(itemId, shape, { room: materials, clothPatternOf: (clothId) => clothPatternsById.get(clothId) ?? 'blueStripes', bowlIdWithTheToadUnderneath, log }))
    for (const model of this.models) {
      this.root.add(model.root, model.wisps.points)
      this.tappableMeshes.push(model.root)
    }
    this.waterStreams = new WaterStreams(materials, sinkSpot, surroundings.layout.faucetSpout)
    this.fires = this.models.flatMap((model) => (model.look.fire === null || model.charTo === null ? [] : [new ItemFire(materials, model, model.look.fire, model.charTo)]))
    this.ashByItemId = new Map(this.models.flatMap((model) => (model.look.ash === null ? [] : [[model.itemId, new CrumblingAsh(materials, model.look.ash)] as const])))
    this.root.add(...this.waterStreams.meshes, ...this.fires.flatMap((fire) => fire.meshes), ...[...this.ashByItemId.values()].flatMap((ash) => ash.meshes))
    this.handTouchAreas = everyHandIndex.map((handIndex) => ({ handIndex, area: this.touchAreaOnTheScreen(handAreaOnTheScreen(handIndex)) }))
    this.inventoryTouchAreas = inventorySlots.map((slotIndex) => ({ slotIndex, area: this.touchAreaOnTheScreen(inventoryAreaOnTheScreen(slotIndex)) }))
    this.inventoryShelf = inventoryShelf(materials)
    this.root.add(this.inventoryShelf)
  }

  get areasOnTheScreen(): readonly THREE.Object3D[] {
    return [...this.handTouchAreas, ...this.inventoryTouchAreas].map(({ area }) => area)
  }

  get secondsWaterTakesToLand(): number {
    return this.waterStreams.secondsWaterTakesToLand
  }

  show(scene: CarriedItemsScene): void {
    for (const model of this.models) this.place(model, scene)
    this.waterStreams.show(scene, this.models)
    const sceneShown = { ...scene, view: this.waterReceiversShown.viewAfterAFrame(scene.view, this.waterStreams.receiversOfTheFallingWater(scene), scene.timeSeconds) }
    const sceneOfTheContents = withTheSipStillInTheCup(sceneShown)
    const lidsLying = this.lyingLids.layOpenLids(scene.state, this.surroundings)
    const pourInflow = this.inflowOfThePour(scene)
    for (const model of this.models) showContentsOf(model, sceneOfTheContents, lidsLying, pourInflow?.targetId === model.itemId ? pourInflow.inflow : null)
    for (const model of this.models) drawInTheDetailItsSizeNeeds(model, scene.distantDetail)
    for (const model of this.models) clearTheGlassAtItsSize(model, scene.distantDetail)
    for (const fire of this.fires) fire.show(sceneShown.view, scene.timeSeconds)
    for (const ash of this.ashByItemId.values()) ash.show(scene.timeSeconds)
    for (const { handIndex, area } of this.handTouchAreas) this.placeHandTouchArea(area, handIndex, scene)
    for (const { slotIndex, area } of this.inventoryTouchAreas) this.placeInventoryTouchArea(area, slotIndex, scene)
    placeTheInventoryShelf(this.inventoryShelf, scene.inventoryInView, itemIdsInTheInventory(scene.state).some((itemId) => itemId !== null))
  }

  drawWithTheGlassTransmittingAndClear(drawAFrame: () => void): void {
    const glassModels = this.models.filter((model) => model.glassThatClears !== null)
    if (glassModels.length === 0) return
    for (const clearShare of [0, 1]) {
      for (const model of glassModels) model.glassThatClears?.showClearShare(clearShare)
      drawAFrame()
    }
    for (const model of glassModels) model.glassThatClears?.showClearShare(model.now.glassClearShare)
    this.log(`the room is drawn once with ${glassModels.map((model) => model.itemId).join(', ')} transmitting and once clear, so the first change between them does not stall a frame`)
  }

  isHeldInView(part: THREE.Object3D): boolean {
    const rootsHeldInView = new Set<THREE.Object3D>(this.models.filter((model) => model.now.pass === 'heldInView').map((model) => model.root))
    for (let current: THREE.Object3D | null = part; current !== null; current = current.parent) if (rootsHeldInView.has(current)) return true
    return false
  }

  shadowCastersPose(): string {
    return this.models
      .filter((model) => model.now.castsShadow && model.root.visible)
      .map((model) => `${model.itemId} ${model.now.pass} ${model.now.role} ${poseOf(model.root)}`)
      .join('; ')
  }

  private place(model: CarriedModel, scene: CarriedItemsScene): void {
    const location = itemLocationIn(scene.state, model.itemId)
    if (location === undefined) {
      if (!this.itemIdsReportedWithoutALocation.has(model.itemId)) this.log(`${model.itemId} has no location in the simulation's state, so it stays where it was last drawn`, 'error')
      this.itemIdsReportedWithoutALocation.add(model.itemId)
      return
    }
    if (location.kind === 'gone') {
      if (model.root.visible) this.ashByItemId.get(model.itemId)?.crumble(model.root, scene.timeSeconds)
      model.root.visible = false
      return
    }
    const aim = scene.aimedPour?.sourceId === model.itemId ? scene.aimedPour : null
    const wiping = scene.clothWiping?.clothId === model.itemId ? scene.clothWiping : null
    const inspected = location.kind === 'inHand' && scene.inspected?.inspection.itemId === model.itemId ? scene.inspected : null
    const heldInView = location.kind === 'inHand' && aim === null && wiping === null && inspected === null ? scene.heldInView : null
    const isInTheInventory = location.kind === 'inTheInventory'
    moveToLayer(model, passFor(inspected !== null, heldInView !== null || isInTheInventory), wiping === null ? 'takesTaps' : 'decoration')
    this.castShadowUnlessStanding(model, standingSpotOf(location) === null && wiping === null && inspected === null && !isInTheInventory)
    model.root.scale.setScalar(1)
    if (aim !== null) return this.aimOverItsTarget(model, aim, scene)
    if (wiping !== null) return wipeAt(model, wiping)
    model.root.rotation.set(0, 0, 0)
    model.root.visible = true
    switch (location.kind) {
      case 'onSurface':
      case 'onTheHeater':
      case 'inTheSink':
        return this.standAt(model, location.spot)
      case 'inHand':
        return this.holdInTheHand(model, location.handIndex, inspected, heldInView, scene)
      case 'inTheInventory':
        tagForTaps(model, { kind: 'inventorySlot', slotIndex: location.slotIndex })
        return keepInTheInventory(model, location.slotIndex, scene.inventoryInView)
    }
  }

  private standAt(model: CarriedModel, spot: DeepReadonly<Spot>): void {
    model.root.position.set(spot.x, spot.y, spot.z)
    model.root.rotation.y = turnOfItemAt(this.surroundings.layout, spot)
    tagForTaps(model, { kind: 'item', itemId: model.itemId })
  }

  private holdInTheHand(model: CarriedModel, handIndex: HandIndex, inspected: InspectedInView | null, heldInView: HeldInView | null, scene: CarriedItemsScene): void {
    tagForTaps(model, { kind: 'hand', handIndex })
    if (inspected !== null) return inspectInView(model, inspected)
    if (heldInView !== null) return this.holdInViewOrRaiseToTheLips(model, handIndex, heldInView, scene.sipGesture)
    model.root.position.copy(handPosition(scene.walk, handIndex))
    model.root.rotation.y = scene.walk.headingRadians
  }

  private holdInViewOrRaiseToTheLips(model: CarriedModel, handIndex: HandIndex, heldInView: HeldInView, sipGesture: SipGestureView | null): void {
    holdInView(model, handIndex, heldInView)
    if (sipGesture?.cupId === model.itemId) raiseTowardTheEyes(model, handIndex, heldInView, sipGesture.liftShare)
  }

  private aimOverItsTarget(model: CarriedModel, aim: AimedPourView, scene: CarriedItemsScene): void {
    const target = this.models.find((candidate) => candidate.itemId === aim.targetId)
    if (target === undefined) {
      if (!this.targetIdsReportedWithoutAModel.has(aim.targetId)) this.log(`${model.itemId} is not moved over ${aim.targetId}, because the room draws no ${aim.targetId}`, 'error')
      this.targetIdsReportedWithoutAModel.add(aim.targetId)
      return
    }
    if (model.vessel === null) {
      if (!this.itemIdsAimedWithoutASpout.has(model.itemId)) this.log(`${model.itemId} is not moved over ${aim.targetId}, because it has no spout to pour from`, 'error')
      this.itemIdsAimedWithoutASpout.add(model.itemId)
      return
    }
    const standingBelow = this.models.filter((candidate) => candidate !== model && standingSpotOf(itemLocationIn(scene.state, candidate.itemId)) !== null).map((candidate) => candidate.root)
    const targetSpot = standingSpotOf(itemLocationIn(scene.state, target.itemId))
    const ceiling = targetSpot === null ? null : undersideOfTheBoardAbove(this.surroundings.layout, targetSpot)
    aimOver({ root: model.root, bodyRadius: model.bodyRadius, spoutTip: model.vessel.spoutTip }, aim, target, standingBelow, ceiling)
  }

  private castShadowUnlessStanding(model: CarriedModel, shouldCast: boolean): void {
    if (model.now.castsShadow === shouldCast) return
    model.now.castsShadow = shouldCast
    model.root.traverse((part) => (part.castShadow = shouldCast && !roomLayers.isATouchArea(part)))
  }

  private touchAreaOnTheScreen(area: THREE.Mesh): THREE.Mesh {
    area.visible = false
    this.root.add(area)
    return area
  }

  private inflowOfThePour(scene: CarriedItemsScene): { readonly targetId: string; readonly inflow: DyeInflow } | null {
    const pour = scene.state.pour
    if (pour === null || pour.targetId === null || !isThePourStreamRunning(pour) || pour.streamOnTargetFraction <= 0) return null
    const source = this.models.find((model) => model.itemId === pour.sourceId)
    const target = this.models.find((model) => model.itemId === pour.targetId)
    const sourceView = scene.view.vessels[pour.sourceId]
    if (source === undefined || target === undefined || target.liquid === null || sourceView === undefined) return null
    const spoutInTheSource = source.vessel?.spoutTip?.clone() ?? new THREE.Vector3(0, openingHeightOf(source), 0)
    const spoutInTheTarget = target.root.worldToLocal(source.root.localToWorld(spoutInTheSource.clone()))
    const behindTheSpoutInTheTarget = target.root.worldToLocal(source.root.localToWorld(new THREE.Vector3(0, spoutInTheSource.y, 0)))
    const radius = Math.max(target.liquid.scale.x, smallestSurfaceRadiusMetres)
    const fromTheMiddle = new THREE.Vector2(spoutInTheTarget.x, -spoutInTheTarget.z).divideScalar(radius)
    if (fromTheMiddle.length() > inflowFarthestFromTheMiddleShare) fromTheMiddle.setLength(inflowFarthestFromTheMiddleShare)
    const streamHeading = new THREE.Vector2(spoutInTheTarget.x - behindTheSpoutInTheTarget.x, behindTheSpoutInTheTarget.z - spoutInTheTarget.z)
    const push = streamHeading.lengthSq() > 0 ? streamHeading.setLength(streamPushSurfaceWidthsPerSecond) : streamHeading
    const warmth = warmthOfTheStream(sourceView.waterTemperatureC, scene.view.vessels[pour.targetId]?.waterTemperatureC ?? null)
    return { targetId: pour.targetId, inflow: { u: 0.5 + fromTheMiddle.x / 2, v: 0.5 + fromTheMiddle.y / 2, colour: new THREE.Color(sourceView.liquorColour), strength: pour.streamOnTargetFraction, warmth, pushU: push.x, pushV: push.y } }
  }

  private placeHandTouchArea(area: THREE.Mesh, handIndex: HandIndex, scene: CarriedItemsScene): void {
    const itemId = itemIdInHand(scene.state, handIndex)
    const isPouringFromIt = itemId !== null && scene.state.pour?.sourceId === itemId
    const isWipingWithIt = itemId !== null && scene.clothWiping?.clothId === itemId
    const isInspectingIt = scene.inspected?.inspection.handIndex === handIndex
    area.visible = scene.heldInView !== null && itemId !== null && !isPouringFromIt && !isWipingWithIt && !isInspectingIt
    if (!area.visible || scene.heldInView === null) return
    placeTheHandsAreaOnTheScreen(area, handIndex, scene.heldInView)
  }

  private placeInventoryTouchArea(area: THREE.Mesh, slotIndex: InventorySlot, scene: CarriedItemsScene): void {
    area.visible = itemIdInTheInventory(scene.state, slotIndex) !== null
    if (area.visible) placeTheInventoryAreaOnTheScreen(area, slotIndex, scene.inventoryInView)
  }
}

export function drawInTheDetailItsSizeNeeds(model: CarriedModel, distantDetail: DistantDetail | null): void {
  if (model.levelsOfDetail.length === 0) return
  const isSimple = distantDetail !== null && !model.now.isHeldInView && pixelsAcross(model.root, model.bodyRadius, distantDetail) < fewestPixelsAcrossDrawnInFull
  if (isSimple === model.now.isDrawnSimply) return
  model.now.isDrawnSimply = isSimple
  drawAtTheDetail(model.levelsOfDetail, isSimple)
}

export function clearTheGlassAtItsSize(model: CarriedModel, distantDetail: DistantDetail | null): void {
  const glass = model.glassThatClears
  if (glass === null) return
  const isDrawnInFull = distantDetail === null || model.now.isHeldInView
  const clearShare = isDrawnInFull ? 0 : 1 - THREE.MathUtils.smoothstep(pixelsAcross(model.root, model.bodyRadius, distantDetail), fewestPixelsAcrossOfTransmittingGlass, pixelsAcrossOfFullyTransmittingGlass)
  if (clearShare === model.now.glassClearShare) return
  model.now.glassClearShare = clearShare
  glass.showClearShare(clearShare)
}

function wipeAt(model: CarriedModel, wiping: ClothWiping): void {
  model.root.visible = true
  model.root.rotation.set(0, 0, 0)
  model.root.position.set(wiping.at.x, wiping.at.y + wiping.flatShare * flatClothLiftMetres, wiping.at.z)
  model.root.scale.y = 1 - wiping.flatShare * (1 - flatClothHeightShare)
}

function passFor(isInspected: boolean, isHeldInView: boolean): Pass {
  if (isInspected) return 'inspected'
  return isHeldInView ? 'heldInView' : 'room'
}

function moveToLayer(model: CarriedModel, pass: Pass, role: LayerRole): void {
  if (model.now.pass === pass && model.now.role === role) return
  model.now.pass = pass
  model.now.role = role
  model.now.isHeldInView = pass !== 'room'
  roomLayers.putOnLayer(model.root, pass, role)
  const look = model.lookByWhereItIsDrawn
  if (look !== null) look.mesh.material = model.now.isHeldInView ? look.heldInView : look.inRoom
}

function handPosition(walk: Walk, handIndex: HandIndex): THREE.Vector3 {
  const side = handIndex === 0 ? handSideMetres : -handSideMetres
  const forward = handForwardMetres
  const heading = walk.headingRadians
  const x = walk.position.x + Math.cos(heading) * side + Math.sin(heading) * forward
  const z = walk.position.z - Math.sin(heading) * side + Math.cos(heading) * forward
  return new THREE.Vector3(x, handHeightMetres, z)
}

function withTheSipStillInTheCup(scene: CarriedItemsScene): CarriedItemsScene {
  const sip: SipGestureView | null = scene.sipGesture
  const cup = sip === null ? undefined : scene.view.vessels[sip.cupId]
  if (sip === null || cup === undefined || sip.fillShareNotYetSipped <= 0) return scene
  return { ...scene, view: { ...scene.view, vessels: { ...scene.view.vessels, [sip.cupId]: { ...cup, fillShare: cup.fillShare + sip.fillShareNotYetSipped } } } }
}

function poseOf(object: THREE.Object3D): string {
  const { position, rotation } = object
  return [position.x, position.y, position.z, rotation.x, rotation.y, rotation.z].map((value) => value.toFixed(3)).join(' ')
}

function warmthOfTheStream(streamCelsius: number | null, liquidCelsius: number | null): number {
  if (streamCelsius === null || liquidCelsius === null) return 0
  return Math.min(1, Math.max(-1, (streamCelsius - liquidCelsius) / degreesOfDifferenceThatKeepAStreamInOneLayer))
}
