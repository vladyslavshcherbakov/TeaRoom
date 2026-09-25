import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { definitionIn, type Catalog } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import { carriedItemIdsIn } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { RitualSession } from '../../../Shared/Simulation/Ritual/RitualSession.ts'
import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import { sessionStateVersion } from '../../../Shared/Simulation/State/FittedSavedState.ts'
import type { SessionState } from '../../../Shared/Simulation/State/SessionState.ts'
import { tableViewState } from '../Table/TablePresenter.ts'
import {
  cameraFieldOfViewDegrees,
  closeUpPose,
  overviewPose,
  poseEasedTowards,
  zoomedPose,
} from './Camera/CameraPoses.ts'
import { CameraZoom } from './Camera/CameraZoom.ts'
import { firstPersonFieldOfViewDegrees, firstPersonPose, lookTurnedBy, lookTurnedTowards, stepFor, type FirstPersonLook, type StickDeflection } from './Camera/FirstPersonLook.ts'
import { RoomGestures, type ScreenPoint } from './RoomGestures.ts'
import { carriedShapeOf, type ShapedItem } from './CarriedShapes.ts'
import { furnitureWithId, type CameraPose, type FloorPoint } from './RoomLayout.ts'
import type { RoomLog, RoomPlace } from './RoomNavigator.ts'
import { RoomPlay, type RitualPort, type RoomTapTarget } from './RoomPlay.ts'
import { RoomTexts } from './RoomTexts.ts'
import type { CoatColour, RoomSettings } from './RoomSettings.ts'
import { SettingsStore } from './SettingsStore.ts'
import { SettingsScreen } from './Views/SettingsScreen.ts'
import { FrameRateCounter } from './Views/FrameRateCounter.ts'
import { Achievements } from './Achievements.ts'
import { AchievementStore } from './AchievementStore.ts'
import { AchievementNotice } from './Views/AchievementNotice.ts'
import { AchievementsList } from './Views/AchievementsList.ts'
import { tapTargetAmong } from './TapTargetAmong.ts'
import { savedVisitVersion, type SavedCamera, type VisitStore } from './VisitStore.ts'
import { CarriedItems } from './Views/CarriedItems.ts'
import { Garden } from './Views/Garden.ts'
import { roomLayers } from './Views/RoomLayers.ts'
import { daylightAt, hoursSinceSunriseFor } from './Sky/DaylightCycle.ts'
import { DebugMenu, type CameraMode, type StickLayout } from './Views/DebugMenu.ts'
import { Joysticks } from './Views/Joysticks.ts'
import { Sky } from './Views/Sky.ts'
import { isWalking } from './Walking/Walk.ts'
import { RoomCaption } from './Views/RoomCaption.ts'
import { YouDiedScreen } from './Views/YouDiedScreen.ts'
import { RoomLights } from './Views/RoomLights.ts'
import { RoomMaterials } from './Views/RoomMaterials.ts'
import { RoomModel, type TapTargetTag } from './Views/RoomModel.ts'
import { PourControls } from './Views/PourControls.ts'
import { SipButton } from './Views/SipButton.ts'
import { WalkerModel } from './Views/WalkerModel.ts'

const backgroundColour = '#f6e9d6'
const longestFrameSeconds = 0.1
const aimPlaneAboveTargetMetres = 0.3
const smallestUpwardNormalOfASurface = 0.7
const reflectionsBlurSigma = 0.04
const transmissionResolutionShare = 0.5
const firstPersonSettleSeconds = 1.5
const fieldOfViewSettleSeconds = 0.35
const secondsBetweenKeepingTheVisit = 2
const ambientOcclusionRadiusMetres = 0.35
const ambientOcclusionStrength = 0.85

export type RoomArrival = {
  readonly place: RoomPlace
  readonly camera: SavedCamera | null
  readonly events: readonly RitualEvent[]
  readonly notice: string | null
  readonly continuesAVisit: boolean
}

