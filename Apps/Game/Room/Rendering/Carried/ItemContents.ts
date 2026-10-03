import * as THREE from 'three'
import { isTheLidOpen, layoutOf } from '../../CarriedShapes.ts'
import type { LyingLid } from '../../Placement.ts'
import { turnedBy } from '../../RoomLayout.ts'
import type { FloorPoint } from '../../../../Engine/Points.ts'
import { mostSoakedLeavesShown } from '../../../Presentation/WorldPresenter.ts'
import { teaLookFor } from '../../../Presentation/TeaLooks.ts'
import type { BrewStage, LooseLeavesView, SteamLevel, SurfaceMotion, VesselView } from '../../../Presentation/WorldViewState.ts'
import type { DyeInflow } from '../../../../Engine/Rendering/Flow/SwirlingDye.ts'
import type { CarriedItemsScene } from './CarriedItemsScene.ts'
import type { LooseLeavesLook } from './CarriedShapeLook.ts'
import type { CarriedModel } from './CarriedModel.ts'
import type { WispsLook } from '../../../../Engine/Rendering/Wisps/RisingWisps.ts'
import { LeafPile } from './LeafPile.ts'
import { roomLayers } from '../RoomLayers.ts'
import { stillWater, waveAt, type Wave } from './Wave.ts'
import { liquidLevelIn, openingOf } from './VesselProfile.ts'

type SteamDrawnToTheEyes = {
  readonly eyes: THREE.Vector3
  readonly share: number
}

const openLidSwungPastUprightRadians = (105 * Math.PI) / 180
const steamStartsAboveTheOpeningMetres = 0.04
const steamStartsAboveTheSpoutMetres = 0.02
const steamAppearsOverShareOfItsRise = 0.12
const wispsPerSecondBySteam: Readonly<Record<SteamLevel, number>> = { none: 0, wisps: 10, visible: 22, billowing: 40 }
const wispOpacityShareOfTheSteam = 0.5
const longestWispStepSeconds = 0.1
const straightUp = new THREE.Vector3(0, 1, 0)
const whiteUnderTheDye = new THREE.Color('#ffffff')
const longestDyeStepSeconds = 0.1
const agitationByMotion: Readonly<Record<SurfaceMotion, number>> = { still: 0, shimmering: 0.3, simmering: 1, boiling: 3 }
const seepingFromTheLeavesByBrewStage: Readonly<Record<BrewStage, number>> = { water: 0.5, pale: 0.4, good: 0.25, rich: 0.1, heavy: 0, overbrewed: 0, tar: 0 }
const seepingSpotsAroundTheLeaves = 3
const seepingSpotsFromTheMiddleShare = 0.2
const seepingColourShareOfTheTea = 0.7
const warmthOfWhatSeepsFromTheLeaves = -1
const leavesAboveTheWaterMetres = 0.0015
const oilySheenOfTar = 0.9
const leavesDriftRadiansPerSecondByMotion: Readonly<Record<SurfaceMotion, number>> = { still: 0.05, shimmering: 0.08, simmering: 0.25, boiling: 0.9 }
const noLooseLeaves: LooseLeavesView = { teaId: null, fillShare: 0 }

export function showContentsOf(model: CarriedModel, scene: CarriedItemsScene, lidsLyingOpen: readonly LyingLid[], inflow: DyeInflow | null = null): void {
  const vessel = scene.view.vessels[model.itemId]
  const isOpen = isTheLidOpen(scene.state, model.itemId)
  const lyingLidOffsetInTheRoom = lidsLyingOpen.find((lid) => lid.itemId === model.itemId)?.offset ?? null
  const lyingLidOffset = lyingLidOffsetInTheRoom === null ? null : turnedBy(lyingLidOffsetInTheRoom, -model.root.rotation.y)
  if (model.lid !== null) placeLid(model, model.lid, isOpen, lyingLidOffset, layoutOf(scene.state, model.itemId)?.lid?.lyingRadiusMetres ?? 0)
  const wave = vessel === undefined ? stillWater : waveAt(vessel.surfaceMotion, scene.timeSeconds)
  if (model.liquid !== null && model.liquidMaterial !== null && vessel !== undefined) showLiquid(model, vessel, wave, inflow, scene.timeSeconds)
  for (const display of model.displays) display({ vessel, cloth: scene.view.cloths[model.itemId], wave, temperatureUnit: scene.temperatureUnitShown })
  if (model.soakedLeafHolder !== null && vessel !== undefined) showSoakedLeaves(model, model.soakedLeafHolder, vessel, wave, scene.timeSeconds)
  if (model.leafHolder !== null) showLeaves(model, model.leafHolder, scene)
  const wispsPerSecond = vessel === undefined || !model.root.visible || model.now.pass === 'inspected' ? 0 : wispsPerSecondBySteam[vessel.steam]
  const sip = scene.sipGesture?.cupId === model.itemId ? scene.sipGesture : null
  const toTheEyes = sip === null || scene.heldInView === null ? null : { eyes: scene.heldInView.camera.getWorldPosition(new THREE.Vector3()), share: sip.liftShare }
  const isOpenToTheAir = model.lid === null || isOpen
  model.root.updateMatrixWorld()
  showSteam(model, steamSourcesOf(model, isOpenToTheAir), wispsPerSecond, scene.timeSeconds, toTheEyes)
}

