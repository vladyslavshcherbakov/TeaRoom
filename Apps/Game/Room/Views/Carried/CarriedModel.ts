import * as THREE from 'three'
import { footprintRadiusMetres, type CarriedShape } from '../../RoomLayout.ts'
import { koiPaintingAspect } from '../KoiPainting.ts'
import type { RoomMaterials, Surface } from '../RoomMaterials.ts'
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
  readonly gaugeWater: THREE.Mesh | null
  readonly leafHolder: THREE.Group | null
  leaves: { readonly pile: LeafPile; readonly teaId: string | null } | null
  readonly kettleWater: THREE.Mesh | null
  readonly puffs: readonly THREE.Mesh[]
  tagKey: string
  layer: number
  isHeldInView: boolean
  castsShadow: boolean
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

type ItemParts = {
  readonly meshes: THREE.Object3D[]
  readonly lid: THREE.Object3D | null
  readonly spoutTip: THREE.Vector3
  readonly rimHeight: number
  readonly liquidRadius: number | null
}

export const mostSteamSources = 2
export const mostPuffsFromOneSource = 3

const lidTouchPadRadiusMetres = 0.095
const touchPadShareOfTheFootprint = 1.5
const touchPadAboveTheRimMetres = 0.05
const paintingAboveTheGlazeMetres = 0.0004
const paintingSegmentsAlong = 48
const fewestPaintingSegmentsAcross = 8
const bowlSegmentsAround = 64
const bowlWallProfilePoints = 32
const bowlInsideProfile = new THREE.SplineCurve([
  new THREE.Vector2(0, 0.009),
  new THREE.Vector2(0.03, 0.0085),
  new THREE.Vector2(0.045, 0.0095),
  new THREE.Vector2(0.06, 0.017),
  new THREE.Vector2(0.072, 0.034),
  new THREE.Vector2(0.08, 0.062),
]).getPoints(bowlWallProfilePoints)
const bowlOutsideWall = new THREE.SplineCurve([
  new THREE.Vector2(0.048, 0.003),
  new THREE.Vector2(0.054, 0.0055),
  new THREE.Vector2(0.066, 0.014),
  new THREE.Vector2(0.078, 0.036),
  new THREE.Vector2(0.083, 0.062),
]).getPoints(bowlWallProfilePoints)
const bowlUndersideAndFoot = [
  new THREE.Vector2(0, 0.004),
  new THREE.Vector2(0.039, 0.003),
  new THREE.Vector2(0.04, 0),
  new THREE.Vector2(0.047, 0),
]
const bowlRimTop = new THREE.Vector2(0.0815, 0.0635)
const bowlProfile = [...bowlUndersideAndFoot, ...bowlOutsideWall, bowlRimTop, ...[...bowlInsideProfile].reverse()]
const paintingOnTheBottomByBowlId: Readonly<Record<string, BottomPainting>> = {
  bowl1: { surface: 'koiPainting', lengthMetres: 0.07, aspect: koiPaintingAspect, turnRadians: 0.6 },
}
const glazeByBowlId: Readonly<Record<string, Surface>> = {
  bowl1: 'whiteGlaze',
  bowl2: 'pearlGlaze',
  bowl3: 'skyBlueGlaze',
  bowl4: 'blueGlaze',
  bowl5: 'yellowGlaze',
  bowl6: 'emeraldGlaze',
}

export function newCarriedModel(itemId: string, shape: CarriedShape, materials: CarriedModelMaterials): CarriedModel {
  const root = new THREE.Group()
  const parts = partsOf(shape, itemId, materials)
  root.add(...parts.meshes)
  if (parts.lid !== null) root.add(parts.lid)
  const liquidMaterial = parts.liquidRadius === null ? null : (materials.room.unsharedMaterialFor('porcelain') as THREE.MeshStandardMaterial)
  const liquid = liquidMaterial === null ? null : new THREE.Mesh(new THREE.CircleGeometry(1, 20), liquidMaterial)
  if (liquid !== null) {
    liquid.rotation.x = -Math.PI / 2
    root.add(liquid)
  }
  if (parts.lid === null) root.add(forgivingTouchPad(shape, parts.rimHeight, materials.touchPad))
  const gaugeWater = shape === 'kettle' ? addWaterGauge(root, materials.room) : null
  const leafHolder = leafHolderFor(shape)
  if (leafHolder !== null) root.add(leafHolder)
  const kettleWater = shape === 'kettle' ? addKettleWater(root, materials.room) : null
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
    gaugeWater,
    leafHolder,
    leaves: null,
    kettleWater,
    puffs,
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
  return pad
}