export class RoomScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(cameraFieldOfViewDegrees, 1, 0.1, 100)
  private readonly raycaster = newRaycasterSeeingEveryLayer()
  private readonly clock = new THREE.Clock()
  private readonly session: RitualSession
  private readonly catalog: Catalog
  private readonly log: RoomLog
  private readonly texts: RoomTexts
  private readonly visitStore: VisitStore
  private readonly shareThroughTheTimeOfDay: number
  private readonly play: RoomPlay
  private readonly room: RoomModel
  private readonly walker: WalkerModel
  private readonly settingsStore: SettingsStore
  private readonly settingsScreen: SettingsScreen
  private readonly frameRateCounter: FrameRateCounter
  private settings: RoomSettings
  private softShadowsInCorners: EffectComposer | null = null
  private readonly carried: CarriedItems
  private readonly sipButton: SipButton
  private readonly pourControls: PourControls
  private readonly caption: RoomCaption
  private readonly achievements: Achievements
  private readonly achievementsList: AchievementsList
  private readonly achievementNotice: AchievementNotice
  private readonly debugMenu: DebugMenu
  private readonly youDied: YouDiedScreen
  private readonly joysticks: Joysticks
  private readonly garden: Garden
  private readonly sky = new Sky()
  private readonly zoom = new CameraZoom()
  private readonly gestures: RoomGestures
  private readonly roomLights = new RoomLights()
  private cameraPose: CameraPose
  private cameraMode: CameraMode = 'room'
  private stickLayout: StickLayout = 'walkOnTheLeft'
  private wasFirstPersonView = false
  private firstPersonSettlesAtSeconds = 0
  private look: FirstPersonLook = { headingRadians: Math.PI, pitchRadians: 0 }
  private shadowPoseLastDrawn = ''
  private secondsSinceTheVisitWasKept = 0
  private hasTheKeeperDied = false

  constructor(container: HTMLElement, session: RitualSession, catalog: Catalog, log: RoomLog, voiceSeed: number, shareThroughTheTimeOfDay: number, heaterItemsBeforeTheTesterJoke: number, arrival: RoomArrival, visitStore: VisitStore) {
    this.session = session
    this.catalog = catalog
    this.log = log
    this.texts = new RoomTexts(voiceSeed, log)
    this.visitStore = visitStore
    if (arrival.camera !== null) this.restoreTheCamera(arrival.camera)
    this.shareThroughTheTimeOfDay = shareThroughTheTimeOfDay
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.shadowMap.autoUpdate = false
    this.renderer.transmissionResolutionScale = transmissionResolutionShare
    this.renderer.autoClear = false
    this.renderer.setClearColor(backgroundColour)
    container.append(this.renderer.domElement)
    const ritual: RitualPort = {
      get state() {
        return session.state
      },
      dispatch: (command) => this.reactTo(session.dispatch(command)),
    }
    this.play = new RoomPlay(ritual, catalog, log, heaterItemsBeforeTheTesterJoke, {
      remarked: (remark) => {
        this.achievements.remarked(remark.kind)
        this.caption.show(this.texts.remarkLines(remark))
      },
      debugMenuAsked: () => {
        this.achievements.roseBushTappedTenTimes()
        this.debugMenu.open({ cameraMode: this.cameraMode, stickLayout: this.stickLayout })
      },
      achievementsAsked: () => this.achievementsList.show(this.achievements.unlocked),
      settingsAsked: () => this.settingsScreen.show(this.settings),
      mayGrowAMiddleHand: () => !this.achievements.unlocked.has('shiva'),
      keeperDied: () => {
        this.hasTheKeeperDied = true
        this.achievements.keeperDied()
        this.visitStore.forget('the keeper died, so the next visit starts anew')
        this.caption.hide()
        this.youDied.show(this.texts.lastWordsLine(), this.texts.obituaryLine())
      },
    }, arrival.place)
    this.gestures = new RoomGestures(this.play, this.zoom, { tapTargetAt: (point) => this.tapTargetAt(point), aimPointAt: (point) => this.aimPlanePointAt(point) }, log)
    const materials = new RoomMaterials(reflectionsOfTheRoom(this.renderer))
    const roomDefinition = definitionIn(catalog, 'rooms', session.state.roomId)
    this.room = new RoomModel(materials, roomDefinition.heaterSpot)
    this.walker = new WalkerModel(materials)
    this.carried = new CarriedItems(materials, shapedItemsIn(session.state, log), roomDefinition.tap?.sinkSpot ?? null, roomDefinition.heaterSpot)
    this.sipButton = new SipButton(container, () => this.play.sipTapped())
    this.pourControls = new PourControls(container, {
      tiltPressed: () => this.play.tiltPressed(),
      tiltReleased: () => this.play.tiltReleased(),
    })
    this.caption = new RoomCaption(container)
    this.achievementNotice = new AchievementNotice(container)
    this.achievements = new Achievements(new AchievementStore(log), log, (id) => this.achievementNotice.announce(id))
    this.achievementsList = new AchievementsList(container, { resetAsked: () => this.achievements.reset() })
    this.youDied = new YouDiedScreen(container, () => {
      log('the player starts over after dying')
      location.reload()
    })
    this.joysticks = new Joysticks(container)
    this.debugMenu = new DebugMenu(container, { cameraModeChosen: (mode) => this.cameraModeChosen(mode), stickLayoutChosen: (layout) => this.stickLayoutChosen(layout) })
    this.garden = new Garden(materials)
    this.scene.add(this.room.root, this.garden.root, this.sky.root, this.walker.root, this.carried.root, ...this.roomLights.lights)
    this.settingsStore = new SettingsStore(log)
    this.settings = this.settingsStore.load()
    this.settingsScreen = new SettingsScreen(container, { coatColourChosen: (colour) => this.coatColourChosen(colour), softShadowsInCornersChosen: (isOn) => this.softShadowsInCornersChosen(isOn), frameRateShownChosen: (isShown) => this.frameRateShownChosen(isShown) })
    this.frameRateCounter = new FrameRateCounter(container)
    this.frameRateCounter.show(this.settings.isFrameRateShown)
    this.walker.paintTheBody(this.settings.coatColour)
    this.fitToWindow()
    this.showSoftShadowsInCorners(this.settings.hasSoftShadowsInCorners)
    this.cameraPose = overviewPose(this.play.walk.position, this.camera.aspect)
    this.listenToPresses()
    window.addEventListener('resize', () => this.fitToWindow())
    this.keepTheVisitWhenThePageIsLeft()
    this.caption.show([...this.texts.captionLinesFor(arrival.events, session.state.elapsedSeconds), ...(arrival.notice === null ? [] : [arrival.notice])])
    this.achievements.visitBegun(arrival.continuesAVisit)
    this.achievements.eventsHappened(arrival.events, session.state)
    this.renderer.setAnimationLoop(() => this.frame())
  }

  private frame(): void {
    const secondsSinceTheLastFrame = this.clock.getDelta()
    this.frameRateCounter.frameDrawn(secondsSinceTheLastFrame)
    const seconds = Math.min(secondsSinceTheLastFrame, longestFrameSeconds)
    this.walkAndLookInFirstPerson(seconds)
    this.play.advance(seconds)
    this.reactTo(this.session.advance(seconds))
    this.caption.advance(seconds)
    this.achievements.worldAdvanced(this.session.state)
    this.achievementNotice.advance(seconds)
    this.keepTheVisitNowAndThen(seconds)
    const daylight = daylightAt(hoursSinceSunriseFor(this.session.state.atmosphere.timeOfDay, this.shareThroughTheTimeOfDay))
    this.roomLights.show(daylight)
    const isFirstPerson = this.cameraMode === 'firstPerson'
    const isCloseUp = this.play.view.kind === 'closeUp'
    const isWalkerShown = !isCloseUp && !isFirstPerson
    this.walker.show(this.play.walk, this.clock.elapsedTime)
    this.walker.root.visible = isWalkerShown
    this.moveCamera(seconds)
    this.sky.show(daylight, isFirstPerson, this.camera.position)
    const state = this.session.state
    const table = tableViewState(state, this.catalog)
    const heldInView = isWalkerShown ? null : { camera: this.camera, chosenHandIndex: this.play.chosenHandIndex }
    this.carried.show({ state, table, walk: this.play.walk, heldInView, aimedPour: this.play.aimedPourView, clothOnTheTableAt: this.play.clothOnTheTableAt, timeSeconds: this.clock.elapsedTime })
    this.room.showHeater(table.isHeaterOn)
    this.room.showPuddles(table.puddles)
    const isAiming = this.play.aimedPourView !== null
    this.sipButton.show(this.play.sippableCupId !== null && !isAiming)
    this.pourControls.show(isAiming)
    this.joysticks.show(isFirstPerson && !isCloseUp && !isAiming)
    this.render()
  }

  private walkAndLookInFirstPerson(seconds: number): void {
    if (this.cameraMode !== 'firstPerson' || this.play.view.kind === 'closeUp') return
    const walk = this.play.walk
    if (isWalking(walk)) this.look = lookTurnedTowards(this.look, walk.headingRadians, seconds)
    this.look = lookTurnedBy(this.look, this.lookStick(), seconds)
    const stick = this.walkStick()
    if (stick.right === 0 && stick.up === 0) return this.play.stopWalkingFreely()
    this.play.walkFreely(stepFor(stick, this.look.headingRadians, seconds), this.look.headingRadians)
  }

  private walkStick(): StickDeflection {
    return this.stickLayout === 'walkOnTheLeft' ? this.joysticks.left : this.joysticks.right
  }

  private lookStick(): StickDeflection {
    return this.stickLayout === 'walkOnTheLeft' ? this.joysticks.right : this.joysticks.left
  }

  private restoreTheCamera(camera: SavedCamera): void {
    this.cameraMode = camera.mode
    this.stickLayout = camera.stickLayout
    this.look = camera.look
    this.log(`the camera is back in ${camera.mode} mode with the sticks laid out as ${camera.stickLayout}, as the visit left it`)
  }

  private keepTheVisitWhenThePageIsLeft(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.keepTheVisit('the page was hidden')
    })
    window.addEventListener('pagehide', () => this.keepTheVisit('the page was left'))
  }

  private keepTheVisitNowAndThen(seconds: number): void {
    this.secondsSinceTheVisitWasKept += seconds
    if (this.secondsSinceTheVisitWasKept < secondsBetweenKeepingTheVisit) return
    this.keepTheVisit(null)
  }

  private keepTheVisit(reason: string | null): void {
    this.secondsSinceTheVisitWasKept = 0
    if (this.hasTheKeeperDied) return
    this.visitStore.keep({
      savedVisitVersion,
      sessionStateVersion,
      savedAtMilliseconds: Date.now(),
      ritual: this.session.state,
      place: this.play.place,
      camera: { mode: this.cameraMode, stickLayout: this.stickLayout, look: this.look },
    })
    if (reason !== null) this.log(`the visit is saved because ${reason}`)
  }

  private coatColourChosen(colour: CoatColour): void {
    this.settings = { ...this.settings, coatColour: colour }
    this.settingsStore.keep(this.settings)
    this.walker.paintTheBody(colour)
    this.log(`the body is painted ${colour} from the settings`)
  }

  private softShadowsInCornersChosen(isOn: boolean): void {
    this.settings = { ...this.settings, hasSoftShadowsInCorners: isOn }
    this.settingsStore.keep(this.settings)
    this.showSoftShadowsInCorners(isOn)
    this.log(`soft shadows in corners are turned ${isOn ? 'on' : 'off'} from the settings`)
  }

  private frameRateShownChosen(isShown: boolean): void {
    this.settings = { ...this.settings, isFrameRateShown: isShown }
    this.settingsStore.keep(this.settings)
    this.frameRateCounter.show(isShown)
    this.log(`the frame rate is ${isShown ? 'shown' : 'hidden'} from the settings`)
  }

  private showSoftShadowsInCorners(isOn: boolean): void {
    this.softShadowsInCorners?.dispose()
    this.softShadowsInCorners = isOn ? softShadowsInCornersOf(this.renderer, this.scene, this.camera) : null
  }

  private stickLayoutChosen(layout: StickLayout): void {
    this.stickLayout = layout
    this.log(`the sticks are laid out as ${layout} from the debug menu`)
  }

  private cameraModeChosen(mode: CameraMode): void {
    this.cameraMode = mode
    this.log(`the camera switched to ${mode} from the debug menu`)
    if (mode === 'firstPerson') this.look = { headingRadians: this.play.walk.headingRadians, pitchRadians: 0 }
    else this.play.stopWalkingFreely()
  }

  private moveCamera(seconds: number): void {
    this.zoom.viewShown(this.play.view)
    const isFirstPersonView = this.cameraMode === 'firstPerson' && this.play.view.kind !== 'closeUp'
    if (isFirstPersonView && !this.wasFirstPersonView) this.firstPersonSettlesAtSeconds = this.clock.elapsedTime + firstPersonSettleSeconds
    this.wasFirstPersonView = isFirstPersonView
    this.showFieldOfView(isFirstPersonView ? firstPersonFieldOfViewDegrees : cameraFieldOfViewDegrees, seconds)
    const goal = isFirstPersonView ? this.cameraGoal() : zoomedPose(this.cameraGoal(), this.zoom.distanceShare)
    const isSettled = isFirstPersonView && this.clock.elapsedTime >= this.firstPersonSettlesAtSeconds
    this.cameraPose = isSettled ? goal : poseEasedTowards(this.cameraPose, goal, seconds)
    this.camera.position.set(this.cameraPose.position.x, this.cameraPose.position.y, this.cameraPose.position.z)
    this.camera.lookAt(this.cameraPose.target.x, this.cameraPose.target.y, this.cameraPose.target.z)
    this.camera.updateMatrixWorld()
  }

  private showFieldOfView(degrees: number, seconds: number): void {
    if (this.camera.fov === degrees) return
    const share = 1 - Math.exp(-seconds / fieldOfViewSettleSeconds)
    this.camera.fov = Math.abs(degrees - this.camera.fov) < 0.05 ? degrees : this.camera.fov + (degrees - this.camera.fov) * share
    this.camera.updateProjectionMatrix()
  }

  private render(): void {
    const shadowPose = `${this.roomLights.sunPose} | ${this.walker.shadowPose} | ${this.carried.shadowCastersPose()}`
    this.renderer.shadowMap.needsUpdate = shadowPose !== this.shadowPoseLastDrawn
    this.shadowPoseLastDrawn = shadowPose
    this.renderer.clear()
    this.camera.layers.set(roomLayers.room)
    this.camera.layers.enable(roomLayers.untappableRoom)
    if (this.softShadowsInCorners !== null) this.softShadowsInCorners.render()
    else this.renderer.render(this.scene, this.camera)
    this.renderer.clearDepth()
    this.camera.layers.set(roomLayers.heldInView)
    this.renderer.render(this.scene, this.camera)
    this.camera.layers.set(roomLayers.room)
  }

  private reactTo(events: readonly RitualEvent[]): readonly RitualEvent[] {
    this.caption.show(this.texts.captionLinesFor(events, this.session.state.elapsedSeconds))
    this.achievements.eventsHappened(events, this.session.state)
    return events
  }

  private cameraGoal(): CameraPose {
    const view = this.play.view
    if (view.kind === 'closeUp') return closeUpPose(furnitureWithId(view.furnitureId).closeUp, this.camera.aspect)
    if (this.cameraMode === 'firstPerson') return firstPersonPose(this.play.walk.position, this.look)
    return overviewPose(this.play.walk.position, this.camera.aspect)
  }

  private listenToPresses(): void {
    const canvas = this.renderer.domElement
    canvas.addEventListener('pointerdown', (event) => this.gestures.fingerDown(event.pointerId, { x: event.clientX, y: event.clientY }))
    canvas.addEventListener('pointermove', (event) => this.gestures.fingerMoved(event.pointerId, { x: event.clientX, y: event.clientY }))
    canvas.addEventListener('pointerup', (event) => this.gestures.fingerUp(event.pointerId))
    canvas.addEventListener('pointercancel', (event) => this.gestures.fingerUp(event.pointerId))
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault()
      this.gestures.wheelTurned(event.deltaY)
    }, { passive: false })
    for (const safariGesture of ['gesturestart', 'gesturechange']) document.addEventListener(safariGesture, (event) => event.preventDefault())
  }

  private aimPlanePointAt(point: ScreenPoint): FloorPoint {
    this.raycaster.setFromCamera(this.pointerAt(point), this.camera)
    const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.aimPlaneHeight())
    const hit = this.raycaster.ray.intersectPlane(aimPlane, new THREE.Vector3())
    return hit === null ? { x: 0, z: 0 } : { x: hit.x, z: hit.z }
  }

  private aimPlaneHeight(): number {
    const targetId = this.play.aimedPourView?.targetId
    const location = targetId === undefined ? undefined : this.session.state.vessels[targetId]?.location
    return (location?.kind === 'onSurface' ? location.spot.y : 0) + aimPlaneAboveTargetMetres
  }

  private pointerAt(point: ScreenPoint): THREE.Vector2 {
    const bounds = this.renderer.domElement.getBoundingClientRect()
    return new THREE.Vector2(((point.x - bounds.left) / bounds.width) * 2 - 1, -((point.y - bounds.top) / bounds.height) * 2 + 1)
  }

  private tapTargetAt(point: ScreenPoint): RoomTapTarget {
    this.raycaster.setFromCamera(this.pointerAt(point), this.camera)
    const tappable = [...this.room.tappableMeshes, ...this.carried.tappableMeshes, ...this.garden.tappableMeshes]
    const hits = this.raycaster.intersectObjects(tappable, true).filter((hit) => isShown(hit.object))
    const nearestFirst = hits.map((hit) => ({ target: tapTargetOf(hit), isForgivingTouchArea: isAForgivingTouchArea(hit.object) }))
    return tapTargetAmong(nearestFirst, this.play.chosenHandIndex, (target) => this.play.canTheChosenItemActOn(target))
  }

  private fitToWindow(): void {
    const width = window.innerWidth
    const height = window.innerHeight
    this.renderer.setSize(width, height)
    this.softShadowsInCorners?.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }
}

