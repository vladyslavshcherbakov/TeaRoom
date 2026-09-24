import * as THREE from 'three'
import { itemLocationIn } from '../../../../../Shared/Simulation/Ritual/Reach.ts'
import { teaLookFor } from '../../../Table/TeaLooks.ts'
import type { TableViewState } from '../../../Table/TableViewState.ts'
import type { CarriedItemsScene } from './CarriedItemsScene.ts'
import { mostPuffsFromOneSource, type CarriedModel } from './CarriedModel.ts'
import { kettleShape } from './KettleShape.ts'
import { LeafPile, type LeafPileSize } from './LeafPile.ts'

type Wave = {
  readonly riseMetres: number
  readonly tiltXRadians: number
  readonly tiltZRadians: number
}

const openLidSideMetres = 0.16
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
const leavesInTheCaddy: LeafPileSize = { leafCount: 480, radiusMetres: 0.062, heightMetres: 0.14 }
const leavesOnTheSpoon: LeafPileSize = { leafCount: 16, radiusMetres: 0.03, heightMetres: 0.01 }
const stillWater: Wave = { riseMetres: 0, tiltXRadians: 0, tiltZRadians: 0 }
const wavesByMotion: Readonly<Record<TableViewState.SurfaceMotion, { heightMetres: number; tiltRadians: number; wavesPerSecond: number }>> = {
  still: { heightMetres: 0, tiltRadians: 0, wavesPerSecond: 0 },
  shimmering: { heightMetres: 0.0008, tiltRadians: 0.02, wavesPerSecond: 1.5 },
  simmering: { heightMetres: 0.002, tiltRadians: 0.05, wavesPerSecond: 2.5 },
  boiling: { heightMetres: 0.004, tiltRadians: 0.09, wavesPerSecond: 4 },
}

export function showContentsOf(model: CarriedModel, scene: CarriedItemsScene): void {
  const vessel = scene.table.vessels[model.itemId]
  const isOpen = model.shape === 'caddy' ? scene.table.caddy.isOpen : vessel?.isLidOpen === true
  if (model.lid !== null) placeLid(model, model.lid, isOpen, itemLocationIn(scene.state, model.itemId)?.kind === 'onSurface')
  if (model.liquid !== null && model.liquidMaterial !== null && vessel !== undefined) showLiquid(model, vessel)
  const wave = vessel === undefined ? stillWater : waveAt(vessel.surfaceMotion, scene.timeSeconds)
  if (model.gaugeWater !== null && vessel !== undefined) showWaterInGauge(model.gaugeWater, vessel, wave)
  if (model.kettleWater !== null && vessel !== undefined) showWaterInsideTheKettle(model.kettleWater, vessel, wave)
  if (model.leafHolder !== null) showLeaves(model, model.leafHolder, scene)
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
  if (model.liquid === null || model.liquidMaterial === null) return
  model.liquid.visible = vessel.fillShare > 0
  const surfaceHeight = 0.008 + vessel.fillShare * (model.rimHeight - 0.014)
  const radius = 0.042 + (surfaceHeight / model.rimHeight) * 0.038
  model.liquid.position.y = surfaceHeight
  model.liquid.scale.setScalar(radius)
  model.liquidMaterial.color.set(vessel.liquorColour)
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

function showWaterInGauge(gaugeWater: THREE.Mesh, vessel: TableViewState.Vessel, wave: Wave): void {
  const { gaugeBottomMetres, gaugeHeightMetres } = kettleShape
  const height = Math.max(0.001, vessel.fillShare * gaugeHeightMetres + (vessel.fillShare > 0 ? wave.riseMetres : 0))
  gaugeWater.visible = vessel.fillShare > 0
  gaugeWater.scale.y = height
  gaugeWater.position.y = gaugeBottomMetres + height / 2
  const material = gaugeWater.material
  if (material instanceof THREE.MeshStandardMaterial) material.color.set(vessel.liquorColour)
}

function showWaterInsideTheKettle(water: THREE.Mesh, vessel: TableViewState.Vessel, wave: Wave): void {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash, openingAngle, bottomInsideMetres, waterBelowTheOpeningMetres } = kettleShape
  water.visible = vessel.fillShare > 0 && vessel.isLidOpen === true
  const bodyHalfHeight = bodyRadiusMetres * bodySquash
  const openingHeight = bodyCentreMetres + bodyHalfHeight * Math.cos(openingAngle)
  const surfaceHeight = bottomInsideMetres + vessel.fillShare * (openingHeight - waterBelowTheOpeningMetres - bottomInsideMetres)
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

function placeLid(model: CarriedModel, lid: THREE.Object3D, isOpen: boolean, isStanding: boolean): void {
  lid.position.copy(model.lidClosedPosition)
  lid.rotation.set(0, 0, 0)
  if (!isOpen) return
  if (isStanding) {
    lid.position.x -= openLidSideMetres
    lid.position.y = lidLyingOnTheSurfaceMetres
    return
  }
  lid.position.x -= ajarLidSideMetres
  lid.position.y += ajarLidRiseMetres
  lid.rotation.z = ajarLidTiltRadians
}