function addKettleWater(root: THREE.Group, materials: RoomMaterials): THREE.Mesh {
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 24), materials.unsharedMaterialFor('gaugeGlass'))
  water.rotation.x = -Math.PI / 2
  water.visible = false
  root.add(water)
  return water
}

function addWaterGauge(root: THREE.Group, materials: RoomMaterials): THREE.Mesh {
  const { gaugeBottomMetres, gaugeHeightMetres, gaugeFaceMetres } = kettleShape
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.048, gaugeHeightMetres + 0.014, 0.006), materials.materialFor('gaugeTube'))
  glass.position.set(0, gaugeBottomMetres + gaugeHeightMetres / 2, gaugeFaceMetres)
  const water = new THREE.Mesh(new THREE.BoxGeometry(0.034, 1, 0.008), materials.unsharedMaterialFor('gaugeGlass'))
  water.position.set(0, gaugeBottomMetres, gaugeFaceMetres + 0.001)
  root.add(glass, water)
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
      return bowlParts(materials.room, glazeByBowlId[itemId] ?? 'porcelain', paintingOnTheBottomByBowlId[itemId])
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
  return { meshes: [body, spout], lid, spoutTip: new THREE.Vector3(0.205, 0.183, 0), rimHeight: 0.23, liquidRadius: null }
}

function thermosParts(materials: RoomMaterials): ItemParts {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 14), materials.materialFor('steel'))
  body.position.y = 0.15
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.05, 12), materials.materialFor('darkWood'))
  lid.position.y = 0.325
  return { meshes: [body], lid, spoutTip: new THREE.Vector3(0.06, 0.3, 0), rimHeight: 0.3, liquidRadius: null }
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
  return { meshes: [body, bottom, label, rim], lid, spoutTip: new THREE.Vector3(0.08, 0.16, 0), rimHeight: 0.19, liquidRadius: null }
}

function spoonParts(materials: RoomMaterials): ItemParts {
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.025), materials.materialFor('darkWood'))
  handle.position.set(-0.04, 0.01, 0)
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.02, 12), materials.materialFor('darkWood'))
  bowl.position.set(0.07, 0.012, 0)
  return { meshes: [handle, bowl], lid: null, spoutTip: new THREE.Vector3(0.11, 0.02, 0), rimHeight: 0.025, liquidRadius: null }
}

function clothParts(clothMaterial: THREE.Material): ItemParts {
  const cloth = new THREE.Mesh(rumpledClothGeometry(), clothMaterial)
  return { meshes: [cloth], lid: null, spoutTip: new THREE.Vector3(clothLengthMetres / 2, 0.02, 0), rimHeight: 0.02, liquidRadius: null }
}

function bowlParts(materials: RoomMaterials, glaze: Surface, painting: BottomPainting | undefined): ItemParts {
  const glazed = materials.unsharedMaterialFor(glaze)
  glazed.side = THREE.DoubleSide
  const body = new THREE.Mesh(new THREE.LatheGeometry(bowlProfile, bowlSegmentsAround), glazed)
  const meshes: THREE.Object3D[] = [body]
  if (painting !== undefined) meshes.push(paintedOnTheBottom(materials, painting))
  return { meshes, lid: null, spoutTip: new THREE.Vector3(0.083, 0.062, 0), rimHeight: 0.062, liquidRadius: 0.08 }
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

function bowlBottomHeightAt(distanceFromTheCentre: number): number {
  const outer = bowlInsideProfile.findIndex((point) => point.x >= distanceFromTheCentre)
  const after = bowlInsideProfile[outer]
  const before = bowlInsideProfile[outer - 1]
  if (after === undefined) return bowlInsideProfile.at(-1)?.y ?? 0
  if (before === undefined) return after.y
  const share = (distanceFromTheCentre - before.x) / (after.x - before.x)
  return before.y + (after.y - before.y) * share
}
