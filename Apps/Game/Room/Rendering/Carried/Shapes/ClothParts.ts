import * as THREE from 'three'
import type { CarriedShapeLook } from '../CarriedShapeLook.ts'
import { surfaceByClothPattern } from '../../RoomMaterials.ts'
import type { ItemSetUp, Display, ItemParts } from '../ItemParts.ts'
import { clothShape } from './ClothShape.ts'
import { charTheCloth, rumpledClothGeometry } from './RumpledClothGeometry.ts'

export const clothShapeLook: CarriedShapeLook = {
  partsFor: clothParts,
  steamRisesAboveTheSpout: false,
  steamPuffSizeShare: 1,
  steamSurface: 'steam',
  looseLeaves: null,
  soakedLeaves: null,
  fire: { flameAt: { x: 0.035, y: 0.012, z: -0.01 }, embersAround: { x: 0, y: 0.006, z: 0 }, emberSpreadMetres: { x: 0.07, z: 0.07 } },
  ash: null,
}

function clothParts(materials: ItemSetUp, clothId: string): ItemParts {
  const geometry = rumpledClothGeometry()
  const woven = materials.room.unsharedMaterialFor(surfaceByClothPattern[materials.clothPatternOf(clothId)])
  const cloth = new THREE.Mesh(geometry, woven)
  const charredColour = materials.room.colourOf('charredCloth')
  const charTo = (charring: number): void => charTheCloth(geometry, charring, charredColour)
  const stainAndWetness: Display = ({ cloth: shown }) => woven.color.copy(materials.room.colourOfACloth(shown?.teaStain ?? 0, shown?.wetShare ?? 0))
  return { meshes: [cloth], lid: null, heightMetres: clothShape.heightMetres, vessel: null, displays: [stainAndWetness], lookByWhereItIsDrawn: null, glassThatClears: null, charTo, levelsOfDetail: [] }
}
