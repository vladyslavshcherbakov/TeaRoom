import * as THREE from 'three'
import type { RoomMaterials } from '../RoomMaterials.ts'
import type { ItemParts } from './ItemParts.ts'

export function spoonParts(materials: RoomMaterials): ItemParts {
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.025), materials.materialFor('darkWood'))
  handle.position.set(-0.04, 0.01, 0)
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.02, 12), materials.materialFor('darkWood'))
  bowl.position.set(0.07, 0.012, 0)
  return { meshes: [handle, bowl], lid: null, spoutTip: new THREE.Vector3(0.11, 0.02, 0), rimHeight: 0.025, liquidLevel: null, liquidVolumeAt: null, pointsDownTheSide: null, heldInViewLook: null, glowingShell: null, gaugeWater: null, kettleWater: null }
}
