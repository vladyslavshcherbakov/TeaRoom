import * as THREE from 'three'
import { roomLayers } from '../../RoomLayers.ts'
import { mostSoakedLeavesShown } from '../../../../Presentation/WorldPresenter.ts'
import type { AppLog } from '../../../../../Engine/AppLog.ts'
import type { SurfaceMaterials } from '../../RoomMaterials.ts'
import type { CarriedShapeLook } from '../CarriedShapeLook.ts'
import { LampDisplay } from '../../LampDisplay.ts'
import { degreesShownIn, type TemperatureUnit } from '../../../Temperatures.ts'
import type { VesselView } from '../../../../Presentation/WorldViewState.ts'
import type { Wave } from '../Wave.ts'
import { KettleGaugeStrip } from './KettleGaugeStrip.ts'
import type { ItemSetUp, Display, ItemParts } from '../ItemParts.ts'
import { kettleRadiusAt, kettleShape, kettleWaterHeightAt } from './KettleShape.ts'
import type { ProfilePoint, VesselProfile } from '../VesselProfile.ts'

const lidTouchPadRadiusMetres = 0.095
const lidTouchPadHeightMetres = 0.08
const lidTouchPadAboveTheLidMetres = 0.02
const gaugeFrameHalfWidthMetres = 0.024
const gaugeFrameAboveTheBodyMetres = 0.0015
const gaugeFrameMarginMetres = 0.007
const gaugeWaterHalfWidthMetres = 0.017
const gaugeWaterAboveTheBodyMetres = 0.003
const overflowLeavesTheKettleAtRadians = 2.4
const pointsAlongTheBody = 32
const waterInsetFromTheWallMetres = 0.003
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
  ash: null,
}

function kettleParts(materials: ItemSetUp): ItemParts {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash, openingAngle, spout: spoutSize, lid: lidSize } = kettleShape
  const bodyWithAnOpening = new THREE.SphereGeometry(bodyRadiusMetres, 20, 14, 0, Math.PI * 2, openingAngle, Math.PI - openingAngle)
  const body = new THREE.Mesh(bodyWithAnOpening, materials.room.materialFor('claySeenFromInside'))
  body.scale.set(1, bodySquash, 1)
  body.position.y = bodyCentreMetres
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(spoutSize.tipRadiusMetres, spoutSize.baseRadiusMetres, spoutSize.lengthMetres, 8), materials.room.materialFor('clay'))
  spout.position.set(spoutSize.centreOutMetres, spoutSize.centreHeightMetres, 0)
  spout.rotation.z = spoutSize.tiltRadians
  const lid = new THREE.Group()
  const lidTop = new THREE.Mesh(new THREE.CylinderGeometry(lidSize.topRadiusMetres, lidSize.bottomRadiusMetres, lidSize.heightMetres, 14), materials.room.materialFor('darkWood'))
  const lidTouchPad = roomLayers.touchAreaOf(new THREE.CylinderGeometry(lidTouchPadRadiusMetres, lidTouchPadRadiusMetres, lidTouchPadHeightMetres, 12))
  lidTouchPad.position.y = lidTouchPadAboveTheLidMetres
  lid.add(lidTop, lidTouchPad)
  lid.position.y = lidSize.restsAtMetres
  const gauge = waterGauge(materials.room)
  const kettleWater = waterInsideTheKettle(materials.room)
  const thermometer = thermometerOnTheBody(materials.room, materials.log)
  const meshes = [body, spout, gauge.frame.mesh, gauge.water.mesh, kettleWater, thermometer.mesh]
  const displays: Display[] = [
    ({ vessel, wave }) => vessel !== undefined && showWaterInTheGauge(gauge.water, vessel, wave),
    ({ vessel, wave }) => vessel !== undefined && showWaterInsideTheKettle(kettleWater, vessel, wave),
    ({ vessel, temperatureUnit }) => showTheThermometer(thermometer, vessel, temperatureUnit),
  ]
  return {
    meshes,
    lid,
    heightMetres: kettleShape.heightMetres,
    vessel: { profile: kettleProfile(), spoutTip: new THREE.Vector3(spoutSize.tipOutMetres, spoutSize.tipHeightMetres, 0), liquid: null },
    displays,
    lookByWhereItIsDrawn: null, glassThatClears: null,
    charTo: null,
    levelsOfDetail: [],
  }
}

