import * as THREE from 'three'
import { footprintRadiusMetres, type CarriedShape } from '../../CarriedShapes.ts'
import { bowlParts } from './BowlParts.ts'
import { caddyParts } from './CaddyParts.ts'
import { clothParts } from './ClothParts.ts'
import type { GaugeStrip } from './GaugeStrip.ts'
import type { CarriedModelMaterials, GlowingShell, HeldInViewLook, ItemParts, LiquidLevel, PointDownTheSide } from './ItemParts.ts'
import { kettleParts } from './KettleParts.ts'
import type { LeafPile } from './LeafPile.ts'
import { spoonParts } from './SpoonParts.ts'
import { thermosParts } from './ThermosParts.ts'

export type CarriedModel = {
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
  readonly liquidLevel: LiquidLevel | null
  readonly pointsDownTheSide: readonly PointDownTheSide[] | null
  readonly liquidVolume: THREE.Mesh | null
  liquidVolumeHeight: number
  readonly gaugeWater: GaugeStrip | null
  readonly leafHolder: THREE.Group | null
  leaves: { readonly pile: LeafPile; readonly teaId: string | null } | null
  readonly soakedLeafHolder: THREE.Group | null
  soakedLeaves: { readonly pile: LeafPile; readonly teaId: string } | null
  readonly kettleWater: THREE.Mesh | null
  readonly puffs: readonly THREE.Mesh[]
  readonly heldInViewLook: HeldInViewLook | null
  readonly glowingShell: GlowingShell | null
  tagKey: string
  layer: number
  isHeldInView: boolean
  castsShadow: boolean
}

const mostSteamSources = 2
export const mostPuffsFromOneSource = 3

const touchPadShareOfTheFootprint = 1.5
const touchPadAboveTheRimMetres = 0.05
const liquidSurfaceSegments = 64
const liquidDrawnAfterThePaintingBelowIt = 2

export function newCarriedModel(itemId: string, shape: CarriedShape, materials: CarriedModelMaterials): CarriedModel {
  const root = new THREE.Group()
  const parts = partsOf(shape, itemId, materials)
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
  const liquidVolume = parts.isSeeThrough === true ? new THREE.Mesh(new THREE.BufferGeometry(), materials.room.unsharedMaterialFor('porcelain')) : null
  if (liquidVolume !== null) root.add(liquidVolume)
  if (parts.lid === null) root.add(forgivingTouchPad(shape, parts.rimHeight, materials.touchPad))
  const leafHolder = leafHolderFor(shape)
  if (leafHolder !== null) root.add(leafHolder)
  const soakedLeafHolder = shape === 'kettle' || shape === 'bowl' ? new THREE.Group() : null
  if (soakedLeafHolder !== null) root.add(soakedLeafHolder)
  root.traverse((part) => (part.castShadow = !(part instanceof THREE.Mesh && part.material === materials.touchPad)))
  const puffs = Array.from({ length: mostPuffsFromOneSource * mostSteamSources }, () => new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), materials.room.materialFor('steam')))
  for (const puff of puffs) puff.castShadow = false
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
    liquidLevel: parts.liquidLevel,
    pointsDownTheSide: parts.pointsDownTheSide ?? null,
    liquidVolume,
    liquidVolumeHeight: 0,
    gaugeWater: parts.gaugeWater ?? null,
    leafHolder,
    leaves: null,
    soakedLeafHolder,
    soakedLeaves: null,
    kettleWater: parts.kettleWater ?? null,
    puffs,
    heldInViewLook: parts.heldInViewLook ?? null,
    glowingShell: parts.glowingShell ?? null,
    tagKey: '',
    layer: 0,
    isHeldInView: false,
    castsShadow: true,
  }
}

function forgivingTouchPad(shape: CarriedShape, rimHeight: number, touchPad: THREE.Material): THREE.Mesh {
  const radius = footprintRadiusMetres[shape] * touchPadShareOfTheFootprint
  const height = rimHeight + touchPadAboveTheRimMetres
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), touchPad)
  pad.position.y = height / 2
  pad.userData = { isForgivingTouchArea: true }
  return pad
}

function leafHolderFor(shape: CarriedShape): THREE.Group | null {
  if (shape !== 'caddy' && shape !== 'spoon') return null
  const holder = new THREE.Group()
  holder.position.set(shape === 'spoon' ? 0.07 : 0, shape === 'spoon' ? 0.02 : 0.004, 0)
  return holder
}

function partsOf(shape: CarriedShape, itemId: string, materials: CarriedModelMaterials): ItemParts {
  switch (shape) {
    case 'kettle':
      return kettleParts(materials)
    case 'thermos':
      return thermosParts(materials.room)
    case 'caddy':
      return caddyParts(materials.room)
    case 'bowl':
      return bowlParts(materials.room, itemId)
    case 'spoon':
      return spoonParts(materials.room)
    case 'cloth':
      return clothParts(materials.cloth)
  }
}
