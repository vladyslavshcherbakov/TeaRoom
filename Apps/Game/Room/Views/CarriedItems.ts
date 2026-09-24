import * as THREE from 'three'
import { itemLocationIn } from '../../../../Shared/Simulation/Ritual/Reach.ts'
import type { DeepReadonly } from '../../../../Shared/Simulation/State/DeepReadonly.ts'
import type { HandIndex, SessionState } from '../../../../Shared/Simulation/State/SessionState.ts'
import type { TableViewState } from '../../Table/TableViewState.ts'
import type { AimedPourView } from '../AimedPour.ts'
import { carriedItemShapes, faucetSpout, footprintRadiusMetres, type CarriedShape } from '../RoomLayout.ts'
import type { Walk } from '../Walking/Walk.ts'
import type { RoomMaterials } from './RoomMaterials.ts'
import type { TapTargetTag } from './RoomModel.ts'

const handHeightMetres = 0.55
const handSideMetres = 0.26
const handForwardMetres = 0.14
const spoutAboveTargetRimMetres = 0.1
const smallestVisibleTiltDegrees = 10
const streamRadiusMetres = 0.007
const steamRiseMetresPerSecond = 0.12
const steamColumnMetres = 0.18
const openLidSideMetres = 0.16
const lidTouchPadRadiusMetres = 0.095
const heldInViewDistanceMetres = 0.9
const heldInViewShareOfScreenWidth = 0.24
const heldInViewShareOfScreenHeightFromBottom = 0.07
const chosenHeldLiftShareOfScreenHeight = 0.05
const heldInViewTiltTowardsCameraRadians = 0.55
const heldInViewInsetShareOfItemWidth = 0.8
const handTouchAreaShareOfScreenWidth = 0.42
const handTouchAreaShareOfScreenHeight = 0.2
const gaugeBottomMetres = 0.055
const gaugeHeightMetres = 0.11
const gaugeFaceMetres = 0.142
const waterInGaugeColour = '#3f8fc4'
const heldUnderTheFaucetBelowSpoutMetres = 0.06
const kettleBodyRadiusMetres = 0.14
const kettleBodyCentreMetres = 0.11
const kettleBodySquash = 0.8
const kettleOpeningRadiusMetres = 0.075
const kettleOpeningAngle = Math.asin(kettleOpeningRadiusMetres / kettleBodyRadiusMetres)
const kettleBottomInsideMetres = 0.004
const kettleWaterBelowTheOpeningMetres = 0.012
const waterInsideTheKettleColour = '#5f93b5'

export const heldInViewLayer = 1

const puffsBySteam: Readonly<Record<TableViewState.SteamLevel, number>> = { none: 0, wisps: 1, visible: 2, billowing: 3 }

export type CarriedItemsScene = {
  readonly state: DeepReadonly<SessionState>
  readonly table: TableViewState
  readonly walk: Walk
  readonly heldInView: HeldInView | null
  readonly aimedPour: AimedPourView | null
  readonly timeSeconds: number
}

export type HeldInView = {
  readonly camera: THREE.PerspectiveCamera
  readonly selectedHandIndex: HandIndex | null
}

type CarriedModel = {
  readonly itemId: string
  readonly shape: CarriedShape
  readonly root: THREE.Group
  readonly spoutTip: THREE.Vector3
  readonly rimHeight: number
  readonly footprintRadius: number
  readonly lid: THREE.Object3D | null
  readonly lidClosedPosition: THREE.Vector3
  readonly liquid: THREE.Mesh | null
  readonly liquidMaterial: THREE.MeshStandardMaterial | null
  readonly gaugeWater: THREE.Mesh | null
  readonly spoonLeaves: THREE.Mesh | null
  readonly kettleWater: THREE.Mesh | null
  readonly puffs: readonly THREE.Mesh[]
  tagKey: string
  isHeldInView: boolean
}