function shapedItemsIn(state: DeepReadonly<SessionState>, log: RoomLog): ShapedItem[] {
  const itemIds = carriedItemIdsIn(state)
  const itemIdsWithoutAShape = itemIds.filter((itemId) => carriedShapeOf(state, itemId) === undefined)
  if (itemIdsWithoutAShape.length > 0) {
    const problem = `the room layout has no shape for ${itemIdsWithoutAShape.join(', ')}, so they are not drawn`
    if (import.meta.env.DEV) throw new Error(problem)
    log(problem)
  }
  return itemIds.flatMap((itemId) => {
    const shape = carriedShapeOf(state, itemId)
    return shape === undefined ? [] : [{ itemId, shape }]
  })
}

function tapTargetOf(hit: THREE.Intersection): RoomTapTarget {
  const tag = tapTargetTagOf(hit.object)
  if (tag === undefined) return { kind: 'nothing' }
  if ('itemId' in tag) return { kind: 'item', itemId: tag.itemId }
  if ('handIndex' in tag) return { kind: 'hand', handIndex: tag.handIndex }
  if ('isHeater' in tag) return { kind: 'heater' }
  if ('isHeaterSwitch' in tag) return { kind: 'heaterSwitch' }
  if ('isFaucet' in tag) return { kind: 'faucet' }
  if ('isFloor' in tag) return { kind: 'floor', point: { x: hit.point.x, z: hit.point.z } }
  if ('lidOfItemId' in tag) return { kind: 'lid', itemId: tag.lidOfItemId }
  if ('figurineId' in tag) return { kind: 'figurine', figurineId: tag.figurineId }
  if ('isRoseBush' in tag) return { kind: 'roseBush' }
  if ('isMedal' in tag) return { kind: 'medal' }
  if ('isSettingsGear' in tag) return { kind: 'settingsGear' }
  const upwardNormal = hit.face?.normal.clone().transformDirection(hit.object.matrixWorld).y ?? 0
  if (upwardNormal < smallestUpwardNormalOfASurface) return { kind: 'furniture', furnitureId: tag.furnitureId }
  return { kind: 'surface', furnitureId: tag.furnitureId, point: { x: hit.point.x, y: hit.point.y, z: hit.point.z } }
}

