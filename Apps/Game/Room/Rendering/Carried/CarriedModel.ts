import type { GlassThatClears } from '../../../../Engine/Rendering/Looks.ts'
import * as THREE from 'three'
import { layoutByShape, type CarriedShape } from '../../CarriedShapes.ts'
import { roomLayers, type Pass } from '../RoomLayers.ts'
import type { LayerRole } from '../../../../Engine/Rendering/Layers.ts'
import type { TapTargetTag } from '../../TapTarget.ts'
import { bowlShapeLook } from './Shapes/BowlParts.ts'
import { caddyShapeLook } from './Shapes/CaddyParts.ts'
import type { CarriedShapeLook } from './CarriedShapeLook.ts'
import { clothShapeLook } from './Shapes/ClothParts.ts'
import type { ItemSetUp, CharTo, Display, LookByWhereItIsDrawn, VesselParts } from './ItemParts.ts'
import type { LevelOfDetail } from '../../../../Engine/Rendering/LevelsOfDetail.ts'
import { kettleShapeLook } from './Shapes/KettleParts.ts'
import type { LeafPile } from './LeafPile.ts'
import { spoonShapeLook } from './Shapes/SpoonParts.ts'
import { thermosShapeLook } from './Shapes/ThermosParts.ts'
import { openingOf } from './VesselProfile.ts'

export type PuffTrail = {
  readonly material: THREE.Material
  readonly origin: THREE.Vector3
  readonly direction: THREE.Vector3
  size: number
  reachMetres: number
  opacity: number
  whereTheVesselWas: string
  leftBehindAtSeconds: number | null
  lastRise: number
  isOut: boolean
}

export type SteamLook = {
  readonly inRoom: THREE.Material
  readonly heldInView: THREE.Material
  readonly drawnToTheEyes: THREE.Material
}

export type ModelNow = {
  liquidVolumeHeight: number
  leaves: { readonly pile: LeafPile; readonly teaId: string | null } | null
  soakedLeaves: { readonly pile: LeafPile; readonly teaId: string } | null
  soakedLeavesTurn: { radians: number; atSeconds: number } | null
  sipSteamStartedAtSeconds: number | null
  isDrawnSimply: boolean
  glassClearShare: number
  tagKey: string
  pass: Pass
  role: LayerRole
  isHeldInView: boolean
  castsShadow: boolean
}

export type CarriedModel = {
  readonly itemId: string
  readonly shape: CarriedShape
  readonly look: CarriedShapeLook
  readonly root: THREE.Group
  readonly heightMetres: number
  readonly bodyRadius: number
  readonly lid: THREE.Object3D | null
  readonly lidClosedPosition: THREE.Vector3
  readonly lidOriginAboveItsLowestPointMetres: number
  readonly opening: THREE.Mesh | null
  readonly liquid: THREE.Mesh | null
  readonly liquidMaterial: THREE.MeshStandardMaterial | null
  readonly vessel: VesselParts | null
  readonly liquidVolume: THREE.Mesh | null
  readonly leafHolder: THREE.Group | null
  readonly leafMaterial: THREE.Material
  readonly soakedLeafHolder: THREE.Group | null
  readonly puffs: readonly THREE.Mesh[]
  readonly lookByWhereItIsDrawn: LookByWhereItIsDrawn | null
  readonly glassThatClears: GlassThatClears | null
  readonly steamLook: SteamLook
  readonly puffTrails: readonly PuffTrail[]
  readonly sipPuffs: readonly THREE.Mesh[]
  readonly sipPuffTrails: readonly PuffTrail[]
  readonly displays: readonly Display[]
  readonly charTo: CharTo | null
  readonly levelsOfDetail: readonly LevelOfDetail[]
  readonly now: ModelNow
}

const mostSteamSources = 2
const steamPuffGeometry = new THREE.SphereGeometry(0.03, 8, 6)
const sipPuffGeometry = new THREE.SphereGeometry(0.03, 24, 16)
export const mostPuffsFromOneSource = 3

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