export class CarriedItems {
  readonly root = new THREE.Group()
  readonly tappableMeshes: THREE.Object3D[] = []
  private readonly materials: RoomMaterials
  private readonly insideVisibleMaterial: THREE.Material
  private readonly claySeenFromInside: THREE.Material
  private readonly touchPadMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  private readonly steamMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false })
  private readonly models: CarriedModel[]
  private readonly stream: THREE.Mesh
  private readonly tapStream: THREE.Mesh
  private readonly handTouchAreas: readonly [THREE.Mesh, THREE.Mesh]
  private readonly streamMaterial: THREE.MeshStandardMaterial

  constructor(materials: RoomMaterials, itemIds: readonly string[]) {
    this.materials = materials
    const porcelain = materials.unsharedMaterialFor('porcelain')
    porcelain.side = THREE.DoubleSide
    this.insideVisibleMaterial = porcelain
    const clay = materials.unsharedMaterialFor('clay')
    clay.side = THREE.DoubleSide
    this.claySeenFromInside = clay
    this.models = itemIds.flatMap((itemId) => {
      const shape = carriedItemShapes[itemId]
      return shape === undefined ? [] : [this.modelOf(itemId, shape)]
    })
    this.streamMaterial = new THREE.MeshStandardMaterial({ color: '#dfe7ea', transparent: true, opacity: 0.85 })
    this.stream = new THREE.Mesh(new THREE.CylinderGeometry(streamRadiusMetres, streamRadiusMetres, 1, 6), this.streamMaterial)
    this.stream.visible = false
    this.tapStream = new THREE.Mesh(new THREE.CylinderGeometry(streamRadiusMetres, streamRadiusMetres, 1, 6), this.materials.unsharedMaterialFor('tapWater'))
    this.tapStream.visible = false
    this.root.add(this.stream, this.tapStream)
    this.handTouchAreas = [this.handTouchArea(0), this.handTouchArea(1)]
  }

  show(scene: CarriedItemsScene): void {
    for (const model of this.models) this.place(model, scene)
    for (const model of this.models) this.showContents(model, scene)
    this.showPour(scene)
    this.showTapWater(scene)
    this.handTouchAreas.forEach((area, handIndex) => this.placeHandTouchArea(area, handIndex === 0 ? 0 : 1, scene))
  }

  private handTouchArea(handIndex: HandIndex): THREE.Mesh {
    const area = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.touchPadMaterial)
    area.layers.set(heldInViewLayer)
    area.visible = false
    const tag: TapTargetTag = { handIndex }
    area.userData = { tapTarget: tag }
    this.root.add(area)
    this.tappableMeshes.push(area)
    return area
  }

  private placeHandTouchArea(area: THREE.Mesh, handIndex: HandIndex, scene: CarriedItemsScene): void {
    const itemId = scene.state.keeper.hands[handIndex] ?? null
    const isPouringFromIt = itemId !== null && scene.state.pour?.sourceId === itemId
    area.visible = scene.heldInView !== null && itemId !== null && !isPouringFromIt
    if (!area.visible || scene.heldInView === null) return
    const frame = heldInViewFrame(scene.heldInView, handIndex)
    area.position.copy(scene.heldInView.camera.localToWorld(frame.centreInCamera))
    area.quaternion.copy(scene.heldInView.camera.quaternion)
    area.scale.set(frame.screenWidth * handTouchAreaShareOfScreenWidth, frame.screenHeight * handTouchAreaShareOfScreenHeight, 1)
  }

  private place(model: CarriedModel, scene: CarriedItemsScene): void {
    const location = itemLocationIn(scene.state, model.itemId)
    if (location === undefined) return
    const aim = scene.aimedPour?.sourceId === model.itemId ? scene.aimedPour : null
    const isUnderTheFaucet = scene.state.filling?.vesselId === model.itemId
    const heldInView = location.kind === 'inHand' && aim === null && !isUnderTheFaucet ? scene.heldInView : null
    moveToLayer(model, heldInView !== null)
    model.root.scale.setScalar(1)
    if (aim !== null) return this.aimOver(model, aim)
    if (isUnderTheFaucet) return holdUnderTheFaucet(model)
    model.root.rotation.set(0, 0, 0)
    if (location.kind === 'onSurface') {
      model.root.visible = true
      model.root.position.set(location.spot.x, location.spot.y, location.spot.z)
      return this.retag(model, { itemId: model.itemId })
    }
    model.root.visible = true
    this.retag(model, { handIndex: location.handIndex })
    if (heldInView !== null) return holdInView(model, location.handIndex, heldInView)
    const hand = handPosition(scene.walk, location.handIndex)
    model.root.position.copy(hand)
    model.root.rotation.y = scene.walk.headingRadians
  }

  private aimOver(model: CarriedModel, aim: AimedPourView): void {
    const target = this.models.find((candidate) => candidate.itemId === aim.targetId)
    if (target === undefined) return
    const tiltRadians = -THREE.MathUtils.degToRad(Math.max(0, aim.tiltDegrees))
    const tipAfterTilt = model.spoutTip.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), tiltRadians)
    const tipGoal = new THREE.Vector3(aim.spout.x, target.root.position.y + target.rimHeight + spoutAboveTargetRimMetres, aim.spout.z)
    model.root.visible = true
    model.root.rotation.set(0, 0, tiltRadians)
    model.root.position.copy(tipGoal.sub(tipAfterTilt))
  }

  private showContents(model: CarriedModel, scene: CarriedItemsScene): void {
    const vessel = scene.table.vessels[model.itemId]
    const isOpen = model.shape === 'caddy' ? scene.table.caddy.isOpen : vessel?.isLidOpen === true
    if (model.lid !== null) model.lid.position.copy(model.lidClosedPosition).add(new THREE.Vector3(isOpen ? -openLidSideMetres : 0, 0, 0))
    if (model.liquid !== null && model.liquidMaterial !== null && vessel !== undefined) showLiquid(model, vessel)
    if (model.gaugeWater !== null && vessel !== undefined) showWaterInGauge(model.gaugeWater, vessel)
    if (model.kettleWater !== null && vessel !== undefined) showWaterInsideTheKettle(model.kettleWater, vessel)
    if (model.spoonLeaves !== null) showLeavesOnTheSpoon(model.spoonLeaves, scene.table.spoonFillShare)
    const puffCount = vessel === undefined || !model.root.visible || model.isHeldInView ? 0 : puffsBySteam[vessel.steam]
    model.puffs.forEach((puff, index) => {
      puff.visible = index < puffCount
      const rise = (scene.timeSeconds * steamRiseMetresPerSecond + index / model.puffs.length) % 1
      puff.position.set(model.root.position.x, model.root.position.y + model.rimHeight + 0.04 + rise * steamColumnMetres, model.root.position.z)
      puff.scale.setScalar(0.6 + rise)
    })
  }

  private showPour(scene: CarriedItemsScene): void {
    const pour = scene.state.pour
    const source = this.models.find((model) => model.itemId === pour?.sourceId)
    const target = this.models.find((model) => model.itemId === pour?.targetId)
    const isStreamShown = pour !== null && pour.tiltDegrees >= smallestVisibleTiltDegrees
    this.stream.visible = isStreamShown && source !== undefined && target !== undefined
    if (!this.stream.visible || source === undefined || target === undefined) return
    const top = source.root.localToWorld(source.spoutTip.clone())
    const bottomY = target.root.position.y + 0.01
    const length = Math.max(0.01, top.y - bottomY)
    this.stream.position.set(top.x, bottomY + length / 2, top.z)
    this.stream.scale.set(1, length, 1)
    this.streamMaterial.color.set(scene.table.vessels[source.itemId]?.liquorColour ?? '#dfe7ea')
  }

  private showTapWater(scene: CarriedItemsScene): void {
    const filled = this.models.find((model) => model.itemId === scene.state.filling?.vesselId)
    this.tapStream.visible = filled !== undefined
    if (filled === undefined) return
    const bottomY = filled.root.position.y + filled.rimHeight * 0.5
    const length = Math.max(0.01, faucetSpout.y - bottomY)
    this.tapStream.position.set(faucetSpout.x, bottomY + length / 2, faucetSpout.z)
    this.tapStream.scale.set(1, length, 1)
  }

  private retag(model: CarriedModel, tag: TapTargetTag): void {
    const tagKey = JSON.stringify(tag)
    if (model.tagKey === tagKey) return
    model.tagKey = tagKey
    model.root.traverse((part) => (part.userData = { ...part.userData, tapTarget: tag }))
    if (model.lid === null || !('itemId' in tag)) return
    const lidTag: TapTargetTag = { lidOfItemId: model.itemId }
    model.lid.traverse((part) => (part.userData = { ...part.userData, tapTarget: lidTag }))
  }

  private modelOf(itemId: string, shape: CarriedShape): CarriedModel {
    const root = new THREE.Group()
    const parts = this.partsOf(shape)
    root.add(...parts.meshes)
    if (parts.lid !== null) root.add(parts.lid)
    const liquidMaterial = parts.liquidRadius === null ? null : (this.materials.unsharedMaterialFor('porcelain') as THREE.MeshStandardMaterial)
    const liquid = liquidMaterial === null ? null : new THREE.Mesh(new THREE.CircleGeometry(1, 20), liquidMaterial)
    if (liquid !== null) {
      liquid.rotation.x = -Math.PI / 2
      root.add(liquid)
    }
    const gaugeWater = shape === 'kettle' ? this.addWaterGauge(root) : null
    const spoonLeaves = shape === 'spoon' ? this.addSpoonLeaves(root) : null
    const kettleWater = shape === 'kettle' ? this.addKettleWater(root) : null
    root.traverse((part) => (part.castShadow = !(part instanceof THREE.Mesh && part.material === this.touchPadMaterial)))
    const puffs = [0, 1, 2].map(() => new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), this.steamMaterial))
    for (const puff of puffs) puff.castShadow = false
    this.root.add(root, ...puffs)
    this.tappableMeshes.push(root)
    return {
      itemId,
      shape,
      root,
      spoutTip: parts.spoutTip,
      rimHeight: parts.rimHeight,
      footprintRadius: footprintRadiusMetres[shape],
      lid: parts.lid,
      lidClosedPosition: parts.lid?.position.clone() ?? new THREE.Vector3(),
      liquid,
      liquidMaterial,
      gaugeWater,
      spoonLeaves,
      kettleWater,
      puffs,
      tagKey: '',
      isHeldInView: false,
    }
  }

  private addKettleWater(root: THREE.Group): THREE.Mesh {
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 24), this.materials.unsharedMaterialFor('gaugeGlass'))
    water.rotation.x = -Math.PI / 2
    water.visible = false
    root.add(water)
    return water
  }

  private addSpoonLeaves(root: THREE.Group): THREE.Mesh {
    const leaves = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.015, 10), this.materials.materialFor('leaves'))
    leaves.position.set(0.07, 0.025, 0)
    leaves.visible = false
    root.add(leaves)
    return leaves
  }

  private addWaterGauge(root: THREE.Group): THREE.Mesh {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.048, gaugeHeightMetres + 0.014, 0.006), this.materials.materialFor('gaugeGlass'))
    glass.position.set(0, gaugeBottomMetres + gaugeHeightMetres / 2, gaugeFaceMetres)
    const water = new THREE.Mesh(new THREE.BoxGeometry(0.034, 1, 0.008), this.materials.unsharedMaterialFor('gaugeGlass'))
    water.position.set(0, gaugeBottomMetres, gaugeFaceMetres + 0.001)
    root.add(glass, water)
    return water
  }

  private partsOf(shape: CarriedShape): { meshes: THREE.Object3D[]; lid: THREE.Object3D | null; spoutTip: THREE.Vector3; rimHeight: number; liquidRadius: number | null } {
    switch (shape) {
      case 'kettle':
        return this.kettleParts()
      case 'thermos':
        return this.thermosParts()
      case 'caddy':
        return this.caddyParts()
      case 'bowl':
        return this.bowlParts()
      case 'spoon':
        return this.spoonParts()
      case 'cloth':
        return this.clothParts()
    }
  }

  private kettleParts() {
    const bodyWithAnOpening = new THREE.SphereGeometry(kettleBodyRadiusMetres, 20, 14, 0, Math.PI * 2, kettleOpeningAngle, Math.PI - kettleOpeningAngle)
    const body = new THREE.Mesh(bodyWithAnOpening, this.claySeenFromInside)
    body.scale.set(1, kettleBodySquash, 1)
    body.position.y = kettleBodyCentreMetres
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.14, 8), this.materials.materialFor('clay'))
    spout.position.set(0.15, 0.14, 0)
    spout.rotation.z = -0.9
    const lid = new THREE.Group()
    const lidTop = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.03, 14), this.materials.materialFor('darkWood'))
    const lidTouchPad = new THREE.Mesh(new THREE.CylinderGeometry(lidTouchPadRadiusMetres, lidTouchPadRadiusMetres, 0.04, 12), this.touchPadMaterial)
    lid.add(lidTop, lidTouchPad)
    lid.position.y = 0.215
    return { meshes: [body, spout], lid, spoutTip: new THREE.Vector3(0.205, 0.183, 0), rimHeight: 0.23, liquidRadius: null }
  }

  private thermosParts() {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 14), this.materials.materialFor('steel'))
    body.position.y = 0.15
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.05, 12), this.materials.materialFor('darkWood'))
    lid.position.y = 0.325
    return { meshes: [body], lid, spoutTip: new THREE.Vector3(0.06, 0.3, 0), rimHeight: 0.3, liquidRadius: null }
  }

  private caddyParts() {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 14), this.materials.materialFor('caddyGreen'))
    body.position.y = 0.08
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 14), this.materials.materialFor('darkWood'))
    lid.position.y = 0.175
    return { meshes: [body], lid, spoutTip: new THREE.Vector3(0.08, 0.16, 0), rimHeight: 0.19, liquidRadius: null }
  }

  private spoonParts() {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.025), this.materials.materialFor('darkWood'))
    handle.position.set(-0.04, 0.01, 0)
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.02, 12), this.materials.materialFor('darkWood'))
    bowl.position.set(0.07, 0.012, 0)
    return { meshes: [handle, bowl], lid: null, spoutTip: new THREE.Vector3(0.11, 0.02, 0), rimHeight: 0.025, liquidRadius: null }
  }

  private clothParts() {
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.2), this.materials.materialFor('cloth'))
    cloth.position.y = 0.01
    return { meshes: [cloth], lid: null, spoutTip: new THREE.Vector3(0.14, 0.02, 0), rimHeight: 0.02, liquidRadius: null }
  }

  private bowlParts() {
    const profile = [
      new THREE.Vector2(0, 0.008),
      new THREE.Vector2(0.04, 0.004),
      new THREE.Vector2(0.05, 0),
      new THREE.Vector2(0.066, 0.014),
      new THREE.Vector2(0.078, 0.036),
      new THREE.Vector2(0.083, 0.062),
    ]
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 20), this.insideVisibleMaterial)
    return { meshes: [body], lid: null, spoutTip: new THREE.Vector3(0.083, 0.062, 0), rimHeight: 0.062, liquidRadius: 0.08 }
  }
}

