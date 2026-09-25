import * as THREE from 'three'
import { heronPaintingAspect } from '../HeronPainting.ts'
import { koiPaintingAspect } from '../KoiPainting.ts'
import { lotusPaintingAspect } from '../LotusPainting.ts'
import { mostSoakedLeavesShown } from '../../../Table/TablePresenter.ts'
import type { Surface, SurfaceMaterials } from '../RoomMaterials.ts'
import { teaCharacterPaintingAspect } from '../TeaCharacterPainting.ts'
import type { CarriedShapeLook } from './CarriedShapeLook.ts'
import { bowlInsideProfile, bowlOutsideWall, bowlProfile, bowlRimTop, bowlUndersideAndFoot } from './BowlProfile.ts'
import { liquidBelowTheRimMetres, overflowOverTheLipMetres, type ItemParts, type PointDownTheSide } from './ItemParts.ts'

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
  readonly liquidTint: string
}

const paintingAboveTheGlazeMetres = 0.0004
const paintingSegmentsAlong = 48
const fewestPaintingSegmentsAcross = 8
const bowlSegmentsAround = 64
const bowlRimHeightMetres = 0.062
const lowestLiquidInABowlMetres = 0.011
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
const liquidTakesOnTheBowlsColourShare = 0.6
const plainBowl = { relief: 'smooth', isRimGilded: false, painting: null } as const
const porcelainBowl: BowlLook = { ...plainBowl, glaze: 'porcelain', liquidTint: '#f7f2e8' }
const bowlLookById: Readonly<Record<string, BowlLook>> = {
  bowl1: { ...plainBowl, glaze: 'whiteGlaze', liquidTint: '#eef5ff', painting: { surface: 'koiPainting', lengthMetres: 0.07, aspect: koiPaintingAspect, turnRadians: 0.6 } },
  bowl2: { ...plainBowl, glaze: 'pearlGlaze', liquidTint: '#fbe6ec', painting: { surface: 'lotusPainting', lengthMetres: 0.064, aspect: lotusPaintingAspect, turnRadians: 0 } },
  bowl3: { ...plainBowl, glaze: 'skyBlueGlaze', liquidTint: '#9fd0ea' },
  bowl4: { ...plainBowl, glaze: 'blueGlaze', liquidTint: '#4a6fbd' },
  bowl5: { ...plainBowl, glaze: 'yellowGlaze', liquidTint: '#f1cd55', painting: { surface: 'heronPainting', lengthMetres: 0.064, aspect: heronPaintingAspect, turnRadians: 0 } },
  bowl6: { ...plainBowl, glaze: 'emeraldGlaze', liquidTint: '#5fb08a' },
  bowl7: { ...plainBowl, glaze: 'temperGlaze', liquidTint: '#b393cf' },
  bowl8: { ...plainBowl, glaze: 'glass', relief: 'fluted', liquidTint: '#ffffff' },
  bowl9: { ...plainBowl, glaze: 'glass', relief: 'hobnail', isRimGilded: true, liquidTint: '#fff1cc' },
  bowl10: { ...plainBowl, glaze: 'yixingClay', liquidTint: '#a8683f', painting: { surface: 'teaCharacterPainting', lengthMetres: 0.05, aspect: teaCharacterPaintingAspect, turnRadians: 0 } },
}

const pointsDownTheBowl: readonly PointDownTheSide[] = [
  { distance: bowlRimTop.x - overflowOverTheLipMetres, height: bowlRimTop.y + overflowOverTheLipMetres },
  ...[...bowlOutsideWall].reverse().map((point) => ({ distance: point.x + overflowOverTheLipMetres, height: point.y })),
]

export const bowlShapeLook: CarriedShapeLook = {
  partsFor: (materials, itemId) => bowlParts(materials.room, itemId),
  steamRisesAboveTheSpout: false,
  looseLeaves: null,
  soakedLeaves: {
    pile: { leafCount: mostSoakedLeavesShown, radiusMetres: 0.035, heightMetres: 0, isLyingFlat: true },
    floatHeightAt: (fillShare) => bowlLiquidLevel(fillShare).heightMetres,
    spreadShareAt: () => 1,
    areSeenOnlyUnderAnOpenLid: false,
  },
  fire: null,
}

function bowlParts(materials: SurfaceMaterials, itemId: string): ItemParts {
  const look = bowlLookById[itemId] ?? porcelainBowl
  const glazed = materials.unsharedMaterialFor(look.glaze)
  glazed.side = THREE.DoubleSide
  const body = new THREE.Mesh(bowlGeometryWith(look.relief), glazed)
  const meshes: THREE.Object3D[] = [body]
  if (look.painting !== null) meshes.push(paintedOnTheBottom(materials, look.painting))
  if (look.isRimGilded) meshes.push(gildedRim(materials))
  const bowl: ItemParts = {
    meshes,
    lid: null,
    spoutTip: new THREE.Vector3(0.083, bowlRimHeightMetres, 0),
    rimHeight: bowlRimHeightMetres,
    liquidLevel: bowlLiquidLevel,
    liquidVolumeAt: null,
    pointsDownTheSide: pointsDownTheBowl,
    heldInViewLook: null,
    glowingShell: null,
    gaugeWater: null,
    kettleWater: null,
    liquidTint: new THREE.Color('#ffffff').lerp(new THREE.Color(look.liquidTint), liquidTakesOnTheBowlsColourShare),
    charTo: null,
  }
  if (look.glaze !== 'glass') return bowl
  const clearGlass = materials.unsharedMaterialFor('clearGlassHeldInView')
  clearGlass.side = THREE.DoubleSide
  return { ...bowl, heldInViewLook: { mesh: body, inRoom: glazed, heldInView: clearGlass }, liquidVolumeAt: bowlLiquidGeometry }
}

function bowlLiquidGeometry(surfaceHeight: number): THREE.BufferGeometry {
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

function bowlLiquidLevel(fillShare: number): { heightMetres: number; radiusMetres: number } {
  const heightMetres = lowestLiquidInABowlMetres + fillShare * (bowlRimHeightMetres - liquidBelowTheRimMetres - lowestLiquidInABowlMetres)
  return { heightMetres, radiusMetres: 0.042 + (heightMetres / bowlRimHeightMetres) * 0.038 }
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

function gildedRim(materials: SurfaceMaterials): THREE.Mesh {
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