function isAForgivingTouchArea(object: THREE.Object3D): boolean {
  return object.userData['isForgivingTouchArea'] === true
}

function tapTargetTagOf(object: THREE.Object3D): TapTargetTag | undefined {
  let current: THREE.Object3D | null = object
  while (current !== null) {
    const tag = current.userData['tapTarget'] as TapTargetTag | undefined
    if (tag !== undefined) return tag
    current = current.parent
  }
  return undefined
}

function isShown(object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object
  while (current !== null) {
    if (!current.visible) return false
    current = current.parent
  }
  return true
}

function newRaycasterSeeingEveryLayer(): THREE.Raycaster {
  const raycaster = new THREE.Raycaster()
  raycaster.layers.enableAll()
  raycaster.layers.disable(roomLayers.untappableRoom)
  return raycaster
}

function reflectionsOfTheRoom(renderer: THREE.WebGLRenderer): THREE.Texture {
  const generator = new THREE.PMREMGenerator(renderer)
  const reflections = generator.fromScene(new RoomEnvironment(), reflectionsBlurSigma).texture
  generator.dispose()
  return reflections
}

function softShadowsInCornersOf(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): EffectComposer {
  const size = renderer.getSize(new THREE.Vector2())
  const composer = new EffectComposer(renderer)
  composer.setPixelRatio(renderer.getPixelRatio())
  composer.setSize(size.x, size.y)
  composer.addPass(new RenderPass(scene, camera))
  const ambientOcclusion = new GTAOPass(scene, camera, size.x, size.y)
  ambientOcclusion.updateGtaoMaterial({ radius: ambientOcclusionRadiusMetres })
  ambientOcclusion.blendIntensity = ambientOcclusionStrength
  composer.addPass(ambientOcclusion)
  composer.addPass(new OutputPass())
  return composer
}