function showLiquid(model: CarriedModel, vessel: TableViewState.Vessel): void {
  if (model.liquid === null || model.liquidMaterial === null) return
  model.liquid.visible = vessel.fillShare > 0
  const surfaceHeight = 0.008 + vessel.fillShare * (model.rimHeight - 0.014)
  const radius = 0.042 + (surfaceHeight / model.rimHeight) * 0.038
  model.liquid.position.y = surfaceHeight
  model.liquid.scale.setScalar(radius)
  model.liquidMaterial.color.set(vessel.liquorColour)
}


function showWaterInGauge(gaugeWater: THREE.Mesh, vessel: TableViewState.Vessel): void {
  const height = Math.max(0.001, vessel.fillShare * gaugeHeightMetres)
  gaugeWater.visible = vessel.fillShare > 0
  gaugeWater.scale.y = height
  gaugeWater.position.y = gaugeBottomMetres + height / 2
  const material = gaugeWater.material
  if (material instanceof THREE.MeshStandardMaterial) material.color.set(vessel.brewStage === 'water' ? waterInGaugeColour : vessel.liquorColour)
}

function showWaterInsideTheKettle(water: THREE.Mesh, vessel: TableViewState.Vessel): void {
  water.visible = vessel.fillShare > 0
  const bodyHalfHeight = kettleBodyRadiusMetres * kettleBodySquash
  const openingHeight = kettleBodyCentreMetres + bodyHalfHeight * Math.cos(kettleOpeningAngle)
  const surfaceHeight = kettleBottomInsideMetres + vessel.fillShare * (openingHeight - kettleWaterBelowTheOpeningMetres - kettleBottomInsideMetres)
  const heightFromCentre = (surfaceHeight - kettleBodyCentreMetres) / bodyHalfHeight
  water.position.y = surfaceHeight
  water.scale.setScalar(Math.max(0.001, kettleBodyRadiusMetres * Math.sqrt(Math.max(0, 1 - heightFromCentre * heightFromCentre)) - 0.003))
  const material = water.material
  if (material instanceof THREE.MeshStandardMaterial) material.color.set(vessel.brewStage === 'water' ? waterInsideTheKettleColour : vessel.liquorColour)
}