export function newCarriedModel(itemId: string, shape: CarriedShape, materials: ItemSetUp): CarriedModel {
  const root = new THREE.Group()
  const look = lookByShape[shape]
  const parts = look.partsFor(materials, itemId)
  root.add(...parts.meshes)
  if (parts.lid !== null) root.add(parts.lid)
  const liquidParts = parts.vessel?.liquid ?? null
  const liquidMaterial = liquidParts === null ? null : (materials.room.unsharedMaterialFor('liquidSurface') as THREE.MeshStandardMaterial)
  const liquid = liquidMaterial === null ? null : new THREE.Mesh(new THREE.CircleGeometry(1, liquidSurfaceSegments), liquidMaterial)
  if (liquid !== null && liquidMaterial !== null) {
    liquid.rotation.x = -Math.PI / 2
    liquid.renderOrder = liquidDrawnAfterThePaintingBelowIt
    root.add(liquid)
  }
  const liquidVolume = (liquidParts?.volumeAt ?? null) !== null ? new THREE.Mesh(new THREE.BufferGeometry(), materials.room.unsharedMaterialFor('liquidBody')) : null
  if (liquidVolume !== null) root.add(liquidVolume)
  const opening = liquidParts === null || parts.vessel === null ? null : touchAreaOverTheOpening(shape, openingOf(parts.vessel.profile).heightMetres)
  if (opening !== null) root.add(opening)
  const leafHolder = look.looseLeaves === null ? null : leafHolderAt(look.looseLeaves.heapStartsAt)
  if (leafHolder !== null) root.add(leafHolder)
  const soakedLeafHolder = look.soakedLeaves === null ? null : new THREE.Group()
  if (soakedLeafHolder !== null) root.add(soakedLeafHolder)
  root.traverse((part) => (part.castShadow = !roomLayers.isATouchArea(part)))
  const steamLook: SteamLook = { inRoom: materials.room.materialFor(look.steamSurface), heldInView: materials.room.materialFor('heldSteam'), drawnToTheEyes: materials.room.materialFor('steam') }
  const puffTrails = Array.from({ length: mostPuffsFromOneSource * mostSteamSources }, () => newPuffTrail(steamLook.inRoom))
  const sipPuffTrails = Array.from({ length: mostPuffsFromOneSource }, () => newPuffTrail(steamLook.drawnToTheEyes))
  const puffs = puffTrails.map((trail) => new THREE.Mesh(steamPuffGeometry, trail.material))
  const sipPuffs = sipPuffTrails.map((trail) => new THREE.Mesh(sipPuffGeometry, trail.material))
  for (const puff of [...puffs, ...sipPuffs]) {
    puff.castShadow = false
    puff.visible = false
  }
  return {
    itemId,
    shape,
    look,
    root,
    heightMetres: parts.heightMetres,
    bodyRadius: layoutByShape[shape].bodyRadiusMetres,
    lid: parts.lid,
    lidClosedPosition: parts.lid?.position.clone() ?? new THREE.Vector3(),
    lidOriginAboveItsLowestPointMetres: parts.lid === null ? 0 : originAboveTheLowestDrawnPointOf(parts.lid),
    opening,
    liquid,
    liquidMaterial,
    vessel: parts.vessel,
    liquidVolume,
    leafHolder,
    leafMaterial: materials.room.materialFor('leaves'),
    soakedLeafHolder,
    puffs,
    lookByWhereItIsDrawn: parts.lookByWhereItIsDrawn,
    glassThatClears: parts.glassThatClears,
    steamLook,
    puffTrails,
    sipPuffs,
    sipPuffTrails,
    displays: parts.displays,
    charTo: parts.charTo,
    levelsOfDetail: parts.levelsOfDetail,
    now: { liquidVolumeHeight: 0, leaves: null, soakedLeaves: null, soakedLeavesTurn: null, sipSteamStartedAtSeconds: null, isDrawnSimply: false, glassClearShare: 0, tagKey: '', pass: 'room', role: 'takesTaps', isHeldInView: false, castsShadow: true },
  }
}

export function tagForTaps(model: CarriedModel, tag: TapTargetTag): void {
  const tagKey = JSON.stringify(tag)
  if (model.now.tagKey === tagKey) return
  model.now.tagKey = tagKey
  model.root.traverse((part) => (part.userData = { ...part.userData, tapTarget: tag }))
  if (model.opening !== null && tag.kind === 'item') model.opening.userData = { ...model.opening.userData, tapTarget: { kind: 'opening', itemId: model.itemId } satisfies TapTargetTag }
  if (model.lid === null || !(tag.kind === 'item' || tag.kind === 'hand')) return
  const lidTag: TapTargetTag = { kind: 'lid', itemId: model.itemId }
  model.lid.traverse((part) => (part.userData = { ...part.userData, tapTarget: lidTag }))
}

function newPuffTrail(look: THREE.Material): PuffTrail {
  return { material: look.clone(), origin: new THREE.Vector3(), direction: new THREE.Vector3(0, 1, 0), size: 1, reachMetres: 0, opacity: look.opacity, whereTheVesselWas: '', leftBehindAtSeconds: null, lastRise: 0, isOut: false }
}

function originAboveTheLowestDrawnPointOf(lid: THREE.Object3D): number {
  lid.updateMatrixWorld(true)
  const drawnBounds = new THREE.Box3()
  lid.traverse((part) => {
    if (part instanceof THREE.Mesh && !roomLayers.isATouchArea(part)) drawnBounds.expandByObject(part, true)
  })
  return lid.position.y - drawnBounds.min.y
}

function touchAreaOverTheOpening(shape: CarriedShape, openingHeightMetres: number): THREE.Mesh {
  const area = roomLayers.touchAreaOf(new THREE.CircleGeometry(layoutByShape[shape].openingRadiusMetres, 24))
  area.rotation.x = -Math.PI / 2
  area.position.y = openingHeightMetres + openingTouchAreaAboveTheRimMetres
  return area
}

function leafHolderAt(point: { readonly x: number; readonly y: number; readonly z: number }): THREE.Group {
  const holder = new THREE.Group()
  holder.position.set(point.x, point.y, point.z)
  return holder
}
