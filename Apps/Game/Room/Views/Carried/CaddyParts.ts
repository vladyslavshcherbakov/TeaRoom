import * as THREE from 'three'
import type { SurfaceMaterials } from '../RoomMaterials.ts'
import type { CarriedShapeLook } from './CarriedShapeLook.ts'
import { liquidBelowTheRimMetres, overflowOverTheLipMetres, type ItemParts, type PointDownTheSide } from './ItemParts.ts'

const tinRadiusMetres = 0.08
const tinHeightMetres = 0.16
const rimTubeMetres = 0.004
const labelRadiusMetres = 0.0808
const labelBottomMetres = 0.0475
const labelTopMetres = 0.1025
const bottomInsideMetres = 0.004
const liquidInsetFromTheWallMetres = 0.003
const pointsDownTheCaddy: readonly PointDownTheSide[] = [
  { distance: tinRadiusMetres - rimTubeMetres, height: tinHeightMetres + rimTubeMetres + overflowOverTheLipMetres },
  { distance: tinRadiusMetres + rimTubeMetres + overflowOverTheLipMetres, height: tinHeightMetres },
  { distance: tinRadiusMetres + overflowOverTheLipMetres, height: labelTopMetres + 0.01 },
  { distance: labelRadiusMetres + overflowOverTheLipMetres, height: labelTopMetres },
  { distance: labelRadiusMetres + overflowOverTheLipMetres, height: labelBottomMetres },
  { distance: tinRadiusMetres + overflowOverTheLipMetres, height: labelBottomMetres - 0.01 },
  { distance: tinRadiusMetres + overflowOverTheLipMetres, height: 0.005 },
]

export const caddyShapeLook: CarriedShapeLook = {
  partsFor: (materials) => caddyParts(materials.room),
  steamRisesAboveTheSpout: false,
  steamPuffSizeShare: 1,
  looseLeaves: {
    heapStartsAt: { x: 0, y: 0.018, z: 0 },
    pile: { leafCount: 480, radiusMetres: 0.062, heightMetres: 0.126, isLyingFlat: false },
    fillShareIn: (table) => table.caddy.fillShare,
  },
  soakedLeaves: null,
  fire: null,
}

function caddyParts(materials: SurfaceMaterials): ItemParts {
  const tin = materials.unsharedMaterialFor('caddyGreen')
  tin.side = THREE.DoubleSide
  const body = new THREE.Mesh(new THREE.CylinderGeometry(tinRadiusMetres, tinRadiusMetres, tinHeightMetres, 28, 1, true), tin)
  body.position.y = tinHeightMetres / 2
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.08, 28), materials.materialFor('caddyInside'))
  bottom.rotation.x = -Math.PI / 2
  bottom.position.y = 0.002
  const underside = new THREE.Mesh(new THREE.CircleGeometry(tinRadiusMetres, 28), materials.materialFor('caddyGreen'))
  underside.rotation.x = Math.PI / 2
  const label = new THREE.Mesh(new THREE.CylinderGeometry(labelRadiusMetres, labelRadiusMetres, labelTopMetres - labelBottomMetres, 28, 1, true), materials.materialFor('caddyLabel'))
  label.position.y = (labelTopMetres + labelBottomMetres) / 2
  const rim = new THREE.Mesh(new THREE.TorusGeometry(tinRadiusMetres, rimTubeMetres, 6, 28), materials.materialFor('caddyRim'))
  rim.rotation.x = Math.PI / 2
  rim.position.y = tinHeightMetres
  const lid = new THREE.Group()
  const lidTop = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.028, 28), materials.materialFor('caddyGreen'))
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.018, 12), materials.materialFor('caddyRim'))
  knob.position.y = 0.023
  lid.add(lidTop, knob)
  lid.position.y = 0.174
  return { meshes: [body, bottom, underside, label, rim], lid, spoutTip: new THREE.Vector3(tinRadiusMetres + rimTubeMetres, tinHeightMetres + rimTubeMetres, 0), rimHeight: tinHeightMetres + rimTubeMetres, liquidLevel: caddyLiquidLevel, liquidVolumeAt: null, pointsDownTheSide: pointsDownTheCaddy, heldInViewLook: null, glowingShell: null, gaugeWater: null, kettleWater: null, liquidTint: null, charTo: null, thermometer: null, levelsOfDetail: [] }
}

function caddyLiquidLevel(fillShare: number): { heightMetres: number; radiusMetres: number } {
  return {
    heightMetres: bottomInsideMetres + fillShare * (tinHeightMetres - liquidBelowTheRimMetres - bottomInsideMetres),
    radiusMetres: tinRadiusMetres - liquidInsetFromTheWallMetres,
  }
}
