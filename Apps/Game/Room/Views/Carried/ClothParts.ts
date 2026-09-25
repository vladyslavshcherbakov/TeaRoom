import * as THREE from 'three'
import type { ItemParts } from './ItemParts.ts'
import { clothLengthMetres, rumpledClothGeometry } from './RumpledClothGeometry.ts'

export function clothParts(clothMaterial: THREE.Material): ItemParts {
  const cloth = new THREE.Mesh(rumpledClothGeometry(), clothMaterial)
  return { meshes: [cloth], lid: null, spoutTip: new THREE.Vector3(clothLengthMetres / 2, 0.02, 0), rimHeight: 0.02, liquidLevel: null }
}
