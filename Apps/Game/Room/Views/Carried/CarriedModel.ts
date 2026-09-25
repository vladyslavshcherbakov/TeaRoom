import * as THREE from 'three'
import { footprintRadiusMetres, type CarriedShape } from '../../RoomLayout.ts'
import { heronPaintingAspect } from '../HeronPainting.ts'
import { koiPaintingAspect } from '../KoiPainting.ts'
import { lotusPaintingAspect } from '../LotusPainting.ts'
import { teaCharacterPaintingAspect } from '../TeaCharacterPainting.ts'
import type { RoomMaterials, Surface } from '../RoomMaterials.ts'
import { bowlInsideProfile, bowlOutsideWall, bowlProfile, bowlRimTop, bowlUndersideAndFoot } from './BowlProfile.ts'
import { GaugeStrip } from './GaugeStrip.ts'
import { kettleShape } from './KettleShape.ts'
import type { LeafPile } from './LeafPile.ts'
import { clothLengthMetres, rumpledClothGeometry } from './RumpledClothGeometry.ts'

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

export type PointDownTheSide = { readonly distance: number; readonly height: number }

export type LiquidLevel = (fillShare: number) => { readonly heightMetres: number; readonly radiusMetres: number }

export type GlowingShell = {
  readonly metal: THREE.MeshStandardMaterial
  readonly coolColour: THREE.Color
  readonly coolMetalness: number
}

export type HeldInViewLook = {
  readonly mesh: THREE.Mesh
  readonly inRoom: THREE.Material
  readonly heldInView: THREE.Material
}

export type CarriedModelMaterials = {
  readonly room: RoomMaterials
  readonly claySeenFromInside: THREE.Material
  readonly touchPad: THREE.Material
  readonly cloth: THREE.Material
}

type BottomPainting = {
  readonly surface: Surface
  readonly lengthMetres: number
  readonly aspect: number
  readonly turnRadians: number
}

type BowlRelief = 'smooth' | 'fluted' | 'hobnail'

type BowlLook = {
  readonly glaze: Surface
  readonly relief: BowlRelief
  readonly isRimGilded: boolean
  readonly painting: BottomPainting | null
}

type ItemParts = {
  readonly meshes: THREE.Object3D[]
  readonly lid: THREE.Object3D | null
  readonly spoutTip: THREE.Vector3
  readonly rimHeight: number
  readonly liquidLevel: LiquidLevel | null
  readonly heldInViewLook?: HeldInViewLook
  readonly glowingShell?: GlowingShell | undefined
  readonly isSeeThrough?: boolean
  readonly pointsDownTheSide?: readonly PointDownTheSide[]
}

const mostSteamSources = 2
export const mostPuffsFromOneSource = 3