function showSteam(model: CarriedModel, steamSources: readonly THREE.Vector3[], wispsPerSecond: number, timeSeconds: number, toTheEyes: SteamDrawnToTheEyes | null): void {
  if (model.now.wispsPass !== model.now.pass) {
    model.wisps.clear()
    roomLayers.putOnLayer(model.wisps.points, model.now.pass, 'decoration')
    model.now.wispsPass = model.now.pass
  }
  const secondsSinceLastShown = model.now.wispsShownAtSeconds === null ? 0 : Math.min(longestWispStepSeconds, Math.max(0, timeSeconds - model.now.wispsShownAtSeconds))
  model.now.wispsShownAtSeconds = timeSeconds
  model.wisps.showLook(wispsLookOf(toTheEyes !== null ? model.steamLook.drawnToTheEyes : model.now.isHeldInView ? model.steamLook.heldInView : model.steamLook.inRoom))
  const scale = model.root.scale.x * model.look.steamPuffSizeShare
  model.wisps.advance(secondsSinceLastShown, timeSeconds, steamSources.map((position) => ({ position, wispsPerSecond, lean: toTheEyes === null ? straightUp : steamRisingTo(position, toTheEyes), scale })))
}

function wispsLookOf(steam: THREE.Material): WispsLook {
  const colour = steam instanceof THREE.MeshBasicMaterial || steam instanceof THREE.MeshStandardMaterial ? steam.color : new THREE.Color('#ffffff')
  return { colour, opacity: steam.opacity * wispOpacityShareOfTheSteam }
}

export function shareOfSteamLeftAt(rise: number): number {
  return Math.min(1, rise / steamAppearsOverShareOfItsRise) * (1 - rise) ** 2
}

function steamRisingTo(source: THREE.Vector3, toTheEyes: SteamDrawnToTheEyes): THREE.Vector3 {
  const towardTheEyes = toTheEyes.eyes.clone().sub(source).normalize()
  return new THREE.Vector3(0, 1, 0).lerp(towardTheEyes, toTheEyes.share).normalize()
}

function showLeaves(model: CarriedModel, holder: THREE.Group, scene: CarriedItemsScene): void {
  const looseLeaves = model.look.looseLeaves
  if (looseLeaves === null) return
  const { teaId, fillShare } = scene.view.looseLeavesByItem[model.itemId] ?? noLooseLeaves
  if (model.now.leaves === null || model.now.leaves.teaId !== teaId) {
    if (model.now.leaves !== null) holder.remove(model.now.leaves.pile.mesh)
    const pile = new LeafPile(teaLookFor(teaId), looseLeaves.pile, model.leafMaterial)
    roomLayers.putOnLayer(pile.mesh, model.now.pass, model.now.role)
    pile.mesh.userData = { ...holder.userData }
    holder.add(pile.mesh)
    model.now.leaves = { pile, teaId }
  }
  model.now.leaves.pile.showFill(fillShare)
  holder.position.y = looseLeaves.heapStartsAt.y + heapLiftedByTheLiquid(model, looseLeaves, fillShare, scene.view.vessels[model.itemId])
}

