import * as THREE from 'three'
import type { SurfaceMaterials } from '../RoomMaterials.ts'
import type { CarriedShapeLook } from './CarriedShapeLook.ts'
import type { ItemParts } from './ItemParts.ts'

export const spoonShapeLook: CarriedShapeLook = {
  partsFor: (materials) => spoonParts(materials.room),
  steamRisesAboveTheSpout: false,
  looseLeaves: {
    heapStartsAt: { x: 0.07, y: 0.02, z: 0 },
    pile: { leafCount: 16, radiusMetres: 0.03, heightMetres: 0.01, isLyingFlat: false },
    fillShareIn: (table) => table.spoonFillShare,
  },
  soakedLeaves: null,
}

function spoonParts(materials: SurfaceMaterials): ItemParts {
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.025), materials.materialFor('darkWood'))
  handle.position.set(-0.04, 0.01, 0)
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.02, 12), materials.materialFor('darkWood'))
  bowl.position.set(0.07, 0.012, 0)
  return { meshes: [handle, bowl], lid: null, spoutTip: new THREE.Vector3(0.11, 0.02, 0), rimHeight: 0.025, liquidLevel: null, liquidVolumeAt: null, pointsDownTheSide: null, heldInViewLook: null, glowingShell: null, gaugeWater: null, kettleWater: null }
}