function showLeavesOnTheSpoon(leaves: THREE.Mesh, spoonFillShare: number): void {
  leaves.visible = spoonFillShare > 0
  leaves.scale.set(0.4 + spoonFillShare * 0.6, 1, 0.4 + spoonFillShare * 0.6)
}

function holdUnderTheFaucet(model: CarriedModel): void {
  model.root.visible = true
  model.root.quaternion.identity()
  model.root.position.set(faucetSpout.x, faucetSpout.y - heldUnderTheFaucetBelowSpoutMetres - model.rimHeight, faucetSpout.z)
}

function moveToLayer(model: CarriedModel, isHeldInView: boolean): void {
  if (model.isHeldInView === isHeldInView) return
  model.isHeldInView = isHeldInView
  model.root.traverse((part) => part.layers.set(isHeldInView ? heldInViewLayer : 0))
}

function holdInView(model: CarriedModel, handIndex: HandIndex, heldInView: HeldInView): void {
  const { camera } = heldInView
  const frame = heldInViewFrame(heldInView, handIndex)
  model.root.position.copy(camera.localToWorld(frame.baseInCamera))
  model.root.quaternion.copy(camera.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), heldInViewTiltTowardsCameraRadians))
  model.root.scale.setScalar(frame.itemWidth / (2 * model.footprintRadius))
}

