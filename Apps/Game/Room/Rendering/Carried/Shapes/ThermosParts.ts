import * as THREE from 'three'
import type { SurfaceMaterials } from '../../RoomMaterials.ts'
import { markAsGlowing } from '../../../../../Engine/Rendering/Glow.ts'
import type { CarriedShapeLook } from '../CarriedShapeLook.ts'
import type { Display, ItemParts } from '../ItemParts.ts'
import { disc, openWall, rimAround } from '../../../../../Engine/Rendering/LatheParts.ts'
import { thermosShape } from '../../../Shapes/ThermosShape.ts'
import { liquidBelowTheRimMetres, type VesselProfile } from '../VesselProfile.ts'

const thermosSegmentsAround = 48
const thermosRimSegments = { aroundTheTube: 8, aroundTheRim: thermosSegmentsAround }
const thermosShoulderProfile = new THREE.SplineCurve(thermosShape.shoulderPoints.map((point) => new THREE.Vector2(point.x, point.y))).getPoints(12)
const thermosPaintingFacesTheFrontRadians = -Math.PI
const liquidAboveTheFloorMetres = 0.002
const liquidInsetFromTheWallMetres = 0.001
const redHeatRisesWithGlow = 1.5
const brightestRedHeatIntensity = 2.2

const thermosProfile: VesselProfile = {
  outside: [
    { radiusMetres: thermosShape.footRadiusMetres, heightMetres: 0 },
    { radiusMetres: thermosShape.footRadiusMetres, heightMetres: thermosShape.footTopMetres },
    { radiusMetres: thermosShape.bodyRadiusMetres, heightMetres: thermosShape.footTopMetres },
    { radiusMetres: thermosShape.bodyRadiusMetres, heightMetres: thermosShape.bodyTopMetres },
    ...thermosShoulderProfile.map((point) => ({ radiusMetres: point.x, heightMetres: point.y })),
    { radiusMetres: thermosShape.neckRadiusMetres, heightMetres: thermosShape.neckBottomMetres },
    { radiusMetres: thermosShape.neckRadiusMetres, heightMetres: thermosShape.mouthMetres },
  ],
  inside: [
    { radiusMetres: thermosShape.mouthRadiusMetres, heightMetres: thermosShape.floorMetres },
    { radiusMetres: thermosShape.mouthRadiusMetres, heightMetres: thermosShape.mouthMetres },
  ],
  liquid: { aboveTheFloorMetres: liquidAboveTheFloorMetres, belowTheRimMetres: liquidBelowTheRimMetres, insetFromTheWallMetres: liquidInsetFromTheWallMetres },
}

export const thermosShapeLook: CarriedShapeLook = {
  partsFor: (materials) => thermosParts(materials.room),
  steamRisesAboveTheSpout: false,
  steamPuffSizeShare: 1,
  steamSurface: 'steam',
  looseLeaves: null,
  soakedLeaves: null,
  fire: null,
  ash: null,
}

function thermosParts(materials: SurfaceMaterials): ItemParts {
  const aluminium = materials.unsharedMaterialFor('aluminium')
  const foot = openWall(thermosShape.footRadiusMetres, 0, thermosShape.footTopMetres, thermosSegmentsAround, aluminium)
  const base = disc(thermosShape.footRadiusMetres, 0, thermosSegmentsAround, 'down', aluminium)
  const body = openWall(thermosShape.bodyRadiusMetres, thermosShape.footTopMetres, thermosShape.bodyTopMetres, thermosSegmentsAround, materials.materialFor('thermosPainting'), thermosPaintingFacesTheFrontRadians)
  const shoulder = new THREE.Mesh(new THREE.LatheGeometry(thermosShoulderProfile, thermosSegmentsAround), aluminium)
  const neck = openWall(thermosShape.neckRadiusMetres, thermosShape.neckBottomMetres, thermosShape.mouthMetres, thermosSegmentsAround, aluminium)
  const ridges = thermosShape.neckRidgeHeightsMetres.map((height) => rimAround(thermosShape.neckRadiusMetres, thermosShape.neckRidgeTubeMetres, height, thermosRimSegments, aluminium))
  const lip = rimAround(thermosShape.mouthRadiusMetres + thermosShape.lipTubeMetres, thermosShape.lipTubeMetres, thermosShape.mouthMetres, thermosRimSegments, aluminium)
  const insideWall = materials.unsharedMaterialFor('thermosInside')
  const inside = openWall(thermosShape.mouthRadiusMetres, thermosShape.floorMetres, thermosShape.mouthMetres, thermosSegmentsAround, insideWall)
  const floor = disc(thermosShape.mouthRadiusMetres, thermosShape.floorMetres, thermosSegmentsAround, 'up', insideWall)
  const meshes = [foot, base, body, shoulder, neck, ...ridges, lip, inside, floor]
  const redHeat = aluminium instanceof THREE.MeshStandardMaterial ? redHeatOf(aluminium, materials) : null
  markAsGlowing(aluminium)
  return {
    meshes,
    lid: thermosCup(aluminium),
    heightMetres: thermosShape.mouthMetres,
    vessel: { profile: thermosProfile, spoutTip: new THREE.Vector3(thermosShape.neckRadiusMetres, thermosShape.mouthMetres, 0), liquid: { tint: null, volumeAt: null } },
    displays: redHeat === null ? [] : [redHeat],
    lookByWhereItIsDrawn: null, glassThatClears: null,
    charTo: null,
    levelsOfDetail: [],
  }
}

function thermosCup(aluminium: THREE.Material): THREE.Group {
  const cup = new THREE.Group()
  const wall = openWall(thermosShape.cup.radiusMetres, -thermosShape.cup.originAboveItsRimMetres, thermosShape.cup.heightMetres - thermosShape.cup.originAboveItsRimMetres, thermosSegmentsAround, aluminium)
  const domeAngle = 2 * Math.atan(thermosShape.cup.domeMetres / thermosShape.cup.radiusMetres)
  const domeRadius = thermosShape.cup.radiusMetres / Math.sin(domeAngle)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(domeRadius, thermosSegmentsAround, 6, 0, Math.PI * 2, 0, domeAngle), aluminium)
  dome.position.y = thermosShape.cup.heightMetres - thermosShape.cup.originAboveItsRimMetres + thermosShape.cup.domeMetres - domeRadius
  const rim = rimAround(thermosShape.cup.radiusMetres, thermosShape.neckRidgeTubeMetres * 1.5, -thermosShape.cup.originAboveItsRimMetres, thermosRimSegments, aluminium)
  cup.add(wall, dome, rim)
  cup.position.y = thermosShape.cup.restsOnMetres + thermosShape.cup.originAboveItsRimMetres
  return cup
}

function redHeatOf(metal: THREE.MeshStandardMaterial, materials: SurfaceMaterials): Display {
  const coolColour = metal.color.clone()
  const coolMetalness = metal.metalness
  const hotColour = materials.colourOf('redHotMetal')
  const dullHeatGlow = materials.colourOf('dullRedHeat')
  const brightHeatGlow = materials.colourOf('brightRedHeat')
  return ({ vessel }) => {
    if (vessel === undefined) return
    metal.color.copy(coolColour).lerp(hotColour, vessel.shellGlow)
    metal.metalness = coolMetalness * (1 - vessel.shellGlow)
    metal.emissive.copy(dullHeatGlow).lerp(brightHeatGlow, vessel.shellGlow)
    metal.emissiveIntensity = vessel.shellGlow ** redHeatRisesWithGlow * brightestRedHeatIntensity
  }
}