const lidTouchPadRadiusMetres = 0.095
const gaugeFrameHalfWidthMetres = 0.024
const gaugeFrameAboveTheBodyMetres = 0.0015
const gaugeFrameMarginMetres = 0.007
const gaugeWaterHalfWidthMetres = 0.017
const gaugeWaterAboveTheBodyMetres = 0.003
const touchPadShareOfTheFootprint = 1.5
const touchPadAboveTheRimMetres = 0.05
const paintingAboveTheGlazeMetres = 0.0004
const liquidSurfaceSegments = 64
const liquidDrawnAfterThePaintingBelowIt = 2
const paintingSegmentsAlong = 48
const fewestPaintingSegmentsAcross = 8
const bowlSegmentsAround = 64
const bowlRimHeightMetres = 0.062
const lowestLiquidInABowlMetres = 0.011
const liquidBelowTheRimMetres = 0.006
const liquidAboveTheFloorMetres = 0.002
const liquidInsetFromTheWallMetres = 0.001
const thermosSegmentsAround = 48
const thermosFootRadiusMetres = 0.064
const thermosFootTopMetres = 0.018
const thermosBodyRadiusMetres = 0.062
const thermosBodyTopMetres = 0.265
const thermosShoulderProfile = new THREE.SplineCurve([
  new THREE.Vector2(0.0645, 0.265),
  new THREE.Vector2(0.0615, 0.28),
  new THREE.Vector2(0.05, 0.292),
  new THREE.Vector2(0.041, 0.297),
]).getPoints(12)
const thermosNeckRadiusMetres = 0.04
const thermosNeckBottomMetres = 0.297
const thermosNeckRidgeHeightsMetres = [0.304, 0.313]
const thermosNeckRidgeTubeMetres = 0.0014
const thermosLipTubeMetres = 0.003
const thermosMouthMetres = 0.325
const thermosInsideRadiusMetres = 0.034
const thermosFloorMetres = 0.02
const thermosCupRadiusMetres = 0.044
const thermosCupHeightMetres = 0.062
const thermosCupDomeMetres = 0.008
const thermosCupRestsOnMetres = 0.295
const thermosCupOriginAboveItsRimMetres = 0.015
const thermosPaintingFacesTheFrontRadians = -Math.PI
const overflowOverTheLipMetres = 0.003
const liquidInsetShare = 0.97
const liquidAboveTheInsideMetres = 0.0005
const liquidBelowItsSurfaceMetres = 0.001
const flutedBowlSegmentsAround = 160
const hobnailBowlSegmentsAround = 192
const hobnailsAround = 22
const hobnailRowSpacingMetres = 0.0085
const hobnailsStartAboveTheFootMetres = 0.012
const hobnailsEndBelowTheRimMetres = 0.008
const hobnailRadiusMetres = 0.0037
const hobnailHeightMetres = 0.0022
const hobnailWallRadiusMetres = 0.075
const gildedRimRadiusMetres = 0.0818
const gildedRimTubeMetres = 0.0019
const gildedRimHeightMetres = 0.0632
const flutesAround = 16
const fluteDepthShare = 0.025
const flutesStartAboveTheFootMetres = 0.008
const flutesFullAboveTheFootMetres = 0.02
const plainBowl = { relief: 'smooth', isRimGilded: false, painting: null } as const
const porcelainBowl: BowlLook = { ...plainBowl, glaze: 'porcelain' }
const bowlLookById: Readonly<Record<string, BowlLook>> = {
  bowl1: { ...plainBowl, glaze: 'whiteGlaze', painting: { surface: 'koiPainting', lengthMetres: 0.07, aspect: koiPaintingAspect, turnRadians: 0.6 } },
  bowl2: { ...plainBowl, glaze: 'pearlGlaze', painting: { surface: 'lotusPainting', lengthMetres: 0.064, aspect: lotusPaintingAspect, turnRadians: 0 } },
  bowl3: { ...plainBowl, glaze: 'skyBlueGlaze' },
  bowl4: { ...plainBowl, glaze: 'blueGlaze' },
  bowl5: { ...plainBowl, glaze: 'yellowGlaze', painting: { surface: 'heronPainting', lengthMetres: 0.064, aspect: heronPaintingAspect, turnRadians: 0 } },
  bowl6: { ...plainBowl, glaze: 'emeraldGlaze' },
  bowl7: { ...plainBowl, glaze: 'temperGlaze' },
  bowl8: { ...plainBowl, glaze: 'glass', relief: 'fluted' },
  bowl9: { ...plainBowl, glaze: 'glass', relief: 'hobnail', isRimGilded: true },
  bowl10: { ...plainBowl, glaze: 'yixingClay', painting: { surface: 'teaCharacterPainting', lengthMetres: 0.05, aspect: teaCharacterPaintingAspect, turnRadians: 0 } },
}

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
  const gaugeWater = shape === 'kettle' ? addWaterGauge(root, materials.room) : null
  const leafHolder = leafHolderFor(shape)
  if (leafHolder !== null) root.add(leafHolder)
  const kettleWater = shape === 'kettle' ? addKettleWater(root, materials.room) : null
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
    gaugeWater,
    leafHolder,
    leaves: null,
    soakedLeafHolder,
    soakedLeaves: null,
    kettleWater,
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

function addKettleWater(root: THREE.Group, materials: RoomMaterials): THREE.Mesh {
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 24), materials.unsharedMaterialFor('gaugeGlass'))
  water.rotation.x = -Math.PI / 2
  water.visible = false
  root.add(water)
  return water
}

