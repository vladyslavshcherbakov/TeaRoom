import * as THREE from 'three'
import { itemLocationIn } from '../../../../../Shared/GameLogic/GameLogic.ts'
import { isTheLidOpen, layoutOf } from '../../CarriedShapes.ts'
import type { LyingLid } from '../../Placement.ts'
import { turnedBy } from '../../RoomLayout.ts'
import type { FloorPoint } from '../../../../Engine/Points.ts'
import { mostSoakedLeavesShown } from '../../../Presentation/WorldPresenter.ts'
import { teaLookFor } from '../../../Presentation/TeaLooks.ts'
import type { LooseLeavesView, SteamLevel, SurfaceMotion, VesselView } from '../../../Presentation/WorldViewState.ts'
import type { CarriedItemsScene } from './CarriedItemsScene.ts'
import type { LooseLeavesLook } from './CarriedShapeLook.ts'
import { mostPuffsFromOneSource, type CarriedModel, type PuffTrail } from './CarriedModel.ts'
import { LeafPile } from './LeafPile.ts'
import { roomLayers } from '../RoomLayers.ts'
import { stillWater, waveAt, type Wave } from './Wave.ts'
import { liquidLevelIn, openingOf } from './VesselProfile.ts'

type SteamDrawnToTheEyes = {
  readonly eyes: THREE.Vector3
  readonly share: number
}

const openLidSwungPastUprightRadians = (105 * Math.PI) / 180
const steamRiseMetresPerSecond = 0.2
const steamColumnMetres = 0.12
const steamStartsAboveTheOpeningMetres = 0.04
const steamStartsAboveTheSpoutMetres = 0.02
const smallestPuffScale = 0.6
const sipPuffCrossingsPerSecond = 0.38
const steamAppearsOverShareOfItsRise = 0.12
const leftBehindPuffFadesInSeconds = 0.8
const puffsBySteam: Readonly<Record<SteamLevel, number>> = { none: 0, wisps: 1, visible: 2, billowing: mostPuffsFromOneSource }
const leavesAboveTheWaterMetres = 0.0015
const oilySheenOfTar = 0.9
const leavesDriftRadiansPerSecondByMotion: Readonly<Record<SurfaceMotion, number>> = { still: 0.05, shimmering: 0.08, simmering: 0.25, boiling: 0.9 }
const noLooseLeaves: LooseLeavesView = { teaId: null, fillShare: 0 }

export function showContentsOf(model: CarriedModel, scene: CarriedItemsScene, lidsLyingOpen: readonly LyingLid[]): void {
  const vessel = scene.view.vessels[model.itemId]
  const isOpen = isTheLidOpen(scene.state, model.itemId)
  const lyingLidOffsetInTheRoom = lidsLyingOpen.find((lid) => lid.itemId === model.itemId)?.offset ?? null
  const lyingLidOffset = lyingLidOffsetInTheRoom === null ? null : turnedBy(lyingLidOffsetInTheRoom, -model.root.rotation.y)
  if (model.lid !== null) placeLid(model, model.lid, isOpen, lyingLidOffset, layoutOf(scene.state, model.itemId)?.lid?.lyingRadiusMetres ?? 0)
  const wave = vessel === undefined ? stillWater : waveAt(vessel.surfaceMotion, scene.timeSeconds)
  if (model.liquid !== null && model.liquidMaterial !== null && vessel !== undefined) showLiquid(model, vessel, wave)
  for (const display of model.displays) display({ vessel, cloth: scene.view.cloths[model.itemId], wave, temperatureUnit: scene.temperatureUnitShown })
  if (model.soakedLeafHolder !== null && vessel !== undefined) showSoakedLeaves(model, model.soakedLeafHolder, vessel, wave, scene.timeSeconds)
  if (model.leafHolder !== null) showLeaves(model, model.leafHolder, scene)
  const puffsPerSource = vessel === undefined || !model.root.visible || model.now.pass === 'inspected' ? 0 : puffsBySteam[vessel.steam]
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
  return JSON.stringify({ pass: model.now.pass, location, isChosen })
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
    if (!trail.isOut || rise < trail.lastRise) releaseThePuff(model, puff, trail, source, new THREE.Vector3(0, 1, 0), steamColumnMetres * model.root.scale.x, model.now.isHeldInView ? model.steamLook.heldInView : model.steamLook.inRoom, whereTheVesselIs)
    showThePuff(model, puff, trail, rise, timeSeconds, whereTheVesselIs)
  })
}

function showSipSteam(model: CarriedModel, sipPuffCount: number, timeSeconds: number, toTheEyes: SteamDrawnToTheEyes | null, whereTheVesselIs: string): void {
  if (toTheEyes !== null && model.now.sipSteamStartedAtSeconds === null) model.now.sipSteamStartedAtSeconds = timeSeconds
  const startedAtSeconds = model.now.sipSteamStartedAtSeconds
  if (startedAtSeconds === null) return
  const crossings = (timeSeconds - startedAtSeconds) * sipPuffCrossingsPerSecond
  const opening = model.root.localToWorld(new THREE.Vector3(0, openingHeightOf(model) + steamStartsAboveTheOpeningMetres, 0))
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
  if (toTheEyes === null && model.sipPuffTrails.every((trail) => !trail.isOut)) model.now.sipSteamStartedAtSeconds = null
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
  roomLayers.putOnLayer(puff, model.now.pass, 'decoration')
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

function showLiquid(model: CarriedModel, vessel: VesselView, wave: Wave): void {
  const liquidParts = model.vessel?.liquid ?? null
  if (model.liquid === null || model.liquidMaterial === null || model.vessel === null || liquidParts === null) return
  model.liquid.visible = vessel.fillShare > 0 && vessel.isLidOpen !== false
  const { heightMetres: surfaceHeight, radiusMetres } = liquidLevelIn(model.vessel.profile, vessel.fillShare)
  model.liquid.position.y = surfaceHeight + (vessel.fillShare > 0 ? wave.riseMetres : 0)
  model.liquid.rotation.set(-Math.PI / 2 + wave.tiltXRadians, 0, wave.tiltZRadians)
  model.liquid.scale.setScalar(radiusMetres)
  model.liquidMaterial.color.set(vessel.liquorColour)
  if (liquidParts.tint !== null) model.liquidMaterial.color.multiply(liquidParts.tint)
  model.liquidMaterial.opacity = vessel.liquorOpacity
  if (model.liquidMaterial instanceof THREE.MeshPhysicalMaterial) model.liquidMaterial.iridescence = vessel.brewStage === 'tar' ? oilySheenOfTar : 0
  if (model.liquidVolume !== null) showLiquidVolume(model, model.liquidVolume, surfaceHeight, vessel)
}

function showLiquidVolume(model: CarriedModel, volume: THREE.Mesh, surfaceHeight: number, vessel: VesselView): void {
  volume.visible = vessel.fillShare > 0
  if (volume.material instanceof THREE.MeshStandardMaterial && model.liquidMaterial !== null) volume.material.color.copy(model.liquidMaterial.color)
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

function openingHeightOf(model: CarriedModel): number {
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
