import * as THREE from 'three'
import { teaBowlIds, type TeaBowlId } from '../../../../../../Shared/Content/Rooms.ts'
import { ginkgoPaintingAspect } from '../../Paintings/GinkgoPainting.ts'
import { heronPaintingAspect } from '../../Paintings/HeronPainting.ts'
import { koiPondAspect, koiPondWidthMetres } from '../../Paintings/KoiPond.ts'
import { lotusPaintingAspect } from '../../Paintings/LotusPainting.ts'
import { mostSoakedLeavesShown } from '../../../../Presentation/WorldPresenter.ts'
import type { Surface, SurfaceMaterials } from '../../RoomMaterials.ts'
import { teaCharacterPaintingAspect } from '../../Paintings/TeaCharacterPainting.ts'
import { toadPaintingAspect } from '../../Paintings/ToadPainting.ts'
import type { CarriedShapeLook } from '../CarriedShapeLook.ts'
import { bowlShape } from '../../../Shapes/BowlShape.ts'
import { bowlInsideProfile, bowlOutsideWall, bowlProfile, bowlRimTop, bowlUndersideAndFoot } from './BowlProfile.ts'
import type { ItemParts, ItemSetUp } from '../ItemParts.ts'
import { insideRadiusAt, liquidBelowTheRimMetres, liquidLevelIn, type VesselProfile } from '../VesselProfile.ts'

type BottomPainting = {
  readonly surface: Surface
  readonly lengthMetres: number
  readonly aspect: number
  readonly turnRadians: number
}

type BowlRelief = 'smooth' | 'fluted'

type BowlLook = {
  readonly glaze: Surface
  readonly isClearGlass: boolean
  readonly relief: BowlRelief
  readonly painting: BottomPainting | null
  readonly liquidTint: string
}

const paintingAboveTheGlazeMetres = 0.0004
const toadPaintingWidthMetres = 0.076
const undersideInsideTheFootHeightMetres = 0.003
const whiteGlazes: ReadonlySet<Surface> = new Set(['whiteGlaze', 'pearlGlaze'])
const paintingSegmentsAlong = 48
const fewestPaintingSegmentsAcross = 8
const bowlSegmentsAround = 64
const distantBowlSegmentsAround = 32
const distantBowlProfilePointStep = 3
const bowlRimHeightMetres = bowlShape.rimHeightMetres
const liquidAboveTheInsideFloorMetres = 0.002
const liquidInsetFromTheWallMetres = 0.0024
const liquidAboveTheInsideMetres = 0.0005
const liquidBelowItsSurfaceMetres = 0.001
const flutedBowlSegmentsAround = 160
const flutesAround = 16
const fluteDepthShare = 0.025
const flutesStartAboveTheFootMetres = 0.008
const flutesFullAboveTheFootMetres = 0.02
const liquidTakesOnTheBowlsColourShare = 0.6
const plainBowl = { relief: 'smooth', painting: null, isClearGlass: false } as const
const porcelainBowl: BowlLook = { ...plainBowl, glaze: 'porcelain', liquidTint: '#f7f2e8' }
const bowlLookById: Readonly<Record<TeaBowlId, BowlLook>> = {
  bowl1: { ...plainBowl, glaze: 'whiteGlaze', liquidTint: '#eef5ff', painting: { surface: 'koiPainting', lengthMetres: koiPondWidthMetres, aspect: koiPondAspect, turnRadians: 0 } },
  bowl2: { ...plainBowl, glaze: 'pearlGlaze', liquidTint: '#fbe6ec', painting: { surface: 'lotusPainting', lengthMetres: 0.064, aspect: lotusPaintingAspect, turnRadians: 0 } },
  bowl3: { ...plainBowl, glaze: 'skyBlueGlaze', liquidTint: '#9fd0ea' },
  bowl4: { ...plainBowl, glaze: 'blueGlaze', liquidTint: '#4a6fbd' },
  bowl5: { ...plainBowl, glaze: 'yellowGlaze', liquidTint: '#f1cd55', painting: { surface: 'heronPainting', lengthMetres: 0.064, aspect: heronPaintingAspect, turnRadians: 0 } },
  bowl6: { ...plainBowl, glaze: 'emeraldGlaze', liquidTint: '#5fb08a' },
  bowl7: { ...plainBowl, glaze: 'temperGlaze', liquidTint: '#b393cf' },
  bowl8: { ...plainBowl, glaze: 'glass', isClearGlass: true, relief: 'fluted', liquidTint: '#ffffff' },
  bowl11: { ...plainBowl, glaze: 'blackGlaze', liquidTint: '#8a6a4a', painting: { surface: 'ginkgoPainting', lengthMetres: 0.09, aspect: ginkgoPaintingAspect, turnRadians: 0 } },
  bowl10: { ...plainBowl, glaze: 'yixingClay', liquidTint: '#a8683f', painting: { surface: 'teaCharacterPainting', lengthMetres: 0.05, aspect: teaCharacterPaintingAspect, turnRadians: 0 } },
}

export const whiteBowlIds: readonly TeaBowlId[] = teaBowlIds.filter((bowlId) => whiteGlazes.has(bowlLookById[bowlId].glaze))

const bowlFootOutsideEdge = bowlUndersideAndFoot.at(-1) ?? new THREE.Vector2()
const bowlVesselProfile: VesselProfile = {
  outside: [bowlFootOutsideEdge, ...bowlOutsideWall, bowlRimTop].map((point) => ({ radiusMetres: point.x, heightMetres: point.y })),
  inside: bowlInsideProfile.map((point) => ({ radiusMetres: point.x, heightMetres: point.y })),
  liquid: { aboveTheFloorMetres: liquidAboveTheInsideFloorMetres, belowTheRimMetres: liquidBelowTheRimMetres, insetFromTheWallMetres: liquidInsetFromTheWallMetres },
}

