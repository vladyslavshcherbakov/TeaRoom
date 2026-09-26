import * as THREE from 'three'
import { degreesShownIn, type TemperatureUnit } from '../../Temperatures.ts'
import type { LampDisplay } from '../LampDisplay.ts'
import { itemLocationIn } from '../../../../../Shared/Simulation/Ritual/Reach.ts'
import { isTheLidOpen, layoutOf } from '../../CarriedShapes.ts'
import { openLidOffsetBeside, type Surroundings } from '../../Placement.ts'
import { turnedBy, type FloorPoint } from '../../RoomLayout.ts'
import { mostSoakedLeavesShown } from '../../../Table/TablePresenter.ts'
import { teaLookFor } from '../../../Table/TeaLooks.ts'
import type { LooseLeavesView, SteamLevel, SurfaceMotion, VesselView } from '../../../Table/TableViewState.ts'
import type { CarriedItemsScene } from './CarriedItemsScene.ts'
import type { LooseLeavesLook } from './CarriedShapeLook.ts'
import { mostPuffsFromOneSource, type CarriedModel, type PuffTrail } from './CarriedModel.ts'
import type { GlowingShell } from './ItemParts.ts'
import type { GaugeStrip } from './GaugeStrip.ts'
import { kettleShape, kettleWaterHeightAt } from './KettleShape.ts'
import { LeafPile } from './LeafPile.ts'
import { roomLayers } from '../RoomLayers.ts'

type SteamDrawnToTheEyes = {
  readonly eyes: THREE.Vector3
  readonly share: number
}

type Wave = {
  readonly riseMetres: number
  readonly tiltXRadians: number
  readonly tiltZRadians: number
}

const lidLyingOnTheSurfaceMetres = 0.015
const openLidSwungPastUprightRadians = (105 * Math.PI) / 180
const steamRiseMetresPerSecond = 0.2
const steamColumnMetres = 0.12
const steamStartsAboveTheOpeningMetres = 0.04
const steamStartsAboveTheSpoutMetres = 0.02
const smallestPuffScale = 0.6
const sipPuffCrossingsPerSecond = 0.38
const steamAppearsOverShareOfItsRise = 0.12
const leftBehindPuffFadesInSeconds = 0.8
const tiltAcrossPaceShareOfTheRise = 0.8
const tiltAlongPaceShareOfTheRise = 1.3
const puffsBySteam: Readonly<Record<SteamLevel, number>> = { none: 0, wisps: 1, visible: 2, billowing: mostPuffsFromOneSource }
const leavesAboveTheWaterMetres = 0.0015
const oilySheenOfTar = 0.9
const redHeatRisesWithGlow = 1.5
const brightestRedHeatIntensity = 2.2
const leavesDriftRadiansPerSecondByMotion: Readonly<Record<SurfaceMotion, number>> = { still: 0.05, shimmering: 0.08, simmering: 0.25, boiling: 0.9 }
const noLooseLeaves: LooseLeavesView = { teaId: null, fillShare: 0 }
const stillWater: Wave = { riseMetres: 0, tiltXRadians: 0, tiltZRadians: 0 }
const wavesByMotion: Readonly<Record<SurfaceMotion, { heightMetres: number; tiltRadians: number; wavesPerSecond: number }>> = {
  still: { heightMetres: 0, tiltRadians: 0, wavesPerSecond: 0 },
  shimmering: { heightMetres: 0.0008, tiltRadians: 0.02, wavesPerSecond: 1.5 },
  simmering: { heightMetres: 0.002, tiltRadians: 0.05, wavesPerSecond: 2.5 },
  boiling: { heightMetres: 0.004, tiltRadians: 0.09, wavesPerSecond: 4 },
}