function addWaterGauge(root: THREE.Group, materials: RoomMaterials): GaugeStrip {
  const { gaugeBottomMetres, gaugeHeightMetres } = kettleShape
  const frame = new GaugeStrip(gaugeFrameHalfWidthMetres, gaugeFrameAboveTheBodyMetres, materials.materialFor('gaugeTube'))
  frame.cover(gaugeBottomMetres - gaugeFrameMarginMetres, gaugeBottomMetres + gaugeHeightMetres + gaugeFrameMarginMetres)
  const water = new GaugeStrip(gaugeWaterHalfWidthMetres, gaugeWaterAboveTheBodyMetres, materials.unsharedMaterialFor('gaugeGlass'))
  water.cover(gaugeBottomMetres, gaugeBottomMetres)
  root.add(frame.mesh, water.mesh)
  return water
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
      return bowlParts(materials.room, bowlLookById[itemId] ?? porcelainBowl)
    case 'spoon':
      return spoonParts(materials.room)
    case 'cloth':
      return clothParts(materials.cloth)
  }
}

function kettleParts(materials: CarriedModelMaterials): ItemParts {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash, openingAngle } = kettleShape
  const bodyWithAnOpening = new THREE.SphereGeometry(bodyRadiusMetres, 20, 14, 0, Math.PI * 2, openingAngle, Math.PI - openingAngle)
  const body = new THREE.Mesh(bodyWithAnOpening, materials.claySeenFromInside)
  body.scale.set(1, bodySquash, 1)
  body.position.y = bodyCentreMetres
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.14, 8), materials.room.materialFor('clay'))
  spout.position.set(0.15, 0.14, 0)
  spout.rotation.z = -0.9
  const lid = new THREE.Group()
  const lidTop = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.03, 14), materials.room.materialFor('darkWood'))
  const lidTouchPad = new THREE.Mesh(new THREE.CylinderGeometry(lidTouchPadRadiusMetres, lidTouchPadRadiusMetres, 0.04, 12), materials.touchPad)
  lid.add(lidTop, lidTouchPad)
  lid.position.y = 0.215
  return { meshes: [body, spout], lid, spoutTip: new THREE.Vector3(0.205, 0.183, 0), rimHeight: 0.23, liquidLevel: null }
}

function thermosParts(materials: RoomMaterials): ItemParts {
  const aluminium = materials.unsharedMaterialFor('aluminium')
  aluminium.side = THREE.DoubleSide
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(thermosFootRadiusMetres, thermosFootRadiusMetres, thermosFootTopMetres, thermosSegmentsAround, 1, true), aluminium)
  foot.position.y = thermosFootTopMetres / 2
  const base = new THREE.Mesh(new THREE.CircleGeometry(thermosFootRadiusMetres, thermosSegmentsAround), aluminium)
  base.rotation.x = Math.PI / 2
  const bodyHeight = thermosBodyTopMetres - thermosFootTopMetres
  const bodyGeometry = new THREE.CylinderGeometry(thermosBodyRadiusMetres, thermosBodyRadiusMetres, bodyHeight, thermosSegmentsAround, 1, true, thermosPaintingFacesTheFrontRadians)
  const body = new THREE.Mesh(bodyGeometry, materials.materialFor('thermosPainting'))
  body.position.y = thermosFootTopMetres + bodyHeight / 2
  const shoulder = new THREE.Mesh(new THREE.LatheGeometry(thermosShoulderProfile, thermosSegmentsAround), aluminium)
  const neckHeight = thermosMouthMetres - thermosNeckBottomMetres
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(thermosNeckRadiusMetres, thermosNeckRadiusMetres, neckHeight, thermosSegmentsAround, 1, true), aluminium)
  neck.position.y = thermosNeckBottomMetres + neckHeight / 2
  const ridges = thermosNeckRidgeHeightsMetres.map((height) => ringAround(thermosNeckRadiusMetres, thermosNeckRidgeTubeMetres, height, aluminium))
  const lip = ringAround(thermosNeckRadiusMetres - thermosLipTubeMetres, thermosLipTubeMetres, thermosMouthMetres, aluminium)
  const insideWall = materials.unsharedMaterialFor('thermosInside')
  insideWall.side = THREE.DoubleSide
  const insideHeight = thermosMouthMetres - thermosFloorMetres
  const inside = new THREE.Mesh(new THREE.CylinderGeometry(thermosInsideRadiusMetres, thermosInsideRadiusMetres, insideHeight, thermosSegmentsAround, 1, true), insideWall)
  inside.position.y = thermosFloorMetres + insideHeight / 2
  const floor = new THREE.Mesh(new THREE.CircleGeometry(thermosInsideRadiusMetres, thermosSegmentsAround), insideWall)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = thermosFloorMetres
  const meshes = [foot, base, body, shoulder, neck, ...ridges, lip, inside, floor]
  const glowingShell = aluminium instanceof THREE.MeshStandardMaterial ? { metal: aluminium, coolColour: aluminium.color.clone(), coolMetalness: aluminium.metalness } : undefined
  return { meshes, lid: thermosCup(aluminium), glowingShell, spoutTip: new THREE.Vector3(thermosNeckRadiusMetres, thermosMouthMetres, 0), rimHeight: thermosMouthMetres, liquidLevel: thermosLiquidLevel, pointsDownTheSide: pointsDownTheThermos }
}

