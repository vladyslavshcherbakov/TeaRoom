import * as THREE from 'three'
import type { CarriedShapeLook } from './CarriedShapeLook.ts'
import type { ItemParts } from './ItemParts.ts'
import { clothLengthMetres, rumpledClothGeometry } from './RumpledClothGeometry.ts'

export const clothShapeLook: CarriedShapeLook = {
  partsFor: (materials) => clothParts(materials.cloth),
  steamRisesAboveTheSpout: false,
  looseLeaves: null,
  soakedLeaves: null,
}

function clothParts(clothMaterial: THREE.Material): ItemParts {
  const cloth = new THREE.Mesh(rumpledClothGeometry(), clothMaterial)
  return { meshes: [cloth], lid: null, spoutTip: new THREE.Vector3(clothLengthMetres / 2, 0.02, 0), rimHeight: 0.02, liquidLevel: null, liquidVolumeAt: null, pointsDownTheSide: null, heldInViewLook: null, glowingShell: null, gaugeWater: null, kettleWater: null }
}
