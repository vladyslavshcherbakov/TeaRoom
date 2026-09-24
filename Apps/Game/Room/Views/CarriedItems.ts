import * as THREE from 'three'
import { caddyItemId } from '../../../../Shared/Simulation/Ritual/Reach.ts'
import type { DeepReadonly } from '../../../../Shared/Simulation/State/DeepReadonly.ts'
import type { HandIndex, ItemLocation, SessionState } from '../../../../Shared/Simulation/State/SessionState.ts'
import type { TableViewState } from '../../Table/TableViewState.ts'
import { carriedItemShapes, type CarriedShape } from '../RoomLayout.ts'
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
const lidTouchPadRadiusMetres = 0.085

const puffsBySteam: Readonly<Record<TableViewState.SteamLevel, number>> = { none: 0, wisps: 1, visible: 2, billowing: 3 }

export type CarriedItemsScene = {
  readonly state: DeepReadonly<SessionState>
  readonly table: TableViewState
  readonly walk: Walk
  readonly isWalkerShown: boolean
  readonly timeSeconds: number
}

type CarriedModel = {
  readonly itemId: string
  readonly shape: CarriedShape
  readonly root: THREE.Group
  readonly spoutTip: THREE.Vector3
  readonly rimHeight: number
  readonly lid: THREE.Object3D | null
  readonly lidClosedPosition: THREE.Vector3
  readonly liquid: THREE.Mesh | null
  readonly liquidMaterial: THREE.MeshStandardMaterial | null
  readonly puffs: readonly THREE.Mesh[]
  tagKey: string
}

export class CarriedItems {
  readonly root = new THREE.Group()
  readonly tappableMeshes: THREE.Object3D[] = []
  private readonly materials: RoomMaterials
  private readonly insideVisibleMaterial: THREE.Material
  private readonly touchPadMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  private readonly steamMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false })
  private readonly models: CarriedModel[]
  private readonly stream: THREE.Mesh
  private readonly streamMaterial: THREE.MeshStandardMaterial

  constructor(materials: RoomMaterials, itemIds: readonly string[]) {
    this.materials = materials
    const porcelain = materials.unsharedMaterialFor('porcelain')
    porcelain.side = THREE.DoubleSide
    this.insideVisibleMaterial = porcelain
    this.models = itemIds.flatMap((itemId) => {
      const shape = carriedItemShapes[itemId]
      return shape === undefined ? [] : [this.modelOf(itemId, shape)]
    })
    this.streamMaterial = new THREE.MeshStandardMaterial({ color: '#dfe7ea', transparent: true, opacity: 0.85 })
    this.stream = new THREE.Mesh(new THREE.CylinderGeometry(streamRadiusMetres, streamRadiusMetres, 1, 6), this.streamMaterial)
    this.stream.visible = false
    this.root.add(this.stream)
  }

  show(scene: CarriedItemsScene): void {
    for (const model of this.models) this.place(model, scene)
    for (const model of this.models) this.showContents(model, scene)
    this.showPour(scene)
  }

  private place(model: CarriedModel, scene: CarriedItemsScene): void {
    const location = locationOf(model.itemId, scene.state)
    if (location === undefined) return
    const pour = scene.state.pour
    if (pour !== null && pour.sourceId === model.itemId && pour.targetId !== null) return this.tipOver(model, pour.targetId, pour.tiltDegrees)
    model.root.rotation.set(0, 0, 0)
    if (location.kind === 'onSurface') {
      model.root.visible = true
      model.root.position.set(location.spot.x, location.spot.y, location.spot.z)
      return this.retag(model, { itemId: model.itemId })
    }
    model.root.visible = scene.isWalkerShown
    const hand = handPosition(scene.walk, location.handIndex)
    model.root.position.copy(hand)
    model.root.rotation.y = scene.walk.headingRadians
    this.retag(model, { handIndex: location.handIndex })
  }

  private tipOver(model: CarriedModel, targetId: string, tiltDegrees: number): void {
    const target = this.models.find((candidate) => candidate.itemId === targetId)
    if (target === undefined) return
    const tiltRadians = -THREE.MathUtils.degToRad(Math.max(0, tiltDegrees))
    const tipAfterTilt = model.spoutTip.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), tiltRadians)
    const tipGoal = target.root.position.clone().add(new THREE.Vector3(0, target.rimHeight + spoutAboveTargetRimMetres, 0))
    model.root.visible = true
    model.root.rotation.set(0, 0, tiltRadians)
    model.root.position.copy(tipGoal.sub(tipAfterTilt))
  }

  private showContents(model: CarriedModel, scene: CarriedItemsScene): void {
    const vessel = scene.table.vessels[model.itemId]
    const isOpen = model.shape === 'caddy' ? scene.table.caddy.isOpen : vessel?.isLidOpen === true
    if (model.lid !== null) model.lid.position.copy(model.lidClosedPosition).add(new THREE.Vector3(isOpen ? -openLidSideMetres : 0, 0, 0))
    if (model.liquid !== null && model.liquidMaterial !== null && vessel !== undefined) showLiquid(model, vessel)
    const puffCount = vessel === undefined || !model.root.visible ? 0 : puffsBySteam[vessel.steam]
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
      lid: parts.lid,
      lidClosedPosition: parts.lid?.position.clone() ?? new THREE.Vector3(),
      liquid,
      liquidMaterial,
      puffs,
      tagKey: '',
    }
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
    }
  }

  private kettleParts() {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), this.materials.materialFor('clay'))
    body.scale.set(1, 0.8, 1)
    body.position.y = 0.11
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.14, 8), this.materials.materialFor('clay'))
    spout.position.set(0.15, 0.14, 0)
    spout.rotation.z = -0.9
    const lid = new THREE.Group()
    const lidTop = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 12), this.materials.materialFor('darkWood'))
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

function locationOf(itemId: string, state: DeepReadonly<SessionState>): DeepReadonly<ItemLocation> | undefined {
  return itemId === caddyItemId ? state.caddy.location : state.vessels[itemId]?.location
}

function handPosition(walk: Walk, handIndex: HandIndex): THREE.Vector3 {
  const side = handIndex === 0 ? handSideMetres : -handSideMetres
  const heading = walk.headingRadians
  const x = walk.position.x + Math.cos(heading) * side + Math.sin(heading) * handForwardMetres
  const z = walk.position.z - Math.sin(heading) * side + Math.cos(heading) * handForwardMetres
  return new THREE.Vector3(x, handHeightMetres, z)
}