export function showContentsOf(model: CarriedModel, scene: CarriedItemsScene, surroundings: Surroundings): void {
  const vessel = scene.table.vessels[model.itemId]
  const isOpen = isTheLidOpen(scene.state, model.itemId)
  const isStandingOutsideTheSink = itemLocationIn(scene.state, model.itemId)?.kind === 'onSurface' && scene.state.sink.itemIdInside !== model.itemId
  const lyingLidOffsetInTheRoom = isOpen && isStandingOutsideTheSink ? openLidOffsetBeside(model.itemId, scene.state, surroundings) : null
  const lyingLidOffset = lyingLidOffsetInTheRoom === null ? null : turnedBy(lyingLidOffsetInTheRoom, -model.root.rotation.y)
  if (model.lid !== null) placeLid(model, model.lid, isOpen, lyingLidOffset, layoutOf(scene.state, model.itemId)?.lid?.lyingRadiusMetres ?? 0)
  if (model.liquid !== null && model.liquidMaterial !== null && vessel !== undefined) showLiquid(model, vessel)
  const wave = vessel === undefined ? stillWater : waveAt(vessel.surfaceMotion, scene.timeSeconds)
  if (model.gaugeWater !== null && vessel !== undefined) showWaterInGauge(model.gaugeWater, vessel, wave)
  if (model.thermometer !== null) showTheThermometer(model.thermometer, vessel, scene.temperatureUnitShown)
  if (model.kettleWater !== null && vessel !== undefined) showWaterInsideTheKettle(model.kettleWater, vessel, wave)
  if (model.soakedLeafHolder !== null && vessel !== undefined) showSoakedLeaves(model, model.soakedLeafHolder, vessel, wave, scene.timeSeconds)
  if (model.leafHolder !== null) showLeaves(model, model.leafHolder, scene)
  if (model.glowingShell !== null && vessel !== undefined) showRedHeat(model.glowingShell, vessel.shellGlow)
  const puffsPerSource = vessel === undefined || !model.root.visible || model.layer === roomLayers.inspected ? 0 : puffsBySteam[vessel.steam]
  const sip = scene.sipGesture?.cupId === model.itemId ? scene.sipGesture : null
  const toTheEyes = sip === null || scene.heldInView === null ? null : { eyes: scene.heldInView.camera.getWorldPosition(new THREE.Vector3()), share: sip.liftShare }
  const isOpenToTheAir = model.lid === null || isOpen
  const whereTheVesselIs = whereIsTheVessel(model, scene)
  model.root.updateMatrixWorld()
  showSteam(model, steamSourcesOf(model, isOpenToTheAir), puffsPerSource, scene.timeSeconds, whereTheVesselIs)
  showSipSteam(model, isOpenToTheAir ? puffsPerSource : 0, scene.timeSeconds, toTheEyes, whereTheVesselIs)
}

function whereIsTheVessel(model: CarriedModel, scene: CarriedItemsScene): string {
  const location = itemLocationIn(scene.state, model.itemId)
  const isChosen = location?.kind === 'inHand' && scene.heldInView?.chosenHandIndex === location.handIndex
  return JSON.stringify({ layer: model.layer, location, isChosen })
}

function showSteam(model: CarriedModel, steamSources: readonly THREE.Vector3[], puffsPerSource: number, timeSeconds: number, whereTheVesselIs: string): void {
  model.puffs.forEach((puff, index) => {
    const trail = model.puffTrails[index]
    const source = steamSources[index % steamSources.length]
    const puffAtItsSource = Math.floor(index / steamSources.length)
    if (trail === undefined || source === undefined || puffAtItsSource >= puffsPerSource) {
      hideThePuff(puff, trail)
      return
    }
    const rise = (timeSeconds * steamRiseMetresPerSecond + puffAtItsSource / mostPuffsFromOneSource) % 1
    if (!trail.isOut || rise < trail.lastRise) releaseThePuff(model, puff, trail, source, new THREE.Vector3(0, 1, 0), steamColumnMetres * model.root.scale.x, model.isHeldInView ? model.steamLook.heldInView : model.steamLook.inRoom, whereTheVesselIs)
    showThePuff(model, puff, trail, rise, timeSeconds, whereTheVesselIs)
  })
}

