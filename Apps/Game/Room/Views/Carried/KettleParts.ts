import * as THREE from 'three'
import { touchAreaOf } from '../RoomLayers.ts'
import { mostSoakedLeavesShown } from '../../../Table/TablePresenter.ts'
import type { SurfaceMaterials } from '../RoomMaterials.ts'
import type { CarriedShapeLook } from './CarriedShapeLook.ts'
import { LampDisplay } from '../LampDisplay.ts'
import { GaugeStrip } from './GaugeStrip.ts'
import type { CarriedModelMaterials, ItemParts, PointDownTheSide } from './ItemParts.ts'
import { kettleRadiusAt, kettleShape, kettleWaterHeightAt } from './KettleShape.ts'

const lidTouchPadRadiusMetres = 0.095
const lidTouchPadHeightMetres = 0.08
const lidTouchPadAboveTheLidMetres = 0.02
const gaugeFrameHalfWidthMetres = 0.024
const gaugeFrameAboveTheBodyMetres = 0.0015
const gaugeFrameMarginMetres = 0.007
const gaugeWaterHalfWidthMetres = 0.017
const gaugeWaterAboveTheBodyMetres = 0.003
const overflowAboveTheBodyMetres = 0.005
const overflowLeavesTheKettleAtRadians = 2.4
const overflowPointsOnTheKettle = 12
const soakedLeavesRadiusMetres = 0.06
const thermometerWidthMetres = 0.1
const thermometerHeightMetres = 0.046
const thermometerFilamentWeight = 2.2
const thermometerTurnFromTheGaugeRadians = 0.55
const thermometerHeightOnTheBodyMetres = 0.125
const thermometerAboveTheBodyMetres = 0.01
const leavesClearOfTheWallMetres = 0.006

export const kettleShapeLook: CarriedShapeLook = {
  partsFor: kettleParts,
  steamRisesAboveTheSpout: true,
  steamPuffSizeShare: 1,
  steamSurface: 'steam',
  looseLeaves: null,
  soakedLeaves: {
    pile: { leafCount: mostSoakedLeavesShown, radiusMetres: soakedLeavesRadiusMetres, heightMetres: 0, isLyingFlat: true },
    floatHeightAt: kettleWaterHeightAt,
    spreadShareAt: (fillShare) => Math.min(1, (kettleRadiusAt(kettleWaterHeightAt(fillShare)) - leavesClearOfTheWallMetres) / soakedLeavesRadiusMetres),
    areSeenOnlyUnderAnOpenLid: true,
  },
  fire: null,
}

function kettleParts(materials: CarriedModelMaterials): ItemParts {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash, openingAngle } = kettleShape
  const bodyWithAnOpening = new THREE.SphereGeometry(bodyRadiusMetres, 20, 14, 0, Math.PI * 2, openingAngle, Math.PI - openingAngle)
  const body = new THREE.Mesh(bodyWithAnOpening, materials.room.materialFor('claySeenFromInside'))
  body.scale.set(1, bodySquash, 1)
  body.position.y = bodyCentreMetres
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.14, 8), materials.room.materialFor('clay'))
  spout.position.set(0.15, 0.14, 0)
  spout.rotation.z = -0.9
  const lid = new THREE.Group()
  const lidTop = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.03, 14), materials.room.materialFor('darkWood'))
  const lidTouchPad = touchAreaOf(new THREE.CylinderGeometry(lidTouchPadRadiusMetres, lidTouchPadRadiusMetres, lidTouchPadHeightMetres, 12))
  lidTouchPad.position.y = lidTouchPadAboveTheLidMetres
  lid.add(lidTop, lidTouchPad)
  lid.position.y = 0.215
  const gauge = waterGauge(materials.room)
  const kettleWater = waterInsideTheKettle(materials.room)
  const thermometer = thermometerOnTheBody(materials.room)
  const meshes = [body, spout, gauge.frame.mesh, gauge.water.mesh, kettleWater, thermometer.mesh]
  return {
    meshes,
    lid,
    spoutTip: new THREE.Vector3(0.205, 0.183, 0),
    rimHeight: 0.23,
    liquidLevel: null,
    liquidVolumeAt: null,
    pointsDownTheSide: pointsDownTheKettle(),
    heldInViewLook: null,
    glowingShell: null,
    gaugeWater: gauge.water,
    kettleWater,
    liquidTint: null,
    charTo: null,
    thermometer,
    levelsOfDetail: [],
  }
}

function pointsDownTheKettle(): PointDownTheSide[] {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash, openingAngle } = kettleShape
  return Array.from({ length: overflowPointsOnTheKettle + 1 }, (_, index) => {
    const angleFromTheTop = openingAngle + ((overflowLeavesTheKettleAtRadians - openingAngle) * index) / overflowPointsOnTheKettle
    return {
      distance: (bodyRadiusMetres + overflowAboveTheBodyMetres) * Math.sin(angleFromTheTop),
      height: bodyCentreMetres + (bodyRadiusMetres * bodySquash + overflowAboveTheBodyMetres) * Math.cos(angleFromTheTop),
    }
  })
}

function waterInsideTheKettle(materials: SurfaceMaterials): THREE.Mesh {
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 24), materials.unsharedMaterialFor('gaugeGlass'))
  water.rotation.x = -Math.PI / 2
  water.visible = false
  return water
}

function thermometerOnTheBody(materials: SurfaceMaterials): LampDisplay {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash } = kettleShape
  const thermometer = new LampDisplay(thermometerWidthMetres, thermometerHeightMetres, materials.unsharedMaterialFor('lampDisplay'), thermometerFilamentWeight)
  const height = thermometerHeightOnTheBodyMetres
  const radius = kettleRadiusAt(height)
  const onTheBody = new THREE.Vector3(Math.sin(thermometerTurnFromTheGaugeRadians) * radius, height, Math.cos(thermometerTurnFromTheGaugeRadians) * radius)
  const bodyHalfHeight = bodyRadiusMetres * bodySquash
  const outward = new THREE.Vector3(onTheBody.x / bodyRadiusMetres ** 2, (height - bodyCentreMetres) / bodyHalfHeight ** 2, onTheBody.z / bodyRadiusMetres ** 2).normalize()
  thermometer.mesh.position.copy(onTheBody).addScaledVector(outward, thermometerAboveTheBodyMetres)
  thermometer.mesh.lookAt(thermometer.mesh.position.clone().add(outward))
  thermometer.mesh.visible = false
  return thermometer
}

function waterGauge(materials: SurfaceMaterials): { frame: GaugeStrip; water: GaugeStrip } {
  const { gaugeBottomMetres, gaugeHeightMetres } = kettleShape
  const frame = new GaugeStrip(gaugeFrameHalfWidthMetres, gaugeFrameAboveTheBodyMetres, materials.materialFor('gaugeTube'))
  frame.cover(gaugeBottomMetres - gaugeFrameMarginMetres, gaugeBottomMetres + gaugeHeightMetres + gaugeFrameMarginMetres)
  const water = new GaugeStrip(gaugeWaterHalfWidthMetres, gaugeWaterAboveTheBodyMetres, materials.unsharedMaterialFor('gaugeGlass'))
  water.cover(gaugeBottomMetres, gaugeBottomMetres)
  return { frame, water }
}
