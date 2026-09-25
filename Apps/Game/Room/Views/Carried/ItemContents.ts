import * as THREE from 'three'
import type { Spot } from '../../../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { itemLocationIn } from '../../../../../Shared/Simulation/Ritual/Reach.ts'
import { openLidOffsetBeside } from '../../Placement.ts'
import type { FloorPoint } from '../../RoomLayout.ts'
import { mostFloatingLeaves } from '../../../Table/TablePresenter.ts'
import { teaLookFor } from '../../../Table/TeaLooks.ts'
import type { TableViewState } from '../../../Table/TableViewState.ts'
import type { CarriedItemsScene } from './CarriedItemsScene.ts'
import { bowlLiquidGeometry, mostPuffsFromOneSource, type CarriedModel, type GlowingShell } from './CarriedModel.ts'
import type { GaugeStrip } from './GaugeStrip.ts'
import { kettleShape } from './KettleShape.ts'
import { LeafPile, type LeafPileSize } from './LeafPile.ts'

type Wave = {
  readonly riseMetres: number
  readonly tiltXRadians: number
  readonly tiltZRadians: number
}

const lidLyingOnTheSurfaceMetres = 0.015
const ajarLidSideMetres = 0.045
const ajarLidRiseMetres = 0.02
const ajarLidTiltRadians = 0.5
const steamRiseMetresPerSecond = 0.12
const steamColumnMetres = 0.18
const steamStartsAboveTheOpeningMetres = 0.04
const steamStartsAboveTheSpoutMetres = 0.02
const smallestPuffScale = 0.6
const tiltAcrossPaceShareOfTheRise = 0.8
const tiltAlongPaceShareOfTheRise = 1.3
const puffsBySteam: Readonly<Record<TableViewState.SteamLevel, number>> = { none: 0, wisps: 1, visible: 2, billowing: mostPuffsFromOneSource }
const leavesInTheCaddy: LeafPileSize = { leafCount: 480, radiusMetres: 0.062, heightMetres: 0.14, isLyingFlat: false }
const leavesOnTheSpoon: LeafPileSize = { leafCount: 16, radiusMetres: 0.03, heightMetres: 0.01, isLyingFlat: false }
const leavesOnTheWater: LeafPileSize = { leafCount: mostFloatingLeaves, radiusMetres: 0.06, heightMetres: 0, isLyingFlat: true }
const leavesAboveTheWaterMetres = 0.0015
const redHotMetal = new THREE.Color('#3a0904')
const dullRedHeat = new THREE.Color('#8a1000')
const brightRedHeat = new THREE.Color('#ff2a00')
const redHeatRisesWithGlow = 1.5
const brightestRedHeatIntensity = 2.2
const leavesDriftRadiansPerSecond = 0.05
const stillWater: Wave = { riseMetres: 0, tiltXRadians: 0, tiltZRadians: 0 }
const wavesByMotion: Readonly<Record<TableViewState.SurfaceMotion, { heightMetres: number; tiltRadians: number; wavesPerSecond: number }>> = {
  still: { heightMetres: 0, tiltRadians: 0, wavesPerSecond: 0 },
  shimmering: { heightMetres: 0.0008, tiltRadians: 0.02, wavesPerSecond: 1.5 },
  simmering: { heightMetres: 0.002, tiltRadians: 0.05, wavesPerSecond: 2.5 },
  boiling: { heightMetres: 0.004, tiltRadians: 0.09, wavesPerSecond: 4 },
}

export function showContentsOf(model: CarriedModel, scene: CarriedItemsScene, heaterSpot: Spot): void {
  const vessel = scene.table.vessels[model.itemId]
  const isOpen = model.shape === 'caddy' ? scene.table.caddy.isOpen : vessel?.isLidOpen === true
  const isStandingOutsideTheSink = itemLocationIn(scene.state, model.itemId)?.kind === 'onSurface' && scene.state.sink.itemIdInside !== model.itemId
  const lyingLidOffset = isOpen && isStandingOutsideTheSink ? openLidOffsetBeside(model.itemId, scene.state, heaterSpot) : null
  if (model.lid !== null) placeLid(model, model.lid, isOpen, lyingLidOffset)
  if (model.liquid !== null && model.liquidMaterial !== null && vessel !== undefined) showLiquid(model, vessel)
  const wave = vessel === undefined ? stillWater : waveAt(vessel.surfaceMotion, scene.timeSeconds)
  if (model.gaugeWater !== null && vessel !== undefined) showWaterInGauge(model.gaugeWater, vessel, wave)
  if (model.kettleWater !== null && vessel !== undefined) showWaterInsideTheKettle(model.kettleWater, vessel, wave)
  if (model.floatingLeafHolder !== null && vessel !== undefined) showLeavesOnTheKettlesWater(model, model.floatingLeafHolder, vessel, wave, scene.timeSeconds)
  if (model.leafHolder !== null) showLeaves(model, model.leafHolder, scene)
  if (model.glowingShell !== null && vessel !== undefined) showRedHeat(model.glowingShell, vessel.shellGlow)
  const puffsPerSource = vessel === undefined || !model.root.visible || model.isHeldInView ? 0 : puffsBySteam[vessel.steam]
  showSteam(model, steamSourcesOf(model, model.lid === null || isOpen), puffsPerSource, scene.timeSeconds)
}