function thermosCup(aluminium: THREE.Material): THREE.Group {
  const cup = new THREE.Group()
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(thermosCupRadiusMetres, thermosCupRadiusMetres, thermosCupHeightMetres, thermosSegmentsAround, 1, true), aluminium)
  wall.position.y = thermosCupHeightMetres / 2 - thermosCupOriginAboveItsRimMetres
  const domeAngle = 2 * Math.atan(thermosCupDomeMetres / thermosCupRadiusMetres)
  const domeRadius = thermosCupRadiusMetres / Math.sin(domeAngle)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(domeRadius, thermosSegmentsAround, 6, 0, Math.PI * 2, 0, domeAngle), aluminium)
  dome.position.y = thermosCupHeightMetres - thermosCupOriginAboveItsRimMetres + thermosCupDomeMetres - domeRadius
  const rim = ringAround(thermosCupRadiusMetres, thermosNeckRidgeTubeMetres * 1.5, -thermosCupOriginAboveItsRimMetres, aluminium)
  cup.add(wall, dome, rim)
  cup.position.y = thermosCupRestsOnMetres + thermosCupOriginAboveItsRimMetres
  return cup
}

function ringAround(radius: number, tube: number, height: number, material: THREE.Material): THREE.Mesh {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, thermosSegmentsAround), material)
  ring.rotation.x = Math.PI / 2
  ring.position.y = height
  return ring
}

const pointsDownTheThermos: readonly PointDownTheSide[] = [
  { distance: thermosInsideRadiusMetres, height: thermosMouthMetres + overflowOverTheLipMetres },
  { distance: thermosNeckRadiusMetres + overflowOverTheLipMetres, height: thermosMouthMetres },
  { distance: thermosNeckRadiusMetres + overflowOverTheLipMetres, height: thermosNeckBottomMetres },
  ...thermosShoulderProfile.slice(1, -1).reverse().map((point) => ({ distance: point.x + overflowOverTheLipMetres, height: point.y })),
  { distance: thermosFootRadiusMetres + overflowOverTheLipMetres, height: thermosBodyTopMetres },
  { distance: thermosFootRadiusMetres + overflowOverTheLipMetres, height: thermosBodyTopMetres / 2 },
]

const pointsDownTheBowl: readonly PointDownTheSide[] = [
  { distance: bowlRimTop.x - overflowOverTheLipMetres, height: bowlRimTop.y + overflowOverTheLipMetres },
  ...[...bowlOutsideWall].reverse().map((point) => ({ distance: point.x + overflowOverTheLipMetres, height: point.y })),
]

function thermosLiquidLevel(fillShare: number): { heightMetres: number; radiusMetres: number } {
  const lowest = thermosFloorMetres + liquidAboveTheFloorMetres
  return { heightMetres: lowest + fillShare * (thermosMouthMetres - liquidBelowTheRimMetres - lowest), radiusMetres: thermosInsideRadiusMetres - liquidInsetFromTheWallMetres }
}

function bowlLiquidLevel(fillShare: number): { heightMetres: number; radiusMetres: number } {
  const heightMetres = lowestLiquidInABowlMetres + fillShare * (bowlRimHeightMetres - liquidBelowTheRimMetres - lowestLiquidInABowlMetres)
  return { heightMetres, radiusMetres: 0.042 + (heightMetres / bowlRimHeightMetres) * 0.038 }
}

