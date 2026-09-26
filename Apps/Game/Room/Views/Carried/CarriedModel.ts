import * as THREE from 'three'
import type { LampDisplay } from '../LampDisplay.ts'
import { layoutByShape, type CarriedShape } from '../../CarriedShapes.ts'
import { isATouchArea, touchAreaOf } from '../RoomLayers.ts'
import { bowlShapeLook } from './BowlParts.ts'
import { caddyShapeLook } from './CaddyParts.ts'
import type { CarriedShapeLook } from './CarriedShapeLook.ts'
import { clothShapeLook } from './ClothParts.ts'
import type { GaugeStrip } from './GaugeStrip.ts'
import type { CarriedModelMaterials, CharTo, GlowingShell, HeldInViewLook, LevelOfDetail, LiquidLevel, LiquidVolumeAt, PointDownTheSide } from './ItemParts.ts'
import { kettleShapeLook } from './KettleParts.ts'
import type { LeafPile } from './LeafPile.ts'
import { spoonShapeLook } from './SpoonParts.ts'
import { thermosShapeLook } from './ThermosParts.ts'

export type CarriedModel = {
  readonly itemId: string
  readonly shape: CarriedShape
  readonly look: CarriedShapeLook
  readonly root: THREE.Group
  readonly spoutTip: THREE.Vector3
  readonly rimHeight: number
  readonly footprintRadius: number
  readonly lid: THREE.Object3D | null
  readonly lidClosedPosition: THREE.Vector3
  readonly opening: THREE.Mesh | null
  readonly liquid: THREE.Mesh | null
  readonly liquidMaterial: THREE.MeshStandardMaterial | null
  readonly liquidLevel: LiquidLevel | null
  readonly pointsDownTheSide: readonly PointDownTheSide[] | null
  readonly liquidVolume: THREE.Mesh | null
  readonly liquidVolumeAt: LiquidVolumeAt | null
  liquidVolumeHeight: number
  readonly gaugeWater: GaugeStrip | null
  readonly leafHolder: THREE.Group | null
  leaves: { readonly pile: LeafPile; readonly teaId: string | null } | null
  readonly soakedLeafHolder: THREE.Group | null
  soakedLeaves: { readonly pile: LeafPile; readonly teaId: string } | null
  soakedLeavesTurn: { radians: number; atSeconds: number } | null
  readonly kettleWater: THREE.Mesh | null
  readonly liquidTint: THREE.Color | null
  readonly puffs: readonly THREE.Mesh[]
  readonly heldInViewLook: HeldInViewLook | null
  readonly glowingShell: GlowingShell | null
  readonly charTo: CharTo | null
  readonly thermometer: LampDisplay | null
  readonly levelsOfDetail: readonly LevelOfDetail[]
  isDrawnSimply: boolean
  tagKey: string
  layer: number
  isHeldInView: boolean
  castsShadow: boolean
}

const mostSteamSources = 2
const steamPuffGeometry = new THREE.SphereGeometry(0.03, 8, 6)
export const mostPuffsFromOneSource = 3

const touchPadShareOfTheFootprint = 1.5
const touchPadAboveTheRimMetres = 0.05
const openingTouchAreaAboveTheRimMetres = 0.005
const liquidSurfaceSegments = 64
const liquidDrawnAfterThePaintingBelowIt = 2
const lookByShape: Readonly<Record<CarriedShape, CarriedShapeLook>> = {
  kettle: kettleShapeLook,
  thermos: thermosShapeLook,
  caddy: caddyShapeLook,
  bowl: bowlShapeLook,
  spoon: spoonShapeLook,
  cloth: clothShapeLook,
}