function showSipSteam(model: CarriedModel, sipPuffCount: number, timeSeconds: number, toTheEyes: SteamDrawnToTheEyes | null, whereTheVesselIs: string): void {
  if (toTheEyes !== null && model.sipSteamStartedAtSeconds === null) model.sipSteamStartedAtSeconds = timeSeconds
  const startedAtSeconds = model.sipSteamStartedAtSeconds
  if (startedAtSeconds === null) return
  const crossings = (timeSeconds - startedAtSeconds) * sipPuffCrossingsPerSecond
  const opening = model.root.localToWorld(new THREE.Vector3(0, model.rimHeight + steamStartsAboveTheOpeningMetres, 0))
  model.sipPuffs.forEach((puff, index) => {
    const trail = model.sipPuffTrails[index]
    if (trail === undefined) return
    const crossingsOfThePuff = crossings - index / Math.max(1, sipPuffCount)
    const rise = Math.max(0, crossingsOfThePuff) % 1
    const isDue = !trail.isOut || rise < trail.lastRise
    if (isDue) {
      if (toTheEyes === null || index >= sipPuffCount || crossingsOfThePuff < 0) return hideThePuff(puff, trail)
      const reachMetres = THREE.MathUtils.lerp(steamColumnMetres * model.root.scale.x, opening.distanceTo(toTheEyes.eyes), toTheEyes.share)
      releaseThePuff(model, puff, trail, opening, steamRisingTo(opening, toTheEyes), reachMetres, model.steamLook.drawnToTheEyes, whereTheVesselIs)
    }
    showThePuff(model, puff, trail, rise, timeSeconds, whereTheVesselIs)
  })
  if (toTheEyes === null && model.sipPuffTrails.every((trail) => !trail.isOut)) model.sipSteamStartedAtSeconds = null
}

function releaseThePuff(model: CarriedModel, puff: THREE.Mesh, trail: PuffTrail, source: THREE.Vector3, direction: THREE.Vector3, reachMetres: number, look: THREE.Material, whereTheVesselIs: string): void {
  trail.isOut = true
  trail.origin.copy(source)
  trail.direction.copy(direction)
  trail.size = model.root.scale.x
  trail.reachMetres = reachMetres
  trail.opacity = look.opacity
  trail.whereTheVesselWas = whereTheVesselIs
  trail.leftBehindAtSeconds = null
  puff.layers.set(model.layer)
}

function showThePuff(model: CarriedModel, puff: THREE.Mesh, trail: PuffTrail, rise: number, timeSeconds: number, whereTheVesselIs: string): void {
  if (trail.leftBehindAtSeconds === null && trail.whereTheVesselWas !== whereTheVesselIs) trail.leftBehindAtSeconds = timeSeconds
  const shareLeft = trail.leftBehindAtSeconds === null ? 1 : Math.max(0, 1 - (timeSeconds - trail.leftBehindAtSeconds) / leftBehindPuffFadesInSeconds)
  trail.lastRise = rise
  trail.material.opacity = trail.opacity * shareLeft * shareOfSteamLeftAt(rise)
  puff.visible = shareLeft > 0
  puff.position.copy(trail.origin).addScaledVector(trail.direction, rise * trail.reachMetres)
  puff.scale.setScalar((smallestPuffScale + rise) * model.look.steamPuffSizeShare * trail.size)
}

export function shareOfSteamLeftAt(rise: number): number {
  return Math.min(1, rise / steamAppearsOverShareOfItsRise) * (1 - rise) ** 2
}

function hideThePuff(puff: THREE.Mesh, trail: PuffTrail | undefined): void {
  puff.visible = false
  if (trail !== undefined) trail.isOut = false
}

function steamRisingTo(source: THREE.Vector3, toTheEyes: SteamDrawnToTheEyes): THREE.Vector3 {
  const towardTheEyes = toTheEyes.eyes.clone().sub(source).normalize()
  return new THREE.Vector3(0, 1, 0).lerp(towardTheEyes, toTheEyes.share).normalize()
}

function showLeaves(model: CarriedModel, holder: THREE.Group, scene: CarriedItemsScene): void {
  const looseLeaves = model.look.looseLeaves
  if (looseLeaves === null) return
  const { teaId, fillShare } = scene.table.looseLeavesByItem[model.itemId] ?? noLooseLeaves
  if (model.leaves === null || model.leaves.teaId !== teaId) {
    if (model.leaves !== null) holder.remove(model.leaves.pile.mesh)
    const pile = new LeafPile(teaLookFor(teaId), looseLeaves.pile, model.leafMaterial)
    pile.mesh.layers.set(model.layer)
    pile.mesh.userData = { ...holder.userData }
    holder.add(pile.mesh)
    model.leaves = { pile, teaId }
  }
  model.leaves.pile.showFill(fillShare)
  holder.position.y = looseLeaves.heapStartsAt.y + heapLiftedByTheLiquid(model, looseLeaves, fillShare, scene.table.vessels[model.itemId])
}