function caddyParts(materials: RoomMaterials): ItemParts {
  const tin = materials.unsharedMaterialFor('caddyGreen')
  tin.side = THREE.DoubleSide
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 28, 1, true), tin)
  body.position.y = 0.08
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.08, 28), materials.materialFor('caddyInside'))
  bottom.rotation.x = -Math.PI / 2
  bottom.position.y = 0.002
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0808, 0.0808, 0.055, 28, 1, true), materials.materialFor('caddyLabel'))
  label.position.y = 0.075
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.004, 6, 28), materials.materialFor('caddyRim'))
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.16
  const lid = new THREE.Group()
  const lidTop = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.028, 28), materials.materialFor('caddyGreen'))
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.018, 12), materials.materialFor('caddyRim'))
  knob.position.y = 0.023
  lid.add(lidTop, knob)
  lid.position.y = 0.174
  return { meshes: [body, bottom, label, rim], lid, spoutTip: new THREE.Vector3(0.08, 0.16, 0), rimHeight: 0.19, liquidLevel: null }
}

function spoonParts(materials: RoomMaterials): ItemParts {
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.025), materials.materialFor('darkWood'))
  handle.position.set(-0.04, 0.01, 0)
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.02, 12), materials.materialFor('darkWood'))
  bowl.position.set(0.07, 0.012, 0)
  return { meshes: [handle, bowl], lid: null, spoutTip: new THREE.Vector3(0.11, 0.02, 0), rimHeight: 0.025, liquidLevel: null }
}

function clothParts(clothMaterial: THREE.Material): ItemParts {
  const cloth = new THREE.Mesh(rumpledClothGeometry(), clothMaterial)
  return { meshes: [cloth], lid: null, spoutTip: new THREE.Vector3(clothLengthMetres / 2, 0.02, 0), rimHeight: 0.02, liquidLevel: null }
}

function bowlParts(materials: RoomMaterials, look: BowlLook): ItemParts {
  const glazed = materials.unsharedMaterialFor(look.glaze)
  glazed.side = THREE.DoubleSide
  const body = new THREE.Mesh(bowlGeometryWith(look.relief), glazed)
  const meshes: THREE.Object3D[] = [body]
  if (look.painting !== null) meshes.push(paintedOnTheBottom(materials, look.painting))
  if (look.isRimGilded) meshes.push(gildedRim(materials))
  const bowl = { meshes, lid: null, spoutTip: new THREE.Vector3(0.083, bowlRimHeightMetres, 0), rimHeight: bowlRimHeightMetres, liquidLevel: bowlLiquidLevel, pointsDownTheSide: pointsDownTheBowl }
  if (look.glaze !== 'glass') return bowl
  const clearGlass = materials.unsharedMaterialFor('clearGlassHeldInView')
  clearGlass.side = THREE.DoubleSide
  return { ...bowl, heldInViewLook: { mesh: body, inRoom: glazed, heldInView: clearGlass }, isSeeThrough: true }
}

function bowlGeometryWith(relief: BowlRelief): THREE.BufferGeometry {
  switch (relief) {
    case 'smooth':
      return new THREE.LatheGeometry(bowlProfile, bowlSegmentsAround)
    case 'fluted':
      return flutedBowlGeometry()
    case 'hobnail':
      return hobnailBowlGeometry()
  }
}

function gildedRim(materials: RoomMaterials): THREE.Mesh {
  const rim = new THREE.Mesh(new THREE.TorusGeometry(gildedRimRadiusMetres, gildedRimTubeMetres, 8, 96), materials.materialFor('gildedRim'))
  rim.rotation.x = Math.PI / 2
  rim.position.y = gildedRimHeightMetres
  return rim
}

function hobnailBowlGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.LatheGeometry(bowlProfile, hobnailBowlSegmentsAround)
  const position = geometry.getAttribute('position')
  const firstOutsidePoint = bowlUndersideAndFoot.length
  const lastOutsidePoint = firstOutsidePoint + bowlOutsideWall.length - 1
  for (let index = 0; index < position.count; index += 1) {
    const pointInTheProfile = index % bowlProfile.length
    if (pointInTheProfile < firstOutsidePoint || pointInTheProfile > lastOutsidePoint) continue
    const x = position.getX(index)
    const z = position.getZ(index)
    const radius = Math.hypot(x, z)
    const swell = 1 + hobnailSwellAt(Math.atan2(z, x), position.getY(index)) / radius
    position.setXYZ(index, x * swell, position.getY(index), z * swell)
  }
  geometry.computeVertexNormals()
  return geometry
}

