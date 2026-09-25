import * as THREE from 'three'
import type { RoomMaterials } from '../RoomMaterials.ts'
import { GaugeStrip } from './GaugeStrip.ts'
import type { CarriedModelMaterials, ItemParts } from './ItemParts.ts'
import { kettleShape } from './KettleShape.ts'

const lidTouchPadRadiusMetres = 0.095
const gaugeFrameHalfWidthMetres = 0.024
const gaugeFrameAboveTheBodyMetres = 0.0015
const gaugeFrameMarginMetres = 0.007
const gaugeWaterHalfWidthMetres = 0.017
const gaugeWaterAboveTheBodyMetres = 0.003

export function kettleParts(materials: CarriedModelMaterials): ItemParts {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash, openingAngle } = kettleShape
  const bodyWithAnOpening = new THREE.SphereGeometry(bodyRadiusMetres, 20, 14, 0, Math.PI * 2, openingAngle, Math.PI - openingAngle)
  const body = new THREE.Mesh(bodyWithAnOpening, materials.claySeenFromInside)
  body.scale.set(1, bodySquash, 1)
  body.position.y = bodyCentreMetres
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.14, 8), materials.room.materialFor('clay'))
  spout.position.set(0.15, 0.14, 0)
  spout.rotation.z = -0.9
  const lid = new THREE.Group()
  const lidTop = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.03, 14), materials.room.materialFor('darkWood'))
  const lidTouchPad = new THREE.Mesh(new THREE.CylinderGeometry(lidTouchPadRadiusMetres, lidTouchPadRadiusMetres, 0.04, 12), materials.touchPad)
  lid.add(lidTop, lidTouchPad)
  lid.position.y = 0.215
  const gauge = waterGauge(materials.room)
  const kettleWater = waterInsideTheKettle(materials.room)
  const meshes = [body, spout, gauge.frame.mesh, gauge.water.mesh, kettleWater]
  return { meshes, lid, spoutTip: new THREE.Vector3(0.205, 0.183, 0), rimHeight: 0.23, liquidLevel: null, gaugeWater: gauge.water, kettleWater }
}

function waterInsideTheKettle(materials: RoomMaterials): THREE.Mesh {
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 24), materials.unsharedMaterialFor('gaugeGlass'))
  water.rotation.x = -Math.PI / 2
  water.visible = false
  return water
}

function waterGauge(materials: RoomMaterials): { frame: GaugeStrip; water: GaugeStrip } {
  const { gaugeBottomMetres, gaugeHeightMetres } = kettleShape
  const frame = new GaugeStrip(gaugeFrameHalfWidthMetres, gaugeFrameAboveTheBodyMetres, materials.materialFor('gaugeTube'))
  frame.cover(gaugeBottomMetres - gaugeFrameMarginMetres, gaugeBottomMetres + gaugeHeightMetres + gaugeFrameMarginMetres)
  const water = new GaugeStrip(gaugeWaterHalfWidthMetres, gaugeWaterAboveTheBodyMetres, materials.unsharedMaterialFor('gaugeGlass'))
  water.cover(gaugeBottomMetres, gaugeBottomMetres)
  return { frame, water }
}