export const bowlShapeLook: CarriedShapeLook = {
  partsFor: bowlParts,
  steamRisesAboveTheSpout: false,
  steamPuffSizeShare: 0.6,
  steamSurface: 'bowlSteam',
  looseLeaves: null,
  soakedLeaves: {
    pile: { leafCount: mostSoakedLeavesShown, radiusMetres: 0.035, heightMetres: 0, isLyingFlat: true },
    floatHeightAt: (fillShare) => liquidLevelIn(bowlVesselProfile, fillShare).heightMetres,
    spreadShareAt: () => 1,
    areSeenOnlyUnderAnOpenLid: false,
  },
  fire: null,
  ash: null,
}

function bowlParts(setUp: ItemSetUp, itemId: string): ItemParts {
  const materials = setUp.room
  const look = isATeaBowlId(itemId) ? bowlLookById[itemId] : porcelainBowl
  const glass = look.isClearGlass ? materials.glassThatClears('glass') : null
  const glazed = glass?.material ?? materials.unsharedMaterialFor(look.glaze)
  const body = new THREE.Mesh(bowlGeometryWith(look.relief), glazed)
  const meshes: THREE.Object3D[] = [body]
  if (look.painting !== null) {
    const painting = paintedOnTheBottom(materials, look.painting)
    meshes.push(painting)
  }
  if (setUp.bowlIdWithTheToadUnderneath === itemId) meshes.push(toadPaintedUnderneath(materials))
  const liquidTint = new THREE.Color('#ffffff').lerp(new THREE.Color(look.liquidTint), liquidTakesOnTheBowlsColourShare)
  const spoutTip = new THREE.Vector3(bowlShape.rimOutsideRadiusMetres, bowlRimHeightMetres, 0)
  return {
    meshes,
    lid: null,
    heightMetres: bowlRimHeightMetres,
    vessel: { profile: bowlVesselProfile, spoutTip, liquid: { tint: liquidTint, volumeAt: glass !== null ? bowlLiquidGeometry : null } },
    displays: [],
    lookByWhereItIsDrawn: glass !== null ? { mesh: body, inRoom: glazed, heldInView: materials.unsharedMaterialFor('clearGlassHeldInView') } : null,
    glassThatClears: glass,
    charTo: null,
    levelsOfDetail: glass !== null ? [] : [{ mesh: body, near: body.geometry, far: distantBowlGeometry() }],
  }
}

function bowlLiquidGeometry(surfaceHeight: number): THREE.BufferGeometry {
  const underTheSurface = bowlInsideProfile.filter((point) => point.y < surfaceHeight)
  const surfaceRadius = insideRadiusAt(bowlVesselProfile, surfaceHeight)
  const outline = [
    new THREE.Vector2(0, (bowlInsideProfile[0]?.y ?? 0) + liquidAboveTheInsideMetres),
    ...underTheSurface.map((point) => new THREE.Vector2(Math.max(0, point.x - liquidInsetFromTheWallMetres), point.y + liquidAboveTheInsideMetres)),
    new THREE.Vector2(surfaceRadius - liquidInsetFromTheWallMetres, surfaceHeight - liquidBelowItsSurfaceMetres),
    new THREE.Vector2(0, surfaceHeight - liquidBelowItsSurfaceMetres),
  ]
  return new THREE.LatheGeometry(outline, bowlSegmentsAround)
}

function bowlGeometryWith(relief: BowlRelief): THREE.BufferGeometry {
  switch (relief) {
    case 'smooth':
      return new THREE.LatheGeometry(bowlProfile, bowlSegmentsAround)
    case 'fluted':
      return flutedBowlGeometry()
  }
}

function distantBowlGeometry(): THREE.BufferGeometry {
  const keptPoints = bowlProfile.map((_, index) => index).filter((index) => isUnderAPainting(index) || index % distantBowlProfilePointStep === 0 || index === bowlProfile.length - 1)
  const geometry = new THREE.LatheGeometry(keptPoints.map((index) => bowlProfile[index] ?? new THREE.Vector2()), distantBowlSegmentsAround)
  const uv = geometry.getAttribute('uv')
  for (let vertex = 0; vertex < uv.count; vertex += 1) uv.setY(vertex, (keptPoints[vertex % keptPoints.length] ?? 0) / (bowlProfile.length - 1))
  return geometry
}

function isUnderAPainting(pointInTheProfile: number): boolean {
  return pointInTheProfile < bowlUndersideAndFoot.length || pointInTheProfile >= bowlProfile.length - bowlInsideProfile.length
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

function paintedOnTheBottom(materials: SurfaceMaterials, painting: BottomPainting): THREE.Mesh {
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

function toadPaintedUnderneath(materials: SurfaceMaterials): THREE.Mesh {
  const toad = new THREE.Mesh(new THREE.PlaneGeometry(toadPaintingWidthMetres, toadPaintingWidthMetres / toadPaintingAspect), materials.materialFor('toadPainting'))
  toad.rotation.x = Math.PI / 2
  toad.position.y = undersideInsideTheFootHeightMetres - paintingAboveTheGlazeMetres
  toad.renderOrder = 1
  toad.castShadow = false
  return toad
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

function isATeaBowlId(itemId: string): itemId is TeaBowlId {
  return (teaBowlIds as readonly string[]).includes(itemId)
}