function hobnailSwellAt(angle: number, height: number): number {
  const rimHeight = bowlRimTop.y
  if (height < hobnailsStartAboveTheFootMetres || height > rimHeight - hobnailsEndBelowTheRimMetres) return 0
  const row = Math.round((height - hobnailsStartAboveTheFootMetres) / hobnailRowSpacingMetres)
  const angleStep = (Math.PI * 2) / hobnailsAround
  const rowTurn = row % 2 === 0 ? 0 : angleStep / 2
  const nearestAngle = Math.round((angle - rowTurn) / angleStep) * angleStep + rowTurn
  const acrossMetres = (angle - nearestAngle) * hobnailWallRadiusMetres
  const alongMetres = height - (hobnailsStartAboveTheFootMetres + row * hobnailRowSpacingMetres)
  const share = Math.hypot(acrossMetres, alongMetres) / hobnailRadiusMetres
  return share >= 1 ? 0 : hobnailHeightMetres * Math.sqrt(1 - share * share)
}

function flutedBowlGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.LatheGeometry(bowlProfile, flutedBowlSegmentsAround)
  const position = geometry.getAttribute('position')
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const flute = 1 + fluteDepthShare * Math.cos(flutesAround * Math.atan2(z, x)) * fluteShareAt(position.getY(index))
    position.setXYZ(index, x * flute, position.getY(index), z * flute)
  }
  geometry.computeVertexNormals()
  return geometry
}

function fluteShareAt(height: number): number {
  return THREE.MathUtils.smoothstep(height, flutesStartAboveTheFootMetres, flutesFullAboveTheFootMetres)
}

function paintedOnTheBottom(materials: RoomMaterials, painting: BottomPainting): THREE.Mesh {
  const segmentsAcross = Math.max(fewestPaintingSegmentsAcross, Math.round(paintingSegmentsAlong / painting.aspect))
  const geometry = new THREE.PlaneGeometry(painting.lengthMetres, painting.lengthMetres / painting.aspect, paintingSegmentsAlong, segmentsAcross)
  const position = geometry.getAttribute('position')
  for (let index = 0; index < position.count; index += 1) {
    const along = position.getX(index)
    const across = position.getY(index)
    position.setXYZ(index, along, bowlBottomHeightAt(Math.hypot(along, across)) + paintingAboveTheGlazeMetres, -across)
  }
  geometry.computeVertexNormals()
  const paintingMesh = new THREE.Mesh(geometry, materials.materialFor(painting.surface))
  paintingMesh.rotation.y = painting.turnRadians
  paintingMesh.renderOrder = 1
  paintingMesh.castShadow = false
  return paintingMesh
}

export function bowlLiquidGeometry(surfaceHeight: number): THREE.BufferGeometry {
  const underTheSurface = bowlInsideProfile.filter((point) => point.y < surfaceHeight)
  const surfaceRadius = bowlInsideRadiusAt(surfaceHeight)
  const outline = [
    new THREE.Vector2(0, (bowlInsideProfile[0]?.y ?? 0) + liquidAboveTheInsideMetres),
    ...underTheSurface.map((point) => new THREE.Vector2(point.x * liquidInsetShare, point.y + liquidAboveTheInsideMetres)),
    new THREE.Vector2(surfaceRadius * liquidInsetShare, surfaceHeight - liquidBelowItsSurfaceMetres),
    new THREE.Vector2(0, surfaceHeight - liquidBelowItsSurfaceMetres),
  ]
  return new THREE.LatheGeometry(outline, bowlSegmentsAround)
}

function bowlInsideRadiusAt(height: number): number {
  const above = bowlInsideProfile.findIndex((point, index) => index > 0 && point.y >= height)
  const after = bowlInsideProfile[above]
  const before = bowlInsideProfile[above - 1]
  if (after === undefined) return bowlInsideProfile.at(-1)?.x ?? 0
  if (before === undefined) return after.x
  return before.x + ((after.x - before.x) * (height - before.y)) / (after.y - before.y)
}

function bowlBottomHeightAt(distanceFromTheCentre: number): number {
  const outer = bowlInsideProfile.findIndex((point) => point.x >= distanceFromTheCentre)
  const after = bowlInsideProfile[outer]
  const before = bowlInsideProfile[outer - 1]
  if (after === undefined) return bowlInsideProfile.at(-1)?.y ?? 0
  if (before === undefined) return after.y
  const share = (distanceFromTheCentre - before.x) / (after.x - before.x)
  return before.y + (after.y - before.y) * share
}
