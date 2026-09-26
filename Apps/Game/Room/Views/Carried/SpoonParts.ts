import * as THREE from 'three'
import { howTheSpoonChars } from '../../../../../Shared/Simulation/Physics/Charring.ts'
import type { SurfaceMaterials } from '../RoomMaterials.ts'
import type { CarriedShapeLook } from './CarriedShapeLook.ts'
import type { ItemParts } from './ItemParts.ts'

export const spoonShapeLook: CarriedShapeLook = {
  partsFor: (materials) => spoonParts(materials.room),
  steamRisesAboveTheSpout: false,
  steamPuffSizeShare: 1,
  steamSurface: 'steam',
  looseLeaves: {
    heapStartsAt: { x: 0.07, y: 0.02, z: 0 },
    pile: { leafCount: 16, radiusMetres: 0.03, heightMetres: 0.01, isLyingFlat: false },
  },
  soakedLeaves: null,
  fire: { flameAt: { x: 0.07, y: 0.022, z: 0 }, embersAround: { x: 0.01, y: 0.024, z: 0 }, emberSpreadMetres: { x: 0.1, z: 0.012 } },
}

function spoonParts(materials: SurfaceMaterials): ItemParts {
  const bamboo = materials.unsharedMaterialFor('bamboo')
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.025), bamboo)
  handle.position.set(-0.04, 0.01, 0)
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.02, 12), bamboo)
  bowl.position.set(0.07, 0.012, 0)
  const coolBamboo = materials.colourOf('bamboo')
  const charredBamboo = materials.colourOf('charredBamboo')
  const charTo = (charring: number): void => {
    bamboo.color.copy(coolBamboo).lerp(charredBamboo, Math.min(1, charring / howTheSpoonChars.burnsFromCharring))
  }
  return { meshes: [handle, bowl], lid: null, spoutTip: new THREE.Vector3(0.11, 0.02, 0), rimHeight: 0.025, liquidLevel: null, liquidVolumeAt: null, pointsDownTheSide: null, heldInViewLook: null, glowingShell: null, gaugeWater: null, kettleWater: null, liquidTint: null, charTo, thermometer: null, levelsOfDetail: [] }
}