export function newCarriedModel(itemId: string, shape: CarriedShape, materials: CarriedModelMaterials): CarriedModel {
  const root = new THREE.Group()
  const look = lookByShape[shape]
  const parts = look.partsFor(materials, itemId)
  root.add(...parts.meshes)
  if (parts.lid !== null) root.add(parts.lid)
  const liquidMaterial = parts.liquidLevel === null ? null : (materials.room.unsharedMaterialFor('liquidSurface') as THREE.MeshStandardMaterial)
  const liquid = liquidMaterial === null ? null : new THREE.Mesh(new THREE.CircleGeometry(1, liquidSurfaceSegments), liquidMaterial)
  if (liquid !== null && liquidMaterial !== null) {
    liquid.rotation.x = -Math.PI / 2
    liquidMaterial.transparent = true
    liquid.renderOrder = liquidDrawnAfterThePaintingBelowIt
    root.add(liquid)
  }
  const liquidVolume = parts.liquidVolumeAt !== null ? new THREE.Mesh(new THREE.BufferGeometry(), materials.room.unsharedMaterialFor('porcelain')) : null
  if (liquidVolume !== null) root.add(liquidVolume)
  if (parts.lid === null) root.add(forgivingTouchPad(shape, parts.rimHeight))
  const opening = parts.liquidLevel === null ? null : touchAreaOverTheOpening(shape, parts.rimHeight)
  if (opening !== null) root.add(opening)
  const leafHolder = look.looseLeaves === null ? null : leafHolderAt(look.looseLeaves.heapStartsAt)
  if (leafHolder !== null) root.add(leafHolder)
  const soakedLeafHolder = look.soakedLeaves === null ? null : new THREE.Group()
  if (soakedLeafHolder !== null) root.add(soakedLeafHolder)
  root.traverse((part) => (part.castShadow = !isATouchArea(part)))
  const puffs = Array.from({ length: mostPuffsFromOneSource * mostSteamSources }, () => new THREE.Mesh(steamPuffGeometry, materials.room.materialFor('steam')))
  for (const puff of puffs) puff.castShadow = false
  return {
    itemId,
    shape,
    look,
    root,
    spoutTip: parts.spoutTip,
    rimHeight: parts.rimHeight,
    footprintRadius: layoutByShape[shape].footprintRadiusMetres,
    lid: parts.lid,
    lidClosedPosition: parts.lid?.position.clone() ?? new THREE.Vector3(),
    opening,
    liquid,
    liquidMaterial,
    liquidLevel: parts.liquidLevel,
    pointsDownTheSide: parts.pointsDownTheSide,
    liquidVolume,
    liquidVolumeAt: parts.liquidVolumeAt,
    liquidVolumeHeight: 0,
    gaugeWater: parts.gaugeWater,
    leafHolder,
    leaves: null,
    soakedLeafHolder,
    soakedLeaves: null,
    soakedLeavesTurn: null,
    kettleWater: parts.kettleWater,
    liquidTint: parts.liquidTint,
    puffs,
    heldInViewLook: parts.heldInViewLook,
    glowingShell: parts.glowingShell,
    charTo: parts.charTo,
    thermometer: parts.thermometer,
    levelsOfDetail: parts.levelsOfDetail,
    isDrawnSimply: false,
    tagKey: '',
    layer: 0,
    isHeldInView: false,
    castsShadow: true,
  }
}

function forgivingTouchPad(shape: CarriedShape, rimHeight: number): THREE.Mesh {
  const radius = layoutByShape[shape].footprintRadiusMetres * touchPadShareOfTheFootprint
  const height = rimHeight + touchPadAboveTheRimMetres
  const pad = touchAreaOf(new THREE.CylinderGeometry(radius, radius, height, 16))
  pad.position.y = height / 2
  pad.userData = { isForgivingTouchArea: true }
  return pad
}

function touchAreaOverTheOpening(shape: CarriedShape, rimHeight: number): THREE.Mesh {
  const area = touchAreaOf(new THREE.CircleGeometry(layoutByShape[shape].openingRadiusMetres, 24))
  area.rotation.x = -Math.PI / 2
  area.position.y = rimHeight + openingTouchAreaAboveTheRimMetres
  return area
}

function leafHolderAt(point: { readonly x: number; readonly y: number; readonly z: number }): THREE.Group {
  const holder = new THREE.Group()
  holder.position.set(point.x, point.y, point.z)
  return holder
}
