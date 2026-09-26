import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { RoomDefinition } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
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
  poseWatchingTheGears,
  zoomedPose,
} from './Camera/CameraPoses.ts'
import { CameraZoom } from './Camera/CameraZoom.ts'
import { firstPersonFieldOfViewDegrees, firstPersonPose, lookAt, lookBetween, lookTurnedBy, lookTurnedByTheMouse, lookTurnedTowards, rightOnTheFloorOf, stepFor, type FirstPersonLook, type StickDeflection } from './Camera/FirstPersonLook.ts'
import { easedSeatedShare, eyeHeightMetres, keeperHeightByDefaultCentimetres, seatedShareAfter } from './Camera/KeeperHeight.ts'
import { sticksShownFor, usesTheKeyboard, usesTheMouse, walkFromTheKeys } from './Camera/FirstPersonControls.ts'
import { KeyboardAndMouse } from './Views/KeyboardAndMouse.ts'
import { KeyboardShortcuts } from './KeyboardShortcuts.ts'
import { RoomGestures, type ScreenPoint } from './RoomGestures.ts'
import { carriedShapeOf, type ShapedItem } from './CarriedShapes.ts'
import { roomLayoutFor, type CameraPose, type FloorPoint, type RoomLayout } from './RoomLayout.ts'
import type { ClothPattern, RoomArrangement } from './RoomArrangement.ts'
import type { RoomLog, RoomPlace } from './RoomNavigator.ts'
import { RoomPlay, type RitualPort, type RoomTapTarget } from './RoomPlay.ts'
import { RoomTexts } from './RoomTexts.ts'
import type { FaceFeature, RoomSettings } from './RoomSettings.ts'
import { SettingsStore } from './SettingsStore.ts'
import { PlayTime } from './PlayTime.ts'
import { PlayTimeStore } from './PlayTimeStore.ts'
import { SettingsScreen } from './Views/SettingsScreen.ts'
import { FrameRateCounter } from './Views/FrameRateCounter.ts'
import { FullScreenButton } from './Views/FullScreenButton.ts'
import { LeaveFirstPersonButton } from './Views/LeaveFirstPersonButton.ts'
import { Achievements, achievementsOutOfReach } from './Achievements.ts'
import { AchievementStore } from './AchievementStore.ts'
import { AchievementNotice } from './Views/AchievementNotice.ts'
import { AchievementsList } from './Views/AchievementsList.ts'
import { tapTargetAmong } from './TapTargetAmong.ts'
import { savedVisitVersion, type SavedCamera, type VisitStore } from './VisitStore.ts'
import { CarriedItems } from './Views/CarriedItems.ts'
import { Garden } from './Views/Garden.ts'
import { isSeenWhole } from './Views/ProphecySighting.ts'
import { InspectionStage } from './Views/InspectionStage.ts'
import { roomLayers } from './Views/RoomLayers.ts'
import { daylightAt } from './Sky/DaylightCycle.ts'
import { hoursSinceSunriseOf } from '../../../Shared/Simulation/Judgement/TimeOfDayJudgement.ts'
import { DebugMenu } from './Views/DebugMenu.ts'
import { Joysticks } from './Views/Joysticks.ts'
import { Sky } from './Views/Sky.ts'
import { isWalking } from './Walking/Walk.ts'
import { RoomCaption } from './Views/RoomCaption.ts'
import { YouDiedScreen } from './Views/YouDiedScreen.ts'
import { RoomLights } from './Views/RoomLights.ts'
import { RoomMaterials, type BowlPaintings } from './Views/RoomMaterials.ts'
import { RoomModel, type TapTargetTag } from './Views/RoomModel.ts'
import { PourControls } from './Views/PourControls.ts'
import { SipButton } from './Views/SipButton.ts'
import { WalkerModel } from './Views/WalkerModel.ts'
import { degreesShownIn } from './Temperatures.ts'
import { RoomGlow } from './Views/RoomGlow.ts'
import { EdgeSmoothing } from './Views/EdgeSmoothing.ts'
import { FrameBudget } from './FrameBudget.ts'
import { FrameBudgetPanel, linesOf, type SceneCounts } from './Views/FrameBudgetPanel.ts'

const backgroundColour = '#f6e9d6'
const largestPixelRatioByDefault = 2
const longestFrameSeconds = 0.1
const aimPlaneAboveTargetMetres = 0.3
const smallestUpwardNormalOfASurface = 0.7
const reflectionsBlurSigma = 0.04
const transmissionResolutionShare = 0.5
const firstPersonSettleSeconds = 1.5
const fieldOfViewSettleSeconds = 0.35
const secondsBetweenKeepingTheVisit = 2
const ambientOcclusionRadiusMetres = 0.2
const ambientOcclusionStrength = 0.7

