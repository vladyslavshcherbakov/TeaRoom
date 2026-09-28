import * as THREE from 'three'
import type { SurfaceMaterials } from '../../RoomMaterials.ts'
import { caddyShape } from './CaddyShape.ts'
import { disc, openWall, rimAround } from '../LatheParts.ts'
import type { CarriedShapeLook } from '../CarriedShapeLook.ts'
import type { ItemParts } from '../ItemParts.ts'
import { liquidBelowTheRimMetres, type VesselProfile } from '../VesselProfile.ts'

const { tinRadiusMetres, tinHeightMetres, rimTubeMetres, labelRadiusMetres, labelBottomMetres, labelTopMetres, bottomInsideMetres, lid: lidSize, knob: knobSize } = caddyShape
const liquidInsetFromTheWallMetres = 0.003
const caddySegmentsAround = 28

const caddyProfile: VesselProfile = {
  outside: [
    { radiusMetres: tinRadiusMetres, heightMetres: 0 },
    { radiusMetres: tinRadiusMetres, heightMetres: labelBottomMetres },
    { radiusMetres: labelRadiusMetres, heightMetres: labelBottomMetres },
    { radiusMetres: labelRadiusMetres, heightMetres: labelTopMetres },
    { radiusMetres: tinRadiusMetres, heightMetres: labelTopMetres },
    { radiusMetres: tinRadiusMetres + rimTubeMetres, heightMetres: tinHeightMetres },
    { radiusMetres: tinRadiusMetres, heightMetres: tinHeightMetres + rimTubeMetres },
  ],
  inside: [
    { radiusMetres: tinRadiusMetres, heightMetres: caddyShape.insideFloorMetres },
    { radiusMetres: tinRadiusMetres, heightMetres: tinHeightMetres },
  ],
  liquid: { aboveTheFloorMetres: bottomInsideMetres - caddyShape.insideFloorMetres, belowTheRimMetres: liquidBelowTheRimMetres, insetFromTheWallMetres: liquidInsetFromTheWallMetres },
}

export const caddyShapeLook: CarriedShapeLook = {
  partsFor: (materials) => caddyParts(materials.room),
  steamRisesAboveTheSpout: false,
  steamPuffSizeShare: 1,
  steamSurface: 'steam',
  looseLeaves: {
    heapStartsAt: { x: 0, y: 0.018, z: 0 },
    pile: { leafCount: 480, radiusMetres: 0.062, heightMetres: 0.126, isLyingFlat: false },
  },
  soakedLeaves: null,
  fire: null,
  ash: null,
}

function caddyParts(materials: SurfaceMaterials): ItemParts {
  const tin = materials.unsharedMaterialFor('caddyGreenSeenFromInside')
  const body = openWall(tinRadiusMetres, 0, tinHeightMetres, caddySegmentsAround, tin)
  const bottom = disc(tinRadiusMetres, caddyShape.insideFloorMetres, caddySegmentsAround, 'up', materials.materialFor('caddyInside'))
  const underside = disc(tinRadiusMetres, 0, caddySegmentsAround, 'down', materials.materialFor('caddyGreen'))
  const label = openWall(labelRadiusMetres, labelBottomMetres, labelTopMetres, caddySegmentsAround, materials.materialFor('caddyLabel'))
  const rim = rimAround(tinRadiusMetres, rimTubeMetres, tinHeightMetres, { aroundTheTube: 6, aroundTheRim: caddySegmentsAround }, materials.materialFor('caddyRim'))
  const lid = new THREE.Group()
  const lidTop = new THREE.Mesh(new THREE.CylinderGeometry(lidSize.radiusMetres, lidSize.radiusMetres, lidSize.heightMetres, caddySegmentsAround), materials.materialFor('caddyGreen'))
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(knobSize.topRadiusMetres, knobSize.bottomRadiusMetres, knobSize.heightMetres, 12), materials.materialFor('caddyRim'))
  knob.position.y = knobSize.aboveTheLidMetres
  lid.add(lidTop, knob)
  lid.position.y = lidSize.restsAtMetres
  return {
    meshes: [body, bottom, underside, label, rim],
    lid,
    heightMetres: tinHeightMetres + rimTubeMetres,
    vessel: { profile: caddyProfile, spoutTip: new THREE.Vector3(tinRadiusMetres + rimTubeMetres, tinHeightMetres + rimTubeMetres, 0), liquid: { tint: null, volumeAt: null } },
    displays: [],
    lookByWhereItIsDrawn: null, glassThatClears: null,
    charTo: null,
    levelsOfDetail: [],
  }
}