function heapLiftedByTheLiquid(model: CarriedModel, looseLeaves: LooseLeavesLook, fillShare: number, vessel: VesselView | undefined): number {
  if (vessel === undefined || vessel.fillShare <= 0 || model.vessel === null) return 0
  const heapTop = looseLeaves.heapStartsAt.y + fillShare * looseLeaves.pile.heightMetres
  return Math.max(0, liquidLevelIn(model.vessel.profile, vessel.fillShare).heightMetres - heapTop)
}

function showLiquid(model: CarriedModel, vessel: VesselView, wave: Wave, inflow: DyeInflow | null, timeSeconds: number): void {
  const liquidParts = model.vessel?.liquid ?? null
  if (model.liquid === null || model.liquidMaterial === null || model.vessel === null || liquidParts === null) return
  model.liquid.visible = vessel.fillShare > 0 && vessel.isLidOpen !== false
  const { heightMetres: surfaceHeight, radiusMetres } = liquidLevelIn(model.vessel.profile, vessel.fillShare)
  model.liquid.position.y = surfaceHeight + (vessel.fillShare > 0 ? wave.riseMetres : 0)
  model.liquid.rotation.set(-Math.PI / 2 + wave.tiltXRadians, 0, wave.tiltZRadians)
  model.liquid.scale.setScalar(radiusMetres)
  const surfaceColour = new THREE.Color(vessel.liquorColour)
  if (liquidParts.tint !== null) surfaceColour.multiply(liquidParts.tint)
  showTheDye(model, vessel, surfaceColour, inflow === null ? null : { ...inflow, colour: liquidParts.tint === null ? inflow.colour : inflow.colour.clone().multiply(liquidParts.tint) }, timeSeconds)
  model.liquidMaterial.color.set(model.dye === null ? surfaceColour : whiteUnderTheDye)
  model.liquidMaterial.opacity = vessel.liquorOpacity
  if (model.liquidMaterial instanceof THREE.MeshPhysicalMaterial) model.liquidMaterial.iridescence = vessel.brewStage === 'tar' ? oilySheenOfTar : 0
  if (model.liquidVolume !== null) showLiquidVolume(model, model.liquidVolume, surfaceHeight, vessel, surfaceColour)
}

function showTheDye(model: CarriedModel, vessel: VesselView, surfaceColour: THREE.Color, inflow: DyeInflow | null, timeSeconds: number): void {
  const dye = model.dye
  if (dye === null) return
  if (vessel.fillShare <= 0) {
    model.now.isTheDyeFilled = false
    return
  }
  if (!model.now.isTheDyeFilled) {
    dye.fillWith(surfaceColour)
    model.now.isTheDyeFilled = true
    model.now.dyeShownAtSeconds = timeSeconds
  }
  const seconds = model.now.dyeShownAtSeconds === null ? 0 : Math.min(longestDyeStepSeconds, Math.max(0, timeSeconds - model.now.dyeShownAtSeconds))
  model.now.dyeShownAtSeconds = timeSeconds
  dye.advance(seconds, timeSeconds, surfaceColour, [...(inflow === null ? [] : [inflow]), ...seepingFromTheLeaves(model, vessel, surfaceColour)], agitationByMotion[vessel.surfaceMotion])
}

function seepingFromTheLeaves(model: CarriedModel, vessel: VesselView, surfaceColour: THREE.Color): DyeInflow[] {
  const strength = vessel.soakedLeaves === null ? 0 : seepingFromTheLeavesByBrewStage[vessel.brewStage]
  if (strength <= 0) return []
  const turn = model.now.soakedLeavesTurn?.radians ?? 0
  const colour = surfaceColour.clone().multiplyScalar(seepingColourShareOfTheTea)
  return Array.from({ length: seepingSpotsAroundTheLeaves }, (_, index) => {
    const angle = turn + (2 * Math.PI * index) / seepingSpotsAroundTheLeaves
    return { u: 0.5 + Math.cos(angle) * seepingSpotsFromTheMiddleShare, v: 0.5 + Math.sin(angle) * seepingSpotsFromTheMiddleShare, colour, strength, warmth: warmthOfWhatSeepsFromTheLeaves, pushU: 0, pushV: 0 }
  })
}

