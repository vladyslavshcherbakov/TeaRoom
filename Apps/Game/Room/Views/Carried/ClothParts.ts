import * as THREE from 'three'
import type { CarriedShapeLook } from './CarriedShapeLook.ts'
import type { ItemParts } from './ItemParts.ts'
import { charTheCloth, clothLengthMetres, rumpledClothGeometry } from './RumpledClothGeometry.ts'

export const clothShapeLook: CarriedShapeLook = {
  partsFor: (materials) => clothParts(materials.cloth, materials.room.colourOf('charredCloth')),
  steamRisesAboveTheSpout: false,
  looseLeaves: null,
  soakedLeaves: null,
  fire: { flameAt: { x: 0.035, y: 0.012, z: -0.01 }, embersAround: { x: 0, y: 0.006, z: 0 }, emberSpreadMetres: { x: 0.07, z: 0.07 } },
}

function clothParts(clothMaterial: THREE.Material, charredColour: THREE.Color): ItemParts {
  const geometry = rumpledClothGeometry()
  const cloth = new THREE.Mesh(geometry, clothMaterial)
  const charTo = (charring: number): void => charTheCloth(geometry, charring, charredColour)
  return { meshes: [cloth], lid: null, spoutTip: new THREE.Vector3(clothLengthMetres / 2, 0.02, 0), rimHeight: 0.02, liquidLevel: null, liquidVolumeAt: null, pointsDownTheSide: null, heldInViewLook: null, glowingShell: null, gaugeWater: null, kettleWater: null, liquidTint: null, charTo, thermometer: null, levelsOfDetail: [] }
}