export type RoomArrival = {
  readonly place: RoomPlace
  readonly camera: SavedCamera | null
  readonly events: readonly RitualEvent[]
  readonly notice: string | null
  readonly continuesAVisit: boolean
  readonly faceOfANewGame: FaceFeature | null
  readonly arrangement: RoomArrangement
}

export class RoomScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(cameraFieldOfViewDegrees, 1, 0.1, 100)
  private readonly firstPersonHeldItemsCamera = new THREE.PerspectiveCamera(cameraFieldOfViewDegrees, 1, 0.05, 10)
  private readonly raycaster = newRaycasterSeeingEveryLayer()
  private readonly clock = new THREE.Clock()
  private readonly session: RitualSession
  private readonly catalog: Catalog
  private readonly arrangement: RoomArrangement
  private readonly layout: RoomLayout
  private readonly log: RoomLog
  private readonly texts: RoomTexts
  private readonly visitStore: VisitStore
  private readonly play: RoomPlay
  private readonly room: RoomModel
  private readonly walker: WalkerModel
  private readonly settingsStore: SettingsStore
  private readonly playTime: PlayTime
  private readonly settingsScreen: SettingsScreen
  private readonly frameRateCounter: FrameRateCounter
  private readonly frameBudget = new FrameBudget()
  private readonly frameBudgetPanel: FrameBudgetPanel
  private readonly leaveFirstPersonButton: LeaveFirstPersonButton
  private settings: RoomSettings
  private softShadowsInCorners: EffectComposer | null = null
  private glow: RoomGlow | null = null
  private edgeSmoothing: EdgeSmoothing | null = null
  private isFrameBudgetShown = false
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
  private readonly keyboardAndMouse: KeyboardAndMouse
  private readonly shortcuts: KeyboardShortcuts
  private readonly garden: Garden
  private readonly sky = new Sky()
  private readonly zoom = new CameraZoom()
  private readonly gestures: RoomGestures
  private readonly roomLights = new RoomLights()
  private readonly inspectionStage = new InspectionStage()
  private cameraPose: CameraPose
  private keeperHeightCentimetres = keeperHeightByDefaultCentimetres
  private wasSeatedInFirstPerson = false
  private seatedShare = 0
  private lookWhileSittingDown: { readonly from: FirstPersonLook; readonly to: FirstPersonLook } | null = null
  private wereTheGearsWatched = false
  private wasFirstPersonView = false
  private firstPersonSettlesAtSeconds = 0
  private look: FirstPersonLook = { headingRadians: Math.PI, pitchRadians: 0 }
  private shadowPoseLastDrawn = ''
  private secondsSinceTheVisitWasKept = 0
  private lastSavedPlace: string | null = null
  private hasTheKeeperDied = false

  constructor(container: HTMLElement, session: RitualSession, catalog: Catalog, log: RoomLog, voiceSeed: number, heaterItemsBeforeTheTesterJoke: number, bowlPaintings: BowlPaintings, arrival: RoomArrival, visitStore: VisitStore) {
    this.session = session
    this.catalog = catalog
    this.arrangement = arrival.arrangement
    const layout = roomLayoutFor(arrival.arrangement)
    this.layout = layout
    this.log = log
    this.texts = new RoomTexts(voiceSeed, log)
    this.visitStore = visitStore
    if (arrival.camera !== null) this.restoreTheCamera(arrival.camera)
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, largestPixelRatioByDefault))
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
    this.play = new RoomPlay(ritual, catalog, layout, log, heaterItemsBeforeTheTesterJoke, {
      remarked: (remark) => {
        this.achievements.remarked(remark.kind)
        this.caption.show(this.texts.remarkLines(remark))
      },
      debugMenuAsked: () => {
        this.achievements.roseBushTappedTenTimes()
        this.keyboardAndMouse.letGoOfTheMouse('the debug menu opened')
        this.debugMenu.open(this.keeperHeightCentimetres)
      },
      achievementsAsked: () => {
        this.keyboardAndMouse.letGoOfTheMouse('the achievements opened')
        this.showTheAchievements()
      },
      settingsAsked: () => {
        this.keyboardAndMouse.letGoOfTheMouse('the settings opened')
        this.settingsScreen.show(this.settings, this.playTime.seconds)
      },
      mayGrowAMiddleHand: () => !this.achievements.unlocked.has('shiva'),
      temperatureUnit: () => this.settings.temperatureUnit,
      isNerdModeOn: () => this.settings.isNerdModeOn,
      screenRightOnTheFloor: () => (this.settings.cameraMode === 'firstPerson' ? rightOnTheFloorOf(this.look.headingRadians) : null),
      keeperDied: () => {
        this.hasTheKeeperDied = true
        this.keyboardAndMouse.letGoOfTheMouse('the keeper died')
        this.playTime.keep('the keeper died, and the time on the last screen is not counted')
        this.achievements.keeperDied()
        this.visitStore.forget('the keeper died, so the next visit starts anew')
        this.caption.hide()
        this.youDied.show(this.texts.lastWordsLine(), this.texts.obituaryLine())
      },
    }, arrival.place)
    this.gestures = new RoomGestures(this.play, this.zoom, { tapTargetAt: (point) => this.tapTargetAt(point), aimPointAt: (point) => this.aimPlanePointAt(point) }, log)
    const materials = new RoomMaterials(reflectionsOfTheRoom(this.renderer), bowlPaintings)
    const roomDefinition = definitionIn(catalog, 'rooms', session.state.roomId)
    this.room = new RoomModel(materials, layout, arrival.arrangement, roomDefinition.heaterSpot)
    this.walker = new WalkerModel(materials)
    this.carried = new CarriedItems(materials, shapedItemsIn(session.state, log), roomDefinition.tap?.sinkSpot ?? null, { layout, heaterSpot: roomDefinition.heaterSpot }, clothPatternsByIdIn(roomDefinition, arrival.arrangement))
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
    this.shortcuts = new KeyboardShortcuts({
      isInspecting: () => this.play.inspectionView !== null,
      handTapped: (handIndex) => this.play.handKeyTapped(handIndex),
      handHeld: (handIndex, heldSeconds) => this.play.handPressHeld(handIndex, heldSeconds),
      inspectionClosed: () => this.play.inspectionTapped({ kind: 'nothing' }),
      sipped: () => this.play.sipTapped(),
      tiltPressed: () => this.play.tiltPressed(),
      tiltReleased: () => this.play.tiltReleased(),
    }, log)
    this.keyboardAndMouse = new KeyboardAndMouse(container, this.renderer.domElement, {
      keyPressed: (code) => this.shortcuts.keyPressed(code),
      keyReleased: (code) => this.shortcuts.keyReleased(code),
    }, log)
    this.debugMenu = new DebugMenu(container, {
      keeperHeightChosen: (heightCentimetres) => this.keeperHeightChosen(heightCentimetres),
      frameBudgetShownChosen: (isShown) => this.frameBudgetShownChosen(isShown),
    })
    this.garden = new Garden(materials, log)
    this.scene.add(this.room.root, this.garden.root, this.sky.root, this.walker.root, this.carried.root, ...this.roomLights.lights, ...this.inspectionStage.lights)
    this.settingsStore = new SettingsStore(log, matchMedia('(pointer: fine)').matches ? 'mouseAndKeyboard' : 'twoSticks')
    this.playTime = new PlayTime(new PlayTimeStore(log), log)
    this.settings = this.settingsStore.load()
    this.settingsScreen = new SettingsScreen(container, {
      coatColourChosen: (coatColour) => this.settingChosen({ coatColour }),
      softShadowsInCornersChosen: (hasSoftShadowsInCorners) => this.settingChosen({ hasSoftShadowsInCorners }),
      glowChosen: (hasGlow) => this.settingChosen({ hasGlow }),
      frameRateShownChosen: (isFrameRateShown) => this.settingChosen({ isFrameRateShown }),
      fullResolutionChosen: (hasFullResolution) => this.settingChosen({ hasFullResolution }),
      smoothEdgesChosen: (hasSmoothEdges) => this.settingChosen({ hasSmoothEdges }),
      objectDetailChosen: (objectDetail) => this.settingChosen({ objectDetail }),
      faceFeatureChosen: (faceFeature) => this.settingChosen({ faceFeature }),
      nerdModeChosen: (isNerdModeOn) => this.settingChosen({ isNerdModeOn }),
      temperatureUnitChosen: (temperatureUnit) => this.settingChosen({ temperatureUnit }),
      cameraModeChosen: (cameraMode) => this.settingChosen({ cameraMode }),
      controlSchemeChosen: (controlScheme) => this.settingChosen({ controlScheme }),
      stickLayoutChosen: (stickLayout) => this.settingChosen({ stickLayout }),
    })
    this.frameRateCounter = new FrameRateCounter(container)
    this.frameBudgetPanel = new FrameBudgetPanel(container)
    this.renderer.info.autoReset = false
    const cornerButtons = document.createElement('div')
    cornerButtons.className = 'corner-buttons'
    container.append(cornerButtons)
    new FullScreenButton(cornerButtons, log)
    this.leaveFirstPersonButton = new LeaveFirstPersonButton(cornerButtons, () => this.changeTheSettings({ cameraMode: 'room' }, 'from the button in the corner'))
    this.fitToWindow()
    if (arrival.faceOfANewGame === null) this.showTheSettings()
    else this.changeTheSettings({ faceFeature: arrival.faceOfANewGame }, 'as a new game begins')
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
    this.frameBudget.frameBegan(performance.now())
    this.renderer.info.reset()
    const secondsSinceTheLastFrame = this.clock.getDelta()
    this.frameRateCounter.frameDrawn(secondsSinceTheLastFrame)
    const seconds = Math.min(secondsSinceTheLastFrame, longestFrameSeconds)
    this.walkAndLookInFirstPerson(seconds)
    this.frameBudget.phaseEnded('walking', performance.now())
    this.shortcuts.advance(seconds)
    this.debugMenu.advance(seconds)
    this.gestures.advance(secondsSinceTheLastFrame)
    this.frameBudget.phaseEnded('input', performance.now())
    this.play.advance(seconds)
    this.frameBudget.phaseEnded('roomPlay', performance.now())
    this.reactTo(this.session.advance(seconds))
    this.frameBudget.phaseEnded('simulation', performance.now())
    this.caption.advance(seconds)
    this.achievements.worldAdvanced(this.session.state)
    this.achievementNotice.advance(seconds)
    this.keepTheVisitNowAndThen(secondsSinceTheLastFrame)
    this.playTime.frameDrawn(secondsSinceTheLastFrame, { isThePageShown: document.visibilityState === 'visible', hasTheKeeperDied: this.hasTheKeeperDied })
    this.frameBudget.phaseEnded('bookkeeping', performance.now())
    const daylight = daylightAt(hoursSinceSunriseOf(this.session.state.atmosphere))
    this.roomLights.show(daylight)
    const isFirstPerson = this.settings.cameraMode === 'firstPerson'
    const isCloseUp = this.play.view.kind === 'closeUp'
    const isWalkerShown = !isCloseUp && !isFirstPerson
    this.walker.show(this.play.walk, this.clock.elapsedTime)
    this.walker.root.visible = isWalkerShown
    this.moveCamera(seconds)
    this.sky.show(daylight, isFirstPerson, this.camera.position)
    this.frameBudget.phaseEnded('camera', performance.now())
    const state = this.session.state
    const table = tableViewState(state, this.catalog)
    const heldItemsCamera = this.heldItemsCamera()
    const heldInView = isWalkerShown ? null : { camera: heldItemsCamera, chosenHandIndex: this.play.chosenHandIndex, isFirstPerson, screenHeightShareTakenByControls: isFirstPerson ? this.joysticks.screenHeightShareTakenFromTheBottom : 0 }
    const inspection = this.play.inspectionView
    const inspected = inspection === null ? null : { camera: this.camera, inspection }
    this.carried.show({ state, table, walk: this.play.walk, heldInView, inspected, aimedPour: this.play.aimedPourView, clothWiping: this.play.clothWiping, timeSeconds: this.clock.elapsedTime, temperatureUnitShown: this.settings.isNerdModeOn ? this.settings.temperatureUnit : null, distantDetail: this.settings.objectDetail === 'reduced' ? { camera: this.camera, screenHeightPixels: window.innerHeight } : null })
    if (inspection !== null) this.inspectionStage.followTheCamera(this.camera)
    this.frameBudget.phaseEnded('carriedItems', performance.now())
    this.room.showHeater(table.isHeaterOn)
    this.room.advanceTheSettingsGear(seconds)
    const unit = this.settings.temperatureUnit
    this.room.showHeaterControls({ isNerdModeOn: this.settings.isNerdModeOn, target: { degrees: degreesShownIn(unit, table.thermostat.targetC), unit }, isThermostatOn: table.thermostat.isOn })
    this.room.showPuddles(table.puddles)
    this.frameBudget.phaseEnded('roomParts', performance.now())
    const isAiming = this.play.aimedPourView !== null
    const isInspecting = inspection !== null
    this.sipButton.show(this.play.sippableCupId !== null && !isAiming && !isInspecting)
    this.pourControls.show(isAiming)
    const isLookingFreely = isFirstPerson && !isAiming && !isInspecting
    this.leaveFirstPersonButton.show(isFirstPerson)
    const sticks = sticksShownFor(this.settings.controlScheme, this.settings.stickLayout)
    this.joysticks.show(isLookingFreely && sticks.left !== null, isLookingFreely && sticks.right !== null)
    if (!isLookingFreely || !usesTheMouse(this.settings.controlScheme)) this.keyboardAndMouse.letGoOfTheMouse('the look is not free now')
    this.frameBudget.phaseEnded('screenControls', performance.now())
    this.render()
    this.noticeTheProphecyIfSeenWhole()
    this.frameBudget.phaseEnded('bookkeeping', performance.now())
    this.reportTheFrameBudgetNowAndThen()
  }

  private reportTheFrameBudgetNowAndThen(): void {
    const report = this.frameBudget.frameEnded(performance.now())
    if (report === null || !this.isFrameBudgetShown) return
    const counts = this.sceneCounts()
    this.frameBudgetPanel.show(report, counts)
    this.log(`frame budget: ${linesOf(report, counts).join('; ')}`)
  }

  private sceneCounts(): SceneCounts {
    const { render, memory, programs } = this.renderer.info
    let sceneObjects = 0
    this.scene.traverse(() => (sceneObjects += 1))
    return { drawCallsPerFrame: render.calls, trianglesPerFrame: render.triangles, geometries: memory.geometries, textures: memory.textures, shaderPrograms: programs?.length ?? 0, sceneObjects, pageElements: document.getElementsByTagName('*').length }
  }

  private frameBudgetShownChosen(isShown: boolean): void {
    this.isFrameBudgetShown = isShown
    if (!isShown) this.frameBudgetPanel.hide()
    this.log(isShown ? 'the frame budget is shown from the debug menu, every 2 s' : 'the frame budget is hidden from the debug menu')
  }

  private showTheAchievements(): void {
    const outOfReach = achievementsOutOfReach(this.session.state, { hasTheProphecy: this.layout.canTheProphecyBeSeen })
    this.log(`the achievements are shown, out of reach here or now: ${[...outOfReach].join(', ') || 'none'}`)
    this.achievementsList.show(this.achievements.unlocked, outOfReach)
  }

  private noticeTheProphecyIfSeenWhole(): void {
    if (this.achievements.isUnlocked('delphicOracle')) return
    const inscription = this.room.prophecyInscription
    if (inscription === null || !isSeenWhole(inscription, this.camera, [this.room.root, this.walker.root])) return
    this.achievements.prophecySeenWhole()
  }

  private walkAndLookInFirstPerson(seconds: number): void {
    if (this.settings.cameraMode !== 'firstPerson' || this.play.aimedPourView !== null || this.play.inspectionView !== null) return
    const walk = this.play.walk
    if (isWalking(walk)) this.look = lookTurnedTowards(this.look, walk.headingRadians, seconds)
    this.look = this.lookTurnedByTheControls(seconds)
    const walking = this.walkingAsked()
    if (walking.right === 0 && walking.up === 0) return this.play.stopWalkingFreely()
    this.play.standUpToWalk()
    this.play.walkFreely(stepFor(walking, this.look.headingRadians, seconds), this.look.headingRadians)
  }

  private lookTurnedByTheControls(seconds: number): FirstPersonLook {
    const turnedByTheMouse = usesTheMouse(this.settings.controlScheme) ? lookTurnedByTheMouse(this.look, this.keyboardAndMouse.takeTheMouseMovement()) : this.look
    const lookStick = this.stickWithRole('look')
    return lookStick === null ? turnedByTheMouse : lookTurnedBy(turnedByTheMouse, lookStick, seconds)
  }

  private walkingAsked(): StickDeflection {
    const walkStick = this.stickWithRole('walk')
    const fromTheKeys = usesTheKeyboard(this.settings.controlScheme) ? walkFromTheKeys(this.keyboardAndMouse.keysHeld) : null
    const areTheKeysUsed = fromTheKeys !== null && (fromTheKeys.right !== 0 || fromTheKeys.up !== 0)
    if (areTheKeysUsed || walkStick === null) return fromTheKeys ?? { right: 0, up: 0 }
    return walkStick
  }

  private stickWithRole(role: 'walk' | 'look'): StickDeflection | null {
    const sticks = sticksShownFor(this.settings.controlScheme, this.settings.stickLayout)
    if (sticks.left === role) return this.joysticks.left
    return sticks.right === role ? this.joysticks.right : null
  }

  private restoreTheCamera(camera: SavedCamera): void {
    this.look = camera.look
    this.keeperHeightCentimetres = camera.keeperHeightCentimetres
    this.log(`the first-person look is back and the keeper is ${camera.keeperHeightCentimetres} cm tall, as the visit left them`)
  }

  private keepTheVisitWhenThePageIsLeft(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'hidden') return
      this.keepTheVisit('the page was hidden')
      this.playTime.keep('the page was hidden')
    })
    window.addEventListener('pagehide', () => {
      this.keepTheVisit('the page was left')
      this.playTime.keep('the page was left')
    })
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
      camera: { look: this.look, keeperHeightCentimetres: this.keeperHeightCentimetres },
      arrangement: this.arrangement,
    })
    if (reason !== null) this.log(`the visit is saved because ${reason}`)
    this.logTheSavedPlaceWhenItChanged(this.play.place)
  }

  private logTheSavedPlaceWhenItChanged(place: RoomPlace): void {
    const savedPlace = `(${place.position.x.toFixed(2)}, ${place.position.z.toFixed(2)})${place.closeUpOf === null ? '' : ` in the ${place.closeUpOf} close-up`}`
    if (savedPlace === this.lastSavedPlace) return
    this.lastSavedPlace = savedPlace
    this.log(`the visit is saved with the walker at ${savedPlace}`)
  }

  private settingChosen(change: Partial<RoomSettings>): void {
    this.changeTheSettings(change, 'from the settings')
    this.room.turnTheSettingsGearOneTooth()
  }

  private changeTheSettings(change: Partial<RoomSettings>, how: string): void {
    const cameraModeBefore = this.settings.cameraMode
    this.settings = { ...this.settings, ...change }
    if (this.settings.cameraMode !== cameraModeBefore) this.cameraModeChanged()
    this.settingsStore.keep(this.settings)
    this.showTheSettings()
    this.log(`the settings change ${how}: ${Object.entries(change).map(([name, value]) => `${name} ${String(value)}`).join(', ')}`)
  }

  private showTheSettings(): void {
    this.walker.paintTheBody(this.settings.coatColour)
    this.walker.showTheFace(this.settings.faceFeature)
    this.frameRateCounter.show(this.settings.isFrameRateShown)
    this.showTheResolution(this.settings.hasFullResolution)
    this.showSmoothEdges(this.settings.hasSmoothEdges)
    this.showSoftShadowsInCorners(this.settings.hasSoftShadowsInCorners)
    this.showTheGlow(this.settings.hasGlow)
    this.garden.showDistantFlowers(this.settings.objectDetail)
  }

  private showTheResolution(isFull: boolean): void {
    const pixelRatio = isFull ? window.devicePixelRatio : Math.min(window.devicePixelRatio, largestPixelRatioByDefault)
    if (this.renderer.getPixelRatio() === pixelRatio) return
    this.renderer.setPixelRatio(pixelRatio)
    this.log(`the room is drawn at ${pixelRatio} pixels for each point of the page`)
    this.redrawTheEffectsAtTheNewResolution()
    this.fitToWindow()
  }

  private redrawTheEffectsAtTheNewResolution(): void {
    if (this.softShadowsInCorners !== null) {
      this.showSoftShadowsInCorners(false)
      this.showSoftShadowsInCorners(true)
    }
    if (this.glow !== null) {
      this.showTheGlow(false)
      this.showTheGlow(true)
    }
  }

  private showSmoothEdges(isOn: boolean): void {
    if ((this.edgeSmoothing !== null) === isOn) return
    this.edgeSmoothing?.dispose()
    this.edgeSmoothing = isOn ? new EdgeSmoothing(this.renderer) : null
  }

  private showSoftShadowsInCorners(isOn: boolean): void {
    if ((this.softShadowsInCorners !== null) === isOn) return
    this.softShadowsInCorners?.dispose()
    this.softShadowsInCorners = isOn ? softShadowsInCornersOf(this.renderer, this.scene, this.camera) : null
  }

  private showTheGlow(isOn: boolean): void {
    if ((this.glow !== null) === isOn) return
    this.glow?.dispose()
    this.glow = isOn ? new RoomGlow(this.renderer, this.scene, this.camera, [this.garden.root, this.sky.root], this.log) : null
  }

  private keeperHeightChosen(heightCentimetres: number): void {
    this.keeperHeightCentimetres = heightCentimetres
    this.log(`the keeper is ${heightCentimetres} cm tall from the debug menu`)
  }

  private cameraModeChanged(): void {
    if (this.settings.cameraMode === 'firstPerson') this.look = { headingRadians: this.play.walk.headingRadians, pitchRadians: 0 }
    else this.play.stopWalkingFreely()
  }

  private showTheKeeperSittingDownOrStandingUp(seconds: number): void {
    const isSeated = this.settings.cameraMode === 'firstPerson' && this.play.isSeatedAtTheRitualPlace
    if (isSeated && !this.wasSeatedInFirstPerson) this.turnToTheTableWhileSittingDown()
    if (!isSeated && this.wasSeatedInFirstPerson) this.log('the keeper stands up from the tea table, the view rising to standing eyes')
    if (!isSeated) this.lookWhileSittingDown = null
    this.wasSeatedInFirstPerson = isSeated
    this.seatedShare = seatedShareAfter(this.seatedShare, isSeated, seconds)
    const turn = this.lookWhileSittingDown
    if (turn === null) return
    this.look = lookBetween(turn.from, turn.to, easedSeatedShare(this.seatedShare))
    if (this.seatedShare === 1) this.lookWhileSittingDown = null
  }

  private turnToTheTableWhileSittingDown(): void {
    const closeUp = this.play.closeUpInView
    if (closeUp === null) return this.log('the keeper sits down with no tea table in view to turn to')
    const walker = this.play.walk.position
    const lookAtTheTable = lookAt(closeUp.target, { x: walker.x, y: eyeHeightMetres(this.keeperHeightCentimetres, 1), z: walker.z })
    this.lookWhileSittingDown = { from: this.look, to: lookAtTheTable }
    this.log('the keeper sits down at the tea table, the view sinking and turning to it, then free to look around')
  }

  private moveCamera(seconds: number): void {
    const areTheGearsWatched = this.settingsScreen.isShown
    if (areTheGearsWatched !== this.wereTheGearsWatched) this.log(areTheGearsWatched ? 'the camera turns to the gears on the wall while the settings are open' : 'the camera goes back as the settings close')
    this.wereTheGearsWatched = areTheGearsWatched
    if (areTheGearsWatched) return this.watchTheGears(seconds)
    this.zoom.viewShown(this.play.view)
    this.showTheKeeperSittingDownOrStandingUp(seconds)
    const isFirstPersonView = this.settings.cameraMode === 'firstPerson'
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

  private watchTheGears(seconds: number): void {
    this.wasFirstPersonView = false
    this.showFieldOfView(cameraFieldOfViewDegrees, seconds)
    this.cameraPose = poseEasedTowards(this.cameraPose, poseWatchingTheGears(this.layout, this.camera.aspect), seconds)
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
    this.frameBudget.phaseEnded('roomPass', performance.now())
    this.glow?.drawOver(this.renderer)
    this.frameBudget.phaseEnded('glowPass', performance.now())
    this.renderer.clearDepth()
    const heldItemsCamera = this.heldItemsCamera()
    heldItemsCamera.layers.set(roomLayers.heldInView)
    this.renderer.render(this.scene, heldItemsCamera)
    this.frameBudget.phaseEnded('heldItemsPass', performance.now())
    if (this.play.inspectionView !== null) this.drawTheInspectedItemOverTheDimmedRoom()
    this.frameBudget.phaseEnded('inspectionPass', performance.now())
    this.edgeSmoothing?.drawOver(this.renderer)
    this.frameBudget.phaseEnded('smoothingPass', performance.now())
    this.camera.layers.set(roomLayers.room)
  }

  private drawTheInspectedItemOverTheDimmedRoom(): void {
    this.inspectionStage.dimWhatIsDrawn(this.renderer)
    this.renderer.clearDepth()
    this.camera.layers.set(roomLayers.inspected)
    this.renderer.render(this.scene, this.camera)
  }

  private reactTo(events: readonly RitualEvent[]): readonly RitualEvent[] {
    this.caption.show(this.texts.captionLinesFor(events, this.session.state.elapsedSeconds))
    this.achievements.eventsHappened(events, this.session.state)
    return events
  }

  private cameraGoal(): CameraPose {
    const closeUp = this.play.closeUpInView
    if (this.settings.cameraMode === 'firstPerson') return firstPersonPose(this.play.walk.position, this.look, eyeHeightMetres(this.keeperHeightCentimetres, this.seatedShare))
    if (closeUp !== null) return closeUpPose(closeUp, this.camera.aspect)
    return overviewPose(this.play.walk.position, this.camera.aspect)
  }

  private listenToPresses(): void {
    const canvas = this.renderer.domElement
    canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && this.mayCatchTheMouse() && !this.keyboardAndMouse.isLocked) return this.keyboardAndMouse.catchTheMouse()
      this.gestures.fingerDown(event.pointerId, this.pointOfThe(event))
    })
    canvas.addEventListener('pointermove', (event) => this.gestures.fingerMoved(event.pointerId, this.pointOfThe(event)))
    canvas.addEventListener('pointerup', (event) => this.gestures.fingerUp(event.pointerId))
    canvas.addEventListener('pointercancel', (event) => this.gestures.fingerUp(event.pointerId))
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault()
      this.gestures.wheelTurned(event.deltaY)
    }, { passive: false })
    for (const safariGesture of ['gesturestart', 'gesturechange']) document.addEventListener(safariGesture, (event) => event.preventDefault())
  }

  private mayCatchTheMouse(): boolean {
    return this.settings.cameraMode === 'firstPerson' && usesTheMouse(this.settings.controlScheme) && this.keyboardAndMouse.mayBeCaught && this.play.aimedPourView === null && this.play.inspectionView === null
  }

  private pointOfThe(event: PointerEvent): ScreenPoint {
    if (!this.keyboardAndMouse.isLocked) return { x: event.clientX, y: event.clientY }
    const bounds = this.renderer.domElement.getBoundingClientRect()
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
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
    const tappable = [...this.room.tappableMeshes, ...this.carried.tappableMeshes, ...this.garden.tappableMeshes]
    const heldHits = this.hitsSeenBy(this.heldItemsCamera(), point, tappable.filter((mesh) => this.carried.isHeldInView(mesh)))
    const roomHits = this.hitsSeenBy(this.camera, point, tappable).filter((hit) => !this.carried.isHeldInView(hit.object))
    const nearestFirst = [...heldHits, ...roomHits].map((hit) => ({ target: tapTargetOf(hit), isForgivingTouchArea: isAForgivingTouchArea(hit.object) }))
    return tapTargetAmong(nearestFirst, this.play.chosenHandIndex, (target) => this.play.doesATapReachPastTheChosenHand(target))
  }

  private hitsSeenBy(camera: THREE.PerspectiveCamera, point: ScreenPoint, meshes: readonly THREE.Object3D[]): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.pointerAt(point), camera)
    return this.raycaster.intersectObjects([...meshes], true).filter((hit) => isShown(hit.object))
  }

  private heldItemsCamera(): THREE.PerspectiveCamera {
    if (this.settings.cameraMode !== 'firstPerson') return this.camera
    const heldItemsCamera = this.firstPersonHeldItemsCamera
    heldItemsCamera.position.copy(this.camera.position)
    heldItemsCamera.quaternion.copy(this.camera.quaternion)
    if (heldItemsCamera.aspect !== this.camera.aspect) {
      heldItemsCamera.aspect = this.camera.aspect
      heldItemsCamera.updateProjectionMatrix()
    }
    heldItemsCamera.updateMatrixWorld()
    return heldItemsCamera
  }

  private fitToWindow(): void {
    const width = window.innerWidth
    const height = window.innerHeight
    this.renderer.setSize(width, height)
    this.softShadowsInCorners?.setSize(width, height)
    this.glow?.setSize(width, height)
    this.edgeSmoothing?.fitTo(this.renderer)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }
}

function clothPatternsByIdIn(room: RoomDefinition, arrangement: RoomArrangement): ReadonlyMap<string, ClothPattern> {
  return new Map(room.cloths.flatMap((cloth, index) => {
    const pattern = arrangement.clothPatterns[index]
    return pattern === undefined ? [] : [[cloth.id, pattern] as const]
  }))
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
  if ('isHeaterPanel' in tag) return { kind: 'heaterPanel' }
  if ('thermostatArrow' in tag) return { kind: 'thermostatArrow', step: tag.thermostatArrow === 'up' ? 1 : -1 }
  if ('isThermostatButton' in tag) return { kind: 'thermostatButton' }
  if ('isFaucet' in tag) return { kind: 'faucet' }
  if ('isSink' in tag) return { kind: 'sink' }
  if ('isFloor' in tag) return { kind: 'floor', point: { x: hit.point.x, z: hit.point.z } }
  if ('lidOfItemId' in tag) return { kind: 'lid', itemId: tag.lidOfItemId }
  if ('openingOfItemId' in tag) return { kind: 'opening', itemId: tag.openingOfItemId }
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