function showLiquidVolume(model: CarriedModel, volume: THREE.Mesh, surfaceHeight: number, vessel: VesselView, surfaceColour: THREE.Color): void {
  volume.visible = vessel.fillShare > 0
  if (volume.material instanceof THREE.MeshStandardMaterial) volume.material.color.copy(surfaceColour)
  const volumeAt = model.vessel?.liquid?.volumeAt ?? null
  if (!volume.visible || volumeAt === null || model.now.liquidVolumeHeight === surfaceHeight) return
  model.now.liquidVolumeHeight = surfaceHeight
  volume.geometry.dispose()
  volume.geometry = volumeAt(surfaceHeight)
}

function showSoakedLeaves(model: CarriedModel, holder: THREE.Group, vessel: VesselView, wave: Wave, timeSeconds: number): void {
  const soaked = vessel.soakedLeaves
  const soakedLook = model.look.soakedLeaves
  const isInsideShown = soakedLook?.areSeenOnlyUnderAnOpenLid === true ? vessel.isLidOpen === true : true
  holder.visible = soaked !== null && soakedLook !== null && isInsideShown
  if (soaked === null || soakedLook === null || !holder.visible) return
  if (model.now.soakedLeaves === null || model.now.soakedLeaves.teaId !== soaked.teaId) {
    if (model.now.soakedLeaves !== null) holder.remove(model.now.soakedLeaves.pile.mesh)
    const pile = new LeafPile(teaLookFor(soaked.teaId), soakedLook.pile, model.leafMaterial)
    roomLayers.putOnLayer(pile.mesh, model.now.pass, model.now.role)
    holder.add(pile.mesh)
    model.now.soakedLeaves = { pile, teaId: soaked.teaId }
  }
  model.now.soakedLeaves.pile.showFill(soaked.count / mostSoakedLeavesShown)
  const waterRise = vessel.fillShare > 0 ? wave.riseMetres : 0
  holder.position.y = soakedLook.floatHeightAt(vessel.fillShare) + waterRise + leavesAboveTheWaterMetres
  holder.rotation.set(wave.tiltXRadians, soakedLeavesTurnedBy(model, vessel.surfaceMotion, timeSeconds), wave.tiltZRadians)
  const spreadShare = soakedLook.spreadShareAt(vessel.fillShare)
  holder.scale.set(spreadShare, 1, spreadShare)
}

function soakedLeavesTurnedBy(model: CarriedModel, motion: SurfaceMotion, timeSeconds: number): number {
  const turn = model.now.soakedLeavesTurn ?? { radians: 0, atSeconds: timeSeconds }
  const radians = turn.radians + Math.max(0, timeSeconds - turn.atSeconds) * leavesDriftRadiansPerSecondByMotion[motion]
  model.now.soakedLeavesTurn = { radians, atSeconds: timeSeconds }
  return radians
}

function steamSourcesOf(model: CarriedModel, isOpenToTheAir: boolean): THREE.Vector3[] {
  const aboveTheOpening = model.root.localToWorld(new THREE.Vector3(0, openingHeightOf(model) + steamStartsAboveTheOpeningMetres, 0))
  const spoutTip = model.vessel?.spoutTip ?? null
  const aboveTheSpout = spoutTip === null || !model.look.steamRisesAboveTheSpout ? [] : [model.root.localToWorld(spoutTip.clone()).add(new THREE.Vector3(0, steamStartsAboveTheSpoutMetres, 0))]
  return [...aboveTheSpout, ...(isOpenToTheAir ? [aboveTheOpening] : [])]
}

export function openingHeightOf(model: CarriedModel): number {
  return model.vessel === null ? model.heightMetres : openingOf(model.vessel.profile).heightMetres
}

function placeLid(model: CarriedModel, lid: THREE.Object3D, isOpen: boolean, lyingOffset: FloorPoint | null, lidRadiusMetres: number): void {
  lid.position.copy(model.lidClosedPosition)
  lid.rotation.set(0, 0, 0)
  if (!isOpen) return
  if (lyingOffset !== null) {
    lid.position.set(lyingOffset.x, model.lidOriginAboveItsLowestPointMetres, lyingOffset.z)
    return
  }
  lid.position.x -= lidRadiusMetres * (1 - Math.cos(openLidSwungPastUprightRadians))
  lid.position.y += lidRadiusMetres * Math.sin(openLidSwungPastUprightRadians)
  lid.rotation.z = openLidSwungPastUprightRadians
}