function heldInViewFrame(heldInView: HeldInView, handIndex: HandIndex) {
  const { camera, selectedHandIndex } = heldInView
  const screenHeight = 2 * heldInViewDistanceMetres * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const screenWidth = screenHeight * camera.aspect
  const itemWidth = screenWidth * heldInViewShareOfScreenWidth
  const side = handIndex === 0 ? -1 : 1
  const x = side * (screenWidth / 2 - itemWidth * heldInViewInsetShareOfItemWidth)
  const lift = selectedHandIndex === handIndex ? screenHeight * chosenHeldLiftShareOfScreenHeight : 0
  const bottom = -screenHeight / 2 + screenHeight * heldInViewShareOfScreenHeightFromBottom + lift
  return {
    screenWidth,
    screenHeight,
    itemWidth,
    baseInCamera: new THREE.Vector3(x, bottom, -heldInViewDistanceMetres),
    centreInCamera: new THREE.Vector3(x, bottom + screenHeight * handTouchAreaShareOfScreenHeight * 0.4, -heldInViewDistanceMetres),
  }
}

function handPosition(walk: Walk, handIndex: HandIndex): THREE.Vector3 {
  const side = handIndex === 0 ? handSideMetres : -handSideMetres
  const heading = walk.headingRadians
  const x = walk.position.x + Math.cos(heading) * side + Math.sin(heading) * handForwardMetres
  const z = walk.position.z - Math.sin(heading) * side + Math.cos(heading) * handForwardMetres
  return new THREE.Vector3(x, handHeightMetres, z)
}