function heapLiftedByTheLiquid(model: CarriedModel, looseLeaves: LooseLeavesLook, fillShare: number, vessel: VesselView | undefined): number {
  if (vessel === undefined || vessel.fillShare <= 0 || model.liquidLevel === null) return 0
  const heapTop = looseLeaves.heapStartsAt.y + fillShare * looseLeaves.pile.heightMetres
  return Math.max(0, model.liquidLevel(vessel.fillShare).heightMetres - heapTop)
}

function showLiquid(model: CarriedModel, vessel: VesselView): void {
  if (model.liquid === null || model.liquidMaterial === null || model.liquidLevel === null) return
  model.liquid.visible = vessel.fillShare > 0 && vessel.isLidOpen !== false
  const { heightMetres: surfaceHeight, radiusMetres } = model.liquidLevel(vessel.fillShare)
  model.liquid.position.y = surfaceHeight
  model.liquid.scale.setScalar(radiusMetres)
  model.liquidMaterial.color.set(vessel.liquorColour)
  if (model.liquidTint !== null) model.liquidMaterial.color.multiply(model.liquidTint)
  model.liquidMaterial.opacity = vessel.liquorOpacity
  if (model.liquidMaterial instanceof THREE.MeshPhysicalMaterial) model.liquidMaterial.iridescence = vessel.brewStage === 'tar' ? oilySheenOfTar : 0
  if (model.liquidVolume !== null) showLiquidVolume(model, model.liquidVolume, surfaceHeight, vessel)
}

function showLiquidVolume(model: CarriedModel, volume: THREE.Mesh, surfaceHeight: number, vessel: VesselView): void {
  volume.visible = vessel.fillShare > 0
  if (volume.material instanceof THREE.MeshStandardMaterial && model.liquidMaterial !== null) volume.material.color.copy(model.liquidMaterial.color)
  if (!volume.visible || model.liquidVolumeAt === null || model.liquidVolumeHeight === surfaceHeight) return
  model.liquidVolumeHeight = surfaceHeight
  volume.geometry.dispose()
  volume.geometry = model.liquidVolumeAt(surfaceHeight)
}

function waveAt(motion: SurfaceMotion, timeSeconds: number): Wave {
  const { heightMetres, tiltRadians, wavesPerSecond } = wavesByMotion[motion]
  const phase = timeSeconds * wavesPerSecond * Math.PI * 2
  return {
    riseMetres: Math.sin(phase) * heightMetres,
    tiltXRadians: Math.sin(phase * tiltAcrossPaceShareOfTheRise) * tiltRadians,
    tiltZRadians: Math.cos(phase * tiltAlongPaceShareOfTheRise) * tiltRadians,
  }
}

function showWaterInGauge(gaugeWater: GaugeStrip, vessel: VesselView, wave: Wave): void {
  const { gaugeBottomMetres, gaugeHeightMetres } = kettleShape
  const height = Math.max(0.001, vessel.fillShare * gaugeHeightMetres + (vessel.fillShare > 0 ? wave.riseMetres : 0))
  gaugeWater.mesh.visible = vessel.fillShare > 0
  gaugeWater.cover(gaugeBottomMetres, gaugeBottomMetres + height)
  const material = gaugeWater.mesh.material
  if (material instanceof THREE.MeshStandardMaterial) material.color.set(vessel.liquorColour)
}

function showSoakedLeaves(model: CarriedModel, holder: THREE.Group, vessel: VesselView, wave: Wave, timeSeconds: number): void {
  const soaked = vessel.soakedLeaves
  const soakedLook = model.look.soakedLeaves
  const isInsideShown = soakedLook?.areSeenOnlyUnderAnOpenLid === true ? vessel.isLidOpen === true : true
  holder.visible = soaked !== null && soakedLook !== null && isInsideShown
  if (soaked === null || soakedLook === null || !holder.visible) return
  if (model.soakedLeaves === null || model.soakedLeaves.teaId !== soaked.teaId) {
    if (model.soakedLeaves !== null) holder.remove(model.soakedLeaves.pile.mesh)
    const pile = new LeafPile(teaLookFor(soaked.teaId), soakedLook.pile, model.leafMaterial)
    pile.mesh.layers.set(model.layer)
    holder.add(pile.mesh)
    model.soakedLeaves = { pile, teaId: soaked.teaId }
  }
  model.soakedLeaves.pile.showFill(soaked.count / mostSoakedLeavesShown)
  const waterRise = vessel.fillShare > 0 ? wave.riseMetres : 0
  holder.position.y = soakedLook.floatHeightAt(vessel.fillShare) + waterRise + leavesAboveTheWaterMetres
  holder.rotation.set(wave.tiltXRadians, soakedLeavesTurnedBy(model, vessel.surfaceMotion, timeSeconds), wave.tiltZRadians)
  const spreadShare = soakedLook.spreadShareAt(vessel.fillShare)
  holder.scale.set(spreadShare, 1, spreadShare)
}