function showSteam(model: CarriedModel, steamSources: readonly THREE.Vector3[], puffsPerSource: number, timeSeconds: number): void {
  model.puffs.forEach((puff, index) => {
    const source = steamSources[index % steamSources.length]
    const puffAtItsSource = Math.floor(index / steamSources.length)
    puff.visible = source !== undefined && puffAtItsSource < puffsPerSource
    if (!puff.visible || source === undefined) return
    const rise = (timeSeconds * steamRiseMetresPerSecond + puffAtItsSource / mostPuffsFromOneSource) % 1
    puff.position.set(source.x, source.y + rise * steamColumnMetres, source.z)
    puff.scale.setScalar(smallestPuffScale + rise)
  })
}

function showLeaves(model: CarriedModel, holder: THREE.Group, scene: CarriedItemsScene): void {
  const teaId = scene.state.caddy.teaId
  if (model.leaves === null || model.leaves.teaId !== teaId) {
    if (model.leaves !== null) holder.remove(model.leaves.pile.mesh)
    const pile = new LeafPile(teaLookFor(teaId), model.shape === 'spoon' ? leavesOnTheSpoon : leavesInTheCaddy)
    pile.mesh.layers.set(model.layer)
    pile.mesh.userData = { ...holder.userData }
    holder.add(pile.mesh)
    model.leaves = { pile, teaId }
  }
  model.leaves.pile.showFill(model.shape === 'spoon' ? scene.table.spoonFillShare : scene.table.caddy.fillShare)
}

function showLiquid(model: CarriedModel, vessel: TableViewState.Vessel): void {
  if (model.liquid === null || model.liquidMaterial === null || model.liquidLevel === null) return
  model.liquid.visible = vessel.fillShare > 0 && vessel.isLidOpen !== false
  const { heightMetres: surfaceHeight, radiusMetres } = model.liquidLevel(vessel.fillShare)
  model.liquid.position.y = surfaceHeight
  model.liquid.scale.setScalar(radiusMetres)
  model.liquidMaterial.color.set(vessel.liquorColour)
  model.liquidMaterial.opacity = vessel.liquorOpacity
  if (model.liquidVolume !== null) showLiquidVolume(model, model.liquidVolume, surfaceHeight, vessel)
}

function showLiquidVolume(model: CarriedModel, volume: THREE.Mesh, surfaceHeight: number, vessel: TableViewState.Vessel): void {
  volume.visible = vessel.fillShare > 0
  if (volume.material instanceof THREE.MeshStandardMaterial) volume.material.color.set(vessel.liquorColour)
  if (!volume.visible || model.liquidVolumeHeight === surfaceHeight) return
  model.liquidVolumeHeight = surfaceHeight
  volume.geometry.dispose()
  volume.geometry = bowlLiquidGeometry(surfaceHeight)
}

function waveAt(motion: TableViewState.SurfaceMotion, timeSeconds: number): Wave {
  const { heightMetres, tiltRadians, wavesPerSecond } = wavesByMotion[motion]
  const phase = timeSeconds * wavesPerSecond * Math.PI * 2
  return {
    riseMetres: Math.sin(phase) * heightMetres,
    tiltXRadians: Math.sin(phase * tiltAcrossPaceShareOfTheRise) * tiltRadians,
    tiltZRadians: Math.cos(phase * tiltAlongPaceShareOfTheRise) * tiltRadians,
  }
}

function showWaterInGauge(gaugeWater: GaugeStrip, vessel: TableViewState.Vessel, wave: Wave): void {
  const { gaugeBottomMetres, gaugeHeightMetres } = kettleShape
  const height = Math.max(0.001, vessel.fillShare * gaugeHeightMetres + (vessel.fillShare > 0 ? wave.riseMetres : 0))
  gaugeWater.mesh.visible = vessel.fillShare > 0
  gaugeWater.cover(gaugeBottomMetres, gaugeBottomMetres + height)
  const material = gaugeWater.mesh.material
  if (material instanceof THREE.MeshStandardMaterial) material.color.set(vessel.liquorColour)
}

