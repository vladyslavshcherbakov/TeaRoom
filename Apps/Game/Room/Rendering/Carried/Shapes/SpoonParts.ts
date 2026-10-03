import * as THREE from 'three'
import type { SurfaceMaterials } from '../../RoomMaterials.ts'
import type { CarriedShapeLook } from '../CarriedShapeLook.ts'
import type { ItemParts } from '../ItemParts.ts'
import { spoonShape } from './SpoonShape.ts'

const ashOnTheHandleFromMetres = -0.12
const ashOnTheHandleToMetres = 0.03
const ashOnTheHandleHalfWidthMetres = 0.012
const goldenAngleRadians = 2.4

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
  ash: { restingSpotOf: ashRestingSpotOf },
}

function spoonParts(materials: SurfaceMaterials): ItemParts {
  const { handle: handleSize, bowl: bowlSize } = spoonShape
  const bamboo = materials.unsharedMaterialFor('bamboo')
  const handle = new THREE.Mesh(new THREE.BoxGeometry(handleSize.lengthMetres, handleSize.heightMetres, handleSize.widthMetres), bamboo)
  handle.position.set(handleSize.centreOutMetres, handleSize.centreHeightMetres, 0)
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(bowlSize.topRadiusMetres, bowlSize.bottomRadiusMetres, bowlSize.heightMetres, 12), bamboo)
  bowl.position.set(bowlSize.centreOutMetres, bowlSize.centreHeightMetres, 0)
  const coolBamboo = materials.colourOf('bamboo')
  const charredBamboo = materials.colourOf('charredBamboo')
  const charTo = (charredShare: number): void => {
    bamboo.color.copy(coolBamboo).lerp(charredBamboo, charredShare)
  }
  return { meshes: [handle, bowl], lid: null, heightMetres: spoonShape.heightMetres, vessel: null, displays: [], lookByWhereItIsDrawn: null, glassThatClears: null, charTo, levelsOfDetail: [] }
}

function ashRestingSpotOf(flakeIndex: number, flakeCount: number): { x: number; z: number } {
  const flakesOnTheHandle = flakeCount / 2
  if (flakeIndex < flakesOnTheHandle) {
    const alongShare = (flakeIndex + 0.5) / flakesOnTheHandle
    return { x: ashOnTheHandleFromMetres + alongShare * (ashOnTheHandleToMetres - ashOnTheHandleFromMetres), z: Math.sin(flakeIndex * goldenAngleRadians) * ashOnTheHandleHalfWidthMetres }
  }
  const inTheBowl = flakeIndex - flakesOnTheHandle
  const { centreOutMetres, bottomRadiusMetres } = spoonShape.bowl
  const reach = bottomRadiusMetres * Math.sqrt((inTheBowl + 0.5) / (flakeCount - flakesOnTheHandle))
  return { x: centreOutMetres + Math.cos(inTheBowl * goldenAngleRadians) * reach, z: Math.sin(inTheBowl * goldenAngleRadians) * reach }
}