function soakedLeavesTurnedBy(model: CarriedModel, motion: SurfaceMotion, timeSeconds: number): number {
  const turn = model.soakedLeavesTurn ?? { radians: 0, atSeconds: timeSeconds }
  const radians = turn.radians + Math.max(0, timeSeconds - turn.atSeconds) * leavesDriftRadiansPerSecondByMotion[motion]
  model.soakedLeavesTurn = { radians, atSeconds: timeSeconds }
  return radians
}

function showRedHeat(shell: GlowingShell, glow: number): void {
  const { metal, coolColour, coolMetalness, hotColour, dullHeatGlow, brightHeatGlow } = shell
  metal.color.copy(coolColour).lerp(hotColour, glow)
  metal.metalness = coolMetalness * (1 - glow)
  metal.emissive.copy(dullHeatGlow).lerp(brightHeatGlow, glow)
  metal.emissiveIntensity = glow ** redHeatRisesWithGlow * brightestRedHeatIntensity
}

function showWaterInsideTheKettle(water: THREE.Mesh, vessel: VesselView, wave: Wave): void {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash } = kettleShape
  water.visible = vessel.fillShare > 0 && vessel.isLidOpen === true
  const bodyHalfHeight = bodyRadiusMetres * bodySquash
  const surfaceHeight = kettleWaterHeightAt(vessel.fillShare)
  const heightFromCentre = (surfaceHeight - bodyCentreMetres) / bodyHalfHeight
  water.position.y = surfaceHeight + wave.riseMetres
  water.rotation.set(-Math.PI / 2 + wave.tiltXRadians, 0, wave.tiltZRadians)
  water.scale.setScalar(Math.max(0.001, bodyRadiusMetres * Math.sqrt(Math.max(0, 1 - heightFromCentre * heightFromCentre)) - 0.003))
  const material = water.material
  if (material instanceof THREE.MeshStandardMaterial) material.color.set(vessel.liquorColour)
}

function showTheThermometer(thermometer: LampDisplay, vessel: VesselView | undefined, unit: TemperatureUnit | null): void {
  thermometer.mesh.visible = unit !== null
  if (unit === null) return
  const waterC = vessel?.waterTemperatureC ?? null
  thermometer.show({ degrees: waterC === null ? null : degreesShownIn(unit, waterC), unit })
}

function steamSourcesOf(model: CarriedModel, isOpenToTheAir: boolean): THREE.Vector3[] {
  const aboveTheOpening = model.root.localToWorld(new THREE.Vector3(0, model.rimHeight + steamStartsAboveTheOpeningMetres, 0))
  const aboveTheSpout = model.root.localToWorld(model.spoutTip.clone()).add(new THREE.Vector3(0, steamStartsAboveTheSpoutMetres, 0))
  return [...(model.look.steamRisesAboveTheSpout ? [aboveTheSpout] : []), ...(isOpenToTheAir ? [aboveTheOpening] : [])]
}

function placeLid(model: CarriedModel, lid: THREE.Object3D, isOpen: boolean, lyingOffset: FloorPoint | null, lidRadiusMetres: number): void {
  lid.position.copy(model.lidClosedPosition)
  lid.rotation.set(0, 0, 0)
  if (!isOpen) return
  if (lyingOffset !== null) {
    lid.position.set(lyingOffset.x, lidLyingOnTheSurfaceMetres, lyingOffset.z)
    return
  }
  lid.position.x -= lidRadiusMetres * (1 - Math.cos(openLidSwungPastUprightRadians))
  lid.position.y += lidRadiusMetres * Math.sin(openLidSwungPastUprightRadians)
  lid.rotation.z = openLidSwungPastUprightRadians
}
