import * as THREE from 'three'
import type { RoomMaterials } from '../RoomMaterials.ts'
import type { CarriedShapeLook } from './CarriedShapeLook.ts'
import type { ItemParts } from './ItemParts.ts'

export const caddyShapeLook: CarriedShapeLook = {
  partsFor: (materials) => caddyParts(materials.room),
  steamRisesAboveTheSpout: false,
  looseLeaves: {
    heapStartsAt: { x: 0, y: 0.004, z: 0 },
    pile: { leafCount: 480, radiusMetres: 0.062, heightMetres: 0.14, isLyingFlat: false },
    fillShareIn: (table) => table.caddy.fillShare,
  },
  soakedLeaves: null,
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
  return { meshes: [body, bottom, label, rim], lid, spoutTip: new THREE.Vector3(0.08, 0.16, 0), rimHeight: 0.19, liquidLevel: null, liquidVolumeAt: null, pointsDownTheSide: null, heldInViewLook: null, glowingShell: null, gaugeWater: null, kettleWater: null }
}