function kettleProfile(): VesselProfile {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash, openingAngle, bottomInsideMetres, waterBelowTheOpeningMetres } = kettleShape
  const pointsFrom = (lowestAngle: number): ProfilePoint[] =>
    Array.from({ length: pointsAlongTheBody + 1 }, (_, index) => {
      const angleFromTheTop = lowestAngle + ((openingAngle - lowestAngle) * index) / pointsAlongTheBody
      return { radiusMetres: bodyRadiusMetres * Math.sin(angleFromTheTop), heightMetres: bodyCentreMetres + bodyRadiusMetres * bodySquash * Math.cos(angleFromTheTop) }
    })
  const inside = pointsFrom(Math.PI)
  const floorMetres = inside[0]?.heightMetres ?? 0
  return {
    outside: pointsFrom(overflowLeavesTheKettleAtRadians),
    inside,
    liquid: { aboveTheFloorMetres: bottomInsideMetres - floorMetres, belowTheRimMetres: waterBelowTheOpeningMetres, insetFromTheWallMetres: waterInsetFromTheWallMetres },
  }
}

function waterInsideTheKettle(materials: SurfaceMaterials): THREE.Mesh {
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 24), materials.unsharedMaterialFor('gaugeGlass'))
  water.rotation.x = -Math.PI / 2
  water.visible = false
  return water
}

function thermometerOnTheBody(materials: SurfaceMaterials, log: AppLog): LampDisplay {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash } = kettleShape
  const thermometer = new LampDisplay(thermometerWidthMetres, thermometerHeightMetres, materials.unsharedMaterialFor('lampDisplay'), log, thermometerFilamentWeight)
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

function waterGauge(materials: SurfaceMaterials): { frame: KettleGaugeStrip; water: KettleGaugeStrip } {
  const { gaugeBottomMetres, gaugeHeightMetres } = kettleShape
  const frame = new KettleGaugeStrip(gaugeFrameHalfWidthMetres, gaugeFrameAboveTheBodyMetres, materials.materialFor('gaugeTube'))
  frame.cover(gaugeBottomMetres - gaugeFrameMarginMetres, gaugeBottomMetres + gaugeHeightMetres + gaugeFrameMarginMetres)
  const water = new KettleGaugeStrip(gaugeWaterHalfWidthMetres, gaugeWaterAboveTheBodyMetres, materials.unsharedMaterialFor('gaugeGlass'))
  water.cover(gaugeBottomMetres, gaugeBottomMetres)
  return { frame, water }
}

function showWaterInTheGauge(gaugeWater: KettleGaugeStrip, vessel: VesselView, wave: Wave): void {
  const { gaugeBottomMetres, gaugeHeightMetres } = kettleShape
  const height = Math.max(0.001, vessel.fillShare * gaugeHeightMetres + (vessel.fillShare > 0 ? wave.riseMetres : 0))
  gaugeWater.mesh.visible = vessel.fillShare > 0
  gaugeWater.cover(gaugeBottomMetres, gaugeBottomMetres + height)
  const material = gaugeWater.mesh.material
  if (material instanceof THREE.MeshStandardMaterial) material.color.set(vessel.liquorColour)
}

function showWaterInsideTheKettle(water: THREE.Mesh, vessel: VesselView, wave: Wave): void {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash } = kettleShape
  water.visible = vessel.fillShare > 0 && vessel.isLidOpen === true
  const bodyHalfHeight = bodyRadiusMetres * bodySquash
  const surfaceHeight = kettleWaterHeightAt(vessel.fillShare)
  const heightFromCentre = (surfaceHeight - bodyCentreMetres) / bodyHalfHeight
  water.position.y = surfaceHeight + wave.riseMetres
  water.rotation.set(-Math.PI / 2 + wave.tiltXRadians, 0, wave.tiltZRadians)
  water.scale.setScalar(Math.max(0.001, bodyRadiusMetres * Math.sqrt(Math.max(0, 1 - heightFromCentre * heightFromCentre)) - waterInsetFromTheWallMetres))
  const material = water.material
  if (material instanceof THREE.MeshStandardMaterial) material.color.set(vessel.liquorColour)
}

function showTheThermometer(thermometer: LampDisplay, vessel: VesselView | undefined, unit: TemperatureUnit | null): void {
  thermometer.mesh.visible = unit !== null
  if (unit === null) return
  const waterC = vessel?.waterTemperatureC ?? null
  thermometer.show({ degrees: waterC === null ? null : degreesShownIn(unit, waterC), unit })
}
