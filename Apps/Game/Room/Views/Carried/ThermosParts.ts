import * as THREE from 'three'
import type { RoomMaterials } from '../RoomMaterials.ts'
import { liquidBelowTheRimMetres, overflowOverTheLipMetres, type ItemParts, type PointDownTheSide } from './ItemParts.ts'

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
const liquidAboveTheFloorMetres = 0.002
const liquidInsetFromTheWallMetres = 0.001

const pointsDownTheThermos: readonly PointDownTheSide[] = [
  { distance: thermosInsideRadiusMetres, height: thermosMouthMetres + overflowOverTheLipMetres },
  { distance: thermosNeckRadiusMetres + overflowOverTheLipMetres, height: thermosMouthMetres },
  { distance: thermosNeckRadiusMetres + overflowOverTheLipMetres, height: thermosNeckBottomMetres },
  ...thermosShoulderProfile.slice(1, -1).reverse().map((point) => ({ distance: point.x + overflowOverTheLipMetres, height: point.y })),
  { distance: thermosFootRadiusMetres + overflowOverTheLipMetres, height: thermosBodyTopMetres },
  { distance: thermosFootRadiusMetres + overflowOverTheLipMetres, height: thermosBodyTopMetres / 2 },
]

export function thermosParts(materials: RoomMaterials): ItemParts {
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

function thermosLiquidLevel(fillShare: number): { heightMetres: number; radiusMetres: number } {
  const lowest = thermosFloorMetres + liquidAboveTheFloorMetres
  return { heightMetres: lowest + fillShare * (thermosMouthMetres - liquidBelowTheRimMetres - lowest), radiusMetres: thermosInsideRadiusMetres - liquidInsetFromTheWallMetres }
}