function showLeavesOnTheKettlesWater(model: CarriedModel, holder: THREE.Group, vessel: TableViewState.Vessel, wave: Wave, timeSeconds: number): void {
  const floating = vessel.floatingLeaves
  holder.visible = floating !== null && vessel.fillShare > 0 && vessel.isLidOpen === true
  if (floating === null || !holder.visible) return
  if (model.floatingLeaves === null || model.floatingLeaves.teaId !== floating.teaId) {
    if (model.floatingLeaves !== null) holder.remove(model.floatingLeaves.pile.mesh)
    const pile = new LeafPile(teaLookFor(floating.teaId), leavesOnTheWater)
    pile.mesh.layers.set(model.layer)
    holder.add(pile.mesh)
    model.floatingLeaves = { pile, teaId: floating.teaId }
  }
  model.floatingLeaves.pile.showFill(floating.count / mostFloatingLeaves)
  holder.position.y = kettleSurfaceHeight(vessel) + wave.riseMetres + leavesAboveTheWaterMetres
  holder.rotation.set(wave.tiltXRadians, timeSeconds * leavesDriftRadiansPerSecond, wave.tiltZRadians)
}

function showRedHeat(shell: GlowingShell, glow: number): void {
  const { metal, coolColour, coolMetalness } = shell
  metal.color.copy(coolColour).lerp(redHotMetal, glow)
  metal.metalness = coolMetalness * (1 - glow)
  metal.emissive.copy(dullRedHeat).lerp(brightRedHeat, glow)
  metal.emissiveIntensity = glow ** redHeatRisesWithGlow * brightestRedHeatIntensity
}

function kettleSurfaceHeight(vessel: TableViewState.Vessel): number {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash, openingAngle, bottomInsideMetres, waterBelowTheOpeningMetres } = kettleShape
  const openingHeight = bodyCentreMetres + bodyRadiusMetres * bodySquash * Math.cos(openingAngle)
  return bottomInsideMetres + vessel.fillShare * (openingHeight - waterBelowTheOpeningMetres - bottomInsideMetres)
}

function showWaterInsideTheKettle(water: THREE.Mesh, vessel: TableViewState.Vessel, wave: Wave): void {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash } = kettleShape
  water.visible = vessel.fillShare > 0 && vessel.isLidOpen === true
  const bodyHalfHeight = bodyRadiusMetres * bodySquash
  const surfaceHeight = kettleSurfaceHeight(vessel)
  const heightFromCentre = (surfaceHeight - bodyCentreMetres) / bodyHalfHeight
  water.position.y = surfaceHeight + wave.riseMetres
  water.rotation.set(-Math.PI / 2 + wave.tiltXRadians, 0, wave.tiltZRadians)
  water.scale.setScalar(Math.max(0.001, bodyRadiusMetres * Math.sqrt(Math.max(0, 1 - heightFromCentre * heightFromCentre)) - 0.003))
  const material = water.material
  if (material instanceof THREE.MeshStandardMaterial) material.color.set(vessel.liquorColour)
}

function steamSourcesOf(model: CarriedModel, isOpenToTheAir: boolean): THREE.Vector3[] {
  const aboveTheOpening = model.root.position.clone().add(new THREE.Vector3(0, model.rimHeight + steamStartsAboveTheOpeningMetres, 0))
  const aboveTheSpout = model.root.localToWorld(model.spoutTip.clone()).add(new THREE.Vector3(0, steamStartsAboveTheSpoutMetres, 0))
  if (model.shape !== 'kettle') return isOpenToTheAir ? [aboveTheOpening] : []
  return isOpenToTheAir ? [aboveTheSpout, aboveTheOpening] : [aboveTheSpout]
}

function placeLid(model: CarriedModel, lid: THREE.Object3D, isOpen: boolean, lyingOffset: FloorPoint | null): void {
  lid.position.copy(model.lidClosedPosition)
  lid.rotation.set(0, 0, 0)
  if (!isOpen) return
  if (lyingOffset !== null) {
    lid.position.set(lyingOffset.x, lidLyingOnTheSurfaceMetres, lyingOffset.z)
    return
  }
  lid.position.x -= ajarLidSideMetres
  lid.position.y += ajarLidRiseMetres
  lid.rotation.z = ajarLidTiltRadians
}
