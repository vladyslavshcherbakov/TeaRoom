import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { carriedItemIdsIn, definitionIn, hoursSinceSunriseOf, standingSpotOf, type Catalog, type DeepReadonly, type TeaEvent, type TeaSession, type RoomDefinition, type SessionState } from '../../../../Shared/GameLogic/GameLogic.ts'
import { worldViewState } from '../../Presentation/WorldPresenter.ts'
import {
  cameraFieldOfViewDegrees,
  closeUpPose,
  firstPersonGlideSeconds,
  overviewPose,
  poseGlidingIntoFirstPerson,
  poseEasedTowards,
  poseWatchingTheGears,
  zoomedPose,
} from '../Camera/CameraPoses.ts'
import { CameraZoom } from '../Camera/CameraZoom.ts'
import { firstPersonFieldOfViewDegrees, firstPersonPose, rightOnTheFloorOf, stepFor, type FirstPersonLook } from '../../../Engine/Camera/FirstPersonLook.ts'
import { LookAlongTheWalk } from '../../../Engine/Camera/LookAlongTheWalk.ts'
import { eyeHeightMetres } from '../../../Engine/Camera/PlayerHeight.ts'
import { SittingDown } from '../../../Engine/Camera/SittingDown.ts'
import { debugSettingsByDefault, type DebugSettings } from '../DebugSettings.ts'
import { debugSettingsStore } from '../DebugSettingsStore.ts'
import { describeSettings } from '../../../Engine/SettingValues.ts'
import { stickWithRole, usesTheMouse, walkAsked, type SticksHeld } from '../../../Engine/Camera/FirstPersonControls.ts'
import { screenControlsShown } from '../ScreenControls.ts'
import { KeyboardAndMouse } from '../../../Engine/Rendering/Controls/KeyboardAndMouse.ts'
import { KeyBindings } from '../KeyBindings.ts'
import { TouchInput } from '../TouchInput.ts'
import type { ScreenPoint } from '../../../Engine/ScreenPoint.ts'
import { carriedShapeOf, type ShapedItem } from '../CarriedShapes.ts'
import { roomLayoutFor, type RoomLayout } from '../RoomLayout.ts'
import type { CameraPose, FloorPoint } from '../../../Engine/Points.ts'
import type { ClothPattern, RoomArrangement } from '../RoomArrangement.ts'
import type { RoomPlace } from '../RoomNavigator.ts'
import type { AppLog } from '../../../Engine/AppLog.ts'
import type { PlayerController } from '../PlayerController.ts'
import { RoomVisit } from '../RoomVisit.ts'
import type { TapTarget } from '../TapTarget.ts'
import { LyingLids } from '../Placement.ts'
import type { TapReach } from '../TapTargetAmong.ts'
import type { FaceFeature, RoomSettings } from '../RoomSettings.ts'
import { shareOfEverySoundsLoudnessBySetting, type SoundLoudness } from '../../../Engine/Audio/SoundLoudness.ts'
import type { BrowserStore, StoreWithADefault } from '../../../Engine/BrowserStorage.ts'
import { playTimeStore } from '../../../Engine/PlayTimeStore.ts'
import { SettingsScreen } from './Controls/SettingsScreen.ts'
import { FrameRateCounter } from './Controls/FrameRateCounter.ts'
import { FullScreenButton } from './Controls/FullScreenButton.ts'
import { achievementStore } from '../AchievementStore.ts'
import { aimHintStore } from '../AimHintStore.ts'
import { AchievementNotice } from './Controls/AchievementNotice.ts'
import { AchievementsList } from './Controls/AchievementsList.ts'
import { GuideBook } from './Controls/GuideBook.ts'
import type { SavedCamera, SavedVisit } from '../VisitStore.ts'
import { CarriedItems } from './CarriedItems.ts'
import { Garden } from './Garden.ts'
import { isSeenWhole } from './ProphecySighting.ts'
import { CloseLookStage } from '../../../Engine/Rendering/CloseLookStage.ts'
import { roomLayers } from './RoomLayers.ts'
import { inspectedDistanceMetres } from './Carried/Hands/InspectedInView.ts'
import { daylightAt } from '../../../Engine/DaylightCycle.ts'
import { DebugMenu } from './Controls/DebugMenu.ts'
import { Joysticks } from '../../../Engine/Rendering/Controls/Joysticks.ts'
import { Sky } from './Sky.ts'
import { Caption } from '../../../Engine/Rendering/Controls/Caption.ts'
import { YouDiedScreen } from './Controls/YouDiedScreen.ts'
import { RoomLights } from './RoomLights.ts'
import { RoomMaterials } from './RoomMaterials.ts'
import type { KoiPond } from './Paintings/KoiPond.ts'
import { RoomModel } from './RoomModel.ts'
import type { SoundBoard } from '../../../Engine/Audio/SoundBoard.ts'
import { soundsLastingIn, type RoomSound } from '../RoomSounds.ts'
import { screenPointThatTapsTheTarget, tapTargetUnderTheFinger, type TappablePass } from './TapTargetUnderTheFinger.ts'
import { exposeTheProbe } from '../../../Engine/Probe.ts'
import { ClothLookShown } from '../ClothLookShown.ts'
import { PuddlesShown } from '../PuddlesShown.ts'
import { AimHint } from './Controls/AimHint.ts'
import { ActionMenuOnThePage } from './Controls/ActionMenuOnThePage.ts'
import { ScreenButtonsOnThePage } from './Controls/ScreenButtonsOnThePage.ts'
import { WalkerModel } from './WalkerModel.ts'
import { degreesShownIn } from '../../../Engine/Temperatures.ts'
import { GlowPass } from '../../../Engine/Rendering/GlowPass.ts'
import { Host, type FrameTimes } from '../../../Engine/Rendering/Host.ts'
import type { FrameBudgetReport } from '../../../Engine/FrameBudget.ts'
import type { FrameBudgetPhase } from '../FrameBudgetPhases.ts'
import { FrameBudgetPanel, linesOf, type SceneCounts } from './Controls/FrameBudgetPanel.ts'

const backgroundColour = '#f6e9d6'
const largestPixelRatioByDefault = 2
const aimPlaneAboveTargetMetres = 0.3
const reflectionsBlurSigma = 0.04
const transmissionResolutionShare = 0.5
const fieldOfViewSettleSeconds = 0.35
const ambientOcclusionRadiusMetres = 0.2
const ambientOcclusionStrength = 0.7
const ambientOcclusionResolutionShare = 0.5
const fastWorldTimeScale = 20

export type BowlPaintings = {
  readonly koiPond: KoiPond
  readonly bowlIdWithTheToadUnderneath: string
}

type GlideIntoFirstPerson = {
  readonly poseWhereItBegan: CameraPose
  secondsSoFar: number
}

export type RoomArrival = {
  readonly place: RoomPlace
  readonly camera: SavedCamera | null
  readonly events: readonly TeaEvent[]
  readonly notice: string | null
  readonly continuesAVisit: boolean
  readonly faceOfANewGame: FaceFeature | null
  readonly arrangement: RoomArrangement
}

export class RoomScene {
  private readonly host: Host<FrameBudgetPhase>
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(cameraFieldOfViewDegrees, 1, 0.1, 100)
  private readonly firstPersonHeldItemsCamera = new THREE.PerspectiveCamera(cameraFieldOfViewDegrees, 1, 0.05, 10)
  private readonly raycaster = new THREE.Raycaster()
  private readonly session: TeaSession
  private readonly catalog: Catalog
  private readonly layout: RoomLayout
  private readonly log: AppLog
  private readonly visit: RoomVisit
  private readonly playerController: PlayerController
  private readonly lookAlongTheWalk: LookAlongTheWalk
  private readonly room: RoomModel
  private readonly walker: WalkerModel
  private readonly settingsStore: StoreWithADefault<RoomSettings>
  private readonly settingsScreen: SettingsScreen
  private readonly frameRateCounter: FrameRateCounter
  private readonly frameBudgetPanel: FrameBudgetPanel
  private settings: RoomSettings
  private readonly carried: CarriedItems
  private readonly screenButtons: ScreenButtonsOnThePage
  private readonly aimHint: AimHint
  private readonly actionMenu: ActionMenuOnThePage
  private readonly caption: Caption
  private readonly achievementsList: AchievementsList
  private readonly guideBook: GuideBook
  private readonly achievementNotice: AchievementNotice
  private readonly debugMenu: DebugMenu
  private readonly youDied: YouDiedScreen
  private readonly joysticks: Joysticks
  private readonly keyboardAndMouse: KeyboardAndMouse
  private readonly keyBindings: KeyBindings
  private readonly garden: Garden
  private readonly sky: Sky
  private readonly zoom = new CameraZoom()
  private readonly touchInput: TouchInput
  private readonly roomLights = new RoomLights()
  private readonly sounds: SoundBoard<RoomSound>
  private readonly inspectionStage: CloseLookStage
  private cameraPose: CameraPose
  private debugSettings: DebugSettings = debugSettingsByDefault
  private readonly debugSettingsStore: StoreWithADefault<DebugSettings>
  private readonly sittingDown: SittingDown
  private readonly clothLookShown = new ClothLookShown()
  private readonly puddlesShown = new PuddlesShown()
  private wereTheGearsWatched = false
  private wasFirstPersonView = false
  private glideIntoFirstPerson: GlideIntoFirstPerson | null = null
  private look: FirstPersonLook = { headingRadians: Math.PI, pitchRadians: 0 }
  private lastFrameBudget: FrameBudgetReport<FrameBudgetPhase> | null = null

  constructor(container: HTMLElement, session: TeaSession, catalog: Catalog, log: AppLog, voiceSeed: number, heaterItemsBeforeTheTesterJoke: number, bowlPaintings: BowlPaintings, arrival: RoomArrival, visitStore: BrowserStore<SavedVisit>, settingsStore: StoreWithADefault<RoomSettings>, settings: RoomSettings, sounds: SoundBoard<RoomSound>) {
    this.session = session
    this.sounds = sounds
    this.catalog = catalog
    const layout = roomLayoutFor(arrival.arrangement)
    this.layout = layout
    this.log = log
    if (arrival.camera !== null) this.restoreTheCamera(arrival.camera)
    this.host = new Host(container, { largestPixelRatioByDefault, transmissionResolutionShare, clearColour: backgroundColour, softShadowsInCorners: { radiusMetres: ambientOcclusionRadiusMetres, strength: ambientOcclusionStrength, resolutionShare: ambientOcclusionResolutionShare } }, log)
    const lyingLids = new LyingLids(log)
    this.settings = settings
    this.visit = new RoomVisit({
      session,
      catalog,
      layout,
      arrangement: arrival.arrangement,
      lyingLids,
      voiceSeed,
      heaterItemsBeforeTheTesterJoke,
      place: arrival.place,
      stores: { visit: visitStore, achievements: achievementStore(log), playTime: playTimeStore(log) },
      settings: () => this.settings,
      screenRightOnTheFloor: () => (this.settings.cameraMode === 'firstPerson' ? rightOnTheFloorOf(this.look.headingRadians) : null),
      screens: {
        captionShown: (lines) => this.caption.show(lines),
        captionHidden: () => this.caption.hide(),
        barked: () => {},
        youDiedShown: (lastWords, obituary) => {
          this.keyboardAndMouse.letGoOfTheMouse('the player died')
          this.youDied.show(lastWords, obituary, this.settings.areAchievementsShown)
        },
        debugMenuOpened: () => {
          this.keyboardAndMouse.letGoOfTheMouse('the debug menu opened')
          this.debugMenu.open(this.debugSettings)
        },
        achievementsOpened: (unlocked, outOfReach) => {
          this.keyboardAndMouse.letGoOfTheMouse('the achievements opened')
          this.achievementsList.show(unlocked, outOfReach)
        },
        guideOpened: () => {
          this.keyboardAndMouse.letGoOfTheMouse('the guide opened')
          this.guideBook.show()
        },
        firstPersonLeft: () => this.changeTheSettings({ cameraMode: 'room' }, 'from the button in the corner'),
        settingsOpened: (secondsPlayed) => {
          this.keyboardAndMouse.letGoOfTheMouse('the settings opened')
          this.settingsScreen.show(this.settings, secondsPlayed)
        },
        achievementAnnounced: (id) => this.achievementNotice.announce(id),
        soundStarted: (sound) => this.sounds.playOnce(sound),
      },
      log,
    })
    this.playerController = this.visit.playerController
    this.sittingDown = new SittingDown(log)
    this.lookAlongTheWalk = new LookAlongTheWalk(this.playerController.walksStarted, log)
    this.touchInput = new TouchInput(this.playerController, this.zoom, { tapTargetAt: (point) => this.tapTargetAt(point), aimPointAt: (point) => this.aimPlanePointAt(point) }, log)
    const materials = new RoomMaterials(this.host.reflectionsOf(new RoomEnvironment(), reflectionsBlurSigma), bowlPaintings.koiPond, log)
    const roomDefinition = definitionIn(catalog, 'rooms', session.state.roomId)
    this.room = new RoomModel(materials, layout, arrival.arrangement, roomDefinition.heaterSpot, log)
    this.walker = new WalkerModel(materials, debugSettingsByDefault.sparrowAnimation, log)
    this.sky = new Sky(materials)
    this.inspectionStage = new CloseLookStage(materials.materialFor('inspectionDimming'), inspectedDistanceMetres, (light) => roomLayers.showThePassTo(light, 'inspected'))
    this.carried = new CarriedItems(materials, shapedItemsIn(session.state, log), roomDefinition.tap?.sinkSpot ?? null, { layout, heaterSpot: roomDefinition.heaterSpot }, lyingLids, clothPatternsByIdIn(roomDefinition, arrival.arrangement), bowlPaintings.bowlIdWithTheToadUnderneath, log)
    const cornerButtons = document.createElement('div')
    cornerButtons.className = 'corner-buttons'
    new FullScreenButton(cornerButtons, log)
    this.screenButtons = new ScreenButtonsOnThePage({ overTheRoom: container, inTheCorner: cornerButtons }, {
      pressed: (button) => this.playerController.screenButtonPressed(button),
      letGo: (button) => this.playerController.screenButtonReleased(button),
    })
    this.aimHint = new AimHint(container, aimHintStore(log))
    this.actionMenu = new ActionMenuOnThePage(container, (index) => this.playerController.actionChosen(index))
    this.caption = new Caption(container)
    this.achievementNotice = new AchievementNotice(container)
    this.achievementsList = new AchievementsList(container, {
      resetAsked: () => {
        this.visit.achievements.reset()
        this.visit.openTheAchievements()
      },
    })
    this.guideBook = new GuideBook(container, () => this.sounds.playOnce('pageTurn'))
    this.youDied = new YouDiedScreen(container, () => {
      log('the player starts over after dying')
      location.reload()
    })
    this.joysticks = new Joysticks(container)
    this.keyBindings = new KeyBindings({
      isInspecting: () => this.playerController.mode === 'lookingClosely',
      handTapped: (handIndex) => this.playerController.handKeyTapped(handIndex),
      handHeld: (handIndex, heldSeconds) => this.playerController.handPressHeld(handIndex, heldSeconds),
      inspectionClosed: () => this.playerController.inspectionTapped({ kind: 'nothing' }),
      sipped: () => this.playerController.sipTapped(),
      tiltPressed: () => this.playerController.tiltPressed(),
      tiltReleased: () => this.playerController.tiltReleased(),
    }, log)
    this.keyboardAndMouse = new KeyboardAndMouse(container, this.host.renderer.domElement, {
      keyPressed: (code) => this.keyBindings.keyPressed(code),
      keyReleased: (code) => this.keyBindings.keyReleased(code),
      everyKeyReleased: (reason) => this.keyBindings.everyKeyReleased(reason),
    }, log)
    this.debugMenu = new DebugMenu(container, {
      debugSettingChosen: (change) => this.changeTheDebugSettings(change, `the debug settings change from the debug menu: ${describeSettings(change)}`),
      kettleFillTapped: () => this.playerController.fillTheKettleTapped(),
    })
    this.garden = new Garden(materials)
    this.scene.add(this.room.root, this.garden.root, this.sky.root, this.walker.root, this.carried.root, ...this.roomLights.lights, ...this.inspectionStage.lights)
    this.settingsStore = settingsStore
    this.debugSettingsStore = debugSettingsStore(log)
    this.debugSettings = this.debugSettingsStore.load()
    this.settingsScreen = new SettingsScreen(container, (change) => this.settingChosen(change))
    this.frameRateCounter = new FrameRateCounter(container)
    this.frameBudgetPanel = new FrameBudgetPanel(container)
    container.append(cornerButtons)
    this.fitToWindow()
    if (arrival.faceOfANewGame === null) this.applyTheSettings()
    else this.changeTheSettings({ faceFeaturesShown: [arrival.faceOfANewGame] }, 'as a new game chooses the face at random')
    this.showTheDebugSettings()
    this.cameraPose = overviewPose(this.playerController.walk.position, this.camera.aspect)
    this.listenToPresses()
    window.addEventListener('resize', () => this.fitToWindow())
    this.keepTheVisitWhenThePageIsLeft()
    this.visit.arrive(arrival)
    this.drawTheGlassBeforeItIsSeen()
    exposeTheProbe({
      screenPointOfTheTarget: (target: TapTarget) => screenPointThatTapsTheTarget(target, this.tappablePassesDrawnLastFirst(), this.host.renderer.domElement.getBoundingClientRect(), (point) => this.tapTargetAt(point).target),
      drawnResources: () => this.host.drawnResources(),
      lastFrameBudget: () => this.lastFrameBudget,
    })
    this.host.start((times) => this.frame(times))
  }

  soundLoudnessChosenOnAStartScreen(soundLoudness: SoundLoudness): void {
    this.changeTheSettings({ soundLoudness }, 'on a start screen')
  }

  private frame({ realSeconds, worldSeconds }: FrameTimes): void {
    this.frameRateCounter.frameDrawn(realSeconds)
    this.walkAndLookInFirstPerson(worldSeconds)
    this.host.frameBudget.phaseEnded('walking', performance.now())
    this.keyBindings.advance(realSeconds)
    this.debugMenu.advance(realSeconds)
    this.touchInput.advance(realSeconds)
    this.host.frameBudget.phaseEnded('input', performance.now())
    this.playerController.advance({ worldSeconds, realSeconds })
    this.host.frameBudget.phaseEnded('playerController', performance.now())
    this.visit.advanceTheWorld(worldSeconds)
    this.host.frameBudget.phaseEnded('gameLogic', performance.now())
    this.caption.advance(worldSeconds)
    this.achievementNotice.advance(worldSeconds)
    this.visit.frameDrawn(realSeconds, this.look, document.visibilityState === 'visible')
    this.host.frameBudget.phaseEnded('bookkeeping', performance.now())
    const daylight = daylightAt(hoursSinceSunriseOf(this.session.state.atmosphere))
    this.roomLights.show(daylight)
    const isFirstPerson = this.settings.cameraMode === 'firstPerson'
    const isCloseUp = this.playerController.view.kind === 'closeUp'
    const isWalkerShown = !isCloseUp && !isFirstPerson
    this.walker.show(this.playerController.walk, this.host.elapsedSeconds)
    this.walker.root.visible = isWalkerShown
    this.moveCamera(worldSeconds)
    this.sky.show(daylight, isFirstPerson, this.camera.position)
    this.host.frameBudget.phaseEnded('camera', performance.now())
    const state = this.session.state
    const worldViewNow = worldViewState(state, this.catalog)
    const worldView = { ...worldViewNow, cloths: this.clothLookShown.clothsAfterAFrame(worldViewNow.cloths, realSeconds) }
    this.sounds.keepPlayingOnly(soundsLastingIn(state, worldView, this.visit.isWaterBeingWipedUp))
    const heldItemsCamera = this.heldItemsCamera()
    const inventoryInView = { camera: heldItemsCamera, isFirstPerson, screenHeightShareTakenByControls: isFirstPerson ? this.joysticks.screenHeightShareTakenFromTheBottom : 0 }
    const heldInView = isWalkerShown ? null : inventoryInView
    const inspection = this.playerController.inspectionView
    const inspected = inspection === null ? null : { camera: this.camera, inspection }
    this.carried.show({ state, view: worldView, walk: this.playerController.walk, heldInView, inventoryInView, inspected, aimedPour: this.playerController.aimedPourView, clothWiping: this.playerController.clothWiping, sipGesture: this.playerController.sipGestureView, timeSeconds: this.host.elapsedSeconds, temperatureUnitShown: this.settings.isNerdModeOn ? this.settings.temperatureUnit : null, distantDetail: this.settings.objectDetail === 'reduced' ? { camera: this.camera, screenHeightPixels: window.innerHeight } : null })
    if (inspection !== null) this.inspectionStage.followTheCamera(this.camera)
    this.host.frameBudget.phaseEnded('carriedItems', performance.now())
    this.room.showHeater(worldView.isHeaterOn)
    this.room.advanceTheSettingsGear(worldSeconds)
    const unit = this.settings.temperatureUnit
    this.room.showHeaterControls({ isNerdModeOn: this.settings.isNerdModeOn, target: { degrees: degreesShownIn(unit, worldView.thermostat.targetC), unit }, isThermostatOn: worldView.thermostat.isOn })
    this.room.showPuddles(this.puddlesShown.puddlesAfterAFrame(worldView.puddles, this.host.elapsedSeconds, this.carried.secondsWaterTakesToLand))
    this.host.frameBudget.phaseEnded('roomParts', performance.now())
    const shown = this.screenControlsShown()
    this.screenButtons.show(shown.buttons)
    this.aimHint.show(this.playerController.mode === 'aiming')
    this.actionMenu.show(this.playerController.actionMenuView)
    this.joysticks.show(shown.leftStick, shown.rightStick)
    if (!shown.mayHoldTheMouse) this.keyboardAndMouse.letGoOfTheMouse('the look is not free now')
    this.host.frameBudget.phaseEnded('screenControls', performance.now())
    this.render()
    this.noticeTheProphecyIfSeenWhole()
    this.host.frameBudget.phaseEnded('bookkeeping', performance.now())
    this.reportTheFrameBudgetNowAndThen()
  }

  private reportTheFrameBudgetNowAndThen(): void {
    const report = this.host.frameBudget.frameEnded(performance.now())
    if (report !== null) this.lastFrameBudget = report
    if (report === null || !this.debugSettings.isFrameBudgetShown) return
    const counts = this.sceneCounts()
    this.frameBudgetPanel.show(report, counts)
    this.log(`frame budget: ${linesOf(report, counts).join('; ')}`)
  }

  private sceneCounts(): SceneCounts {
    const { render, memory, programs } = this.host.renderer.info
    let sceneObjects = 0
    this.scene.traverse(() => (sceneObjects += 1))
    return { drawCallsPerFrame: render.calls, trianglesPerFrame: render.triangles, geometries: memory.geometries, textures: memory.textures, shaderPrograms: programs?.length ?? 0, sceneObjects, pageElements: document.getElementsByTagName('*').length }
  }

  private changeTheDebugSettings(change: Partial<DebugSettings>, why: string): void {
    this.debugSettings = { ...this.debugSettings, ...change }
    this.debugSettingsStore.keep(this.debugSettings)
    this.showTheDebugSettings()
    this.log(why)
  }

  private showTheDebugSettings(): void {
    if (!this.debugSettings.isFrameBudgetShown) this.frameBudgetPanel.hide()
    this.host.runTheWorldAt(this.debugSettings.isTheWorldFast ? fastWorldTimeScale : 1)
    this.walker.playTheSparrowAnimation(this.debugSettings.sparrowAnimation)
  }

  private noticeTheProphecyIfSeenWhole(): void {
    if (this.visit.achievements.isUnlocked('delphicOracle')) return
    const inscription = this.room.prophecyInscription
    if (inscription === null || !isSeenWhole(inscription, this.camera, [this.room.root, this.walker.root])) return
    this.visit.achievements.prophecySeenWhole()
  }

  private walkAndLookInFirstPerson(seconds: number): void {
    if (this.settings.cameraMode !== 'firstPerson' || this.playerController.aimedPourView !== null || this.playerController.inspectionView !== null) return
    const { controlScheme, stickLayout } = this.settings
    const mouseMovement = usesTheMouse(controlScheme) ? this.keyboardAndMouse.takeTheMouseMovement() : null
    this.look = this.lookAlongTheWalk.lookAfterAFrame(this.look, { mouseMovement, lookStick: stickWithRole('look', controlScheme, stickLayout, this.sticksHeld()) }, this.playerController.walk, this.playerController.walksStarted, seconds)
    if (mouseMovement !== null && this.keyboardAndMouse.isLocked) this.touchInput.crosshairSwept(Math.hypot(mouseMovement.x, mouseMovement.y))
    this.playerController.firstPersonLookTurned(this.look.headingRadians)
    const walking = walkAsked(controlScheme, stickLayout, this.keyboardAndMouse.keysHeld, this.sticksHeld())
    if (walking.right === 0 && walking.up === 0) return this.playerController.stopWalkingFreely()
    this.playerController.standUpToWalk()
    this.playerController.walkFreely(stepFor(walking, this.look.headingRadians, seconds), this.look.headingRadians)
  }

  private sticksHeld(): SticksHeld {
    return { left: this.joysticks.left, right: this.joysticks.right }
  }

  private screenControlsShown() {
    return screenControlsShown({ cameraMode: this.settings.cameraMode, controlScheme: this.settings.controlScheme, stickLayout: this.settings.stickLayout, mode: this.playerController.mode })
  }

  private restoreTheCamera(camera: SavedCamera): void {
    this.look = camera.look
    this.log('the first-person look is back as the visit left it')
  }

  private keepTheVisitWhenThePageIsLeft(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.visit.pageLeft('the page was hidden', this.look)
      if (document.visibilityState === 'hidden') this.sounds.pageHidden()
      else this.sounds.pageShown()
    })
    window.addEventListener('pagehide', () => this.visit.pageLeft('the page was left', this.look))
  }

  private settingChosen(change: Partial<RoomSettings>): void {
    this.changeTheSettings(change, 'from the settings')
    if (!this.room.isTheSettingsGearTurning) this.sounds.playOnce('settingsGear')
    this.room.turnTheSettingsGearOneTooth()
  }

  private changeTheSettings(change: Partial<RoomSettings>, how: string): void {
    const cameraModeBefore = this.settings.cameraMode
    this.settings = { ...this.settings, ...change }
    if (this.settings.cameraMode !== cameraModeBefore) this.cameraModeChanged()
    this.settingsStore.keep(this.settings)
    this.applyTheSettings()
    this.log(`the settings change ${how}: ${describeSettings(change)}`)
  }

  private applyTheSettings(): void {
    this.showTheAchievementsOnTheWall(this.settings.areAchievementsShown)
    this.sounds.setOverallLoudness(shareOfEverySoundsLoudnessBySetting[this.settings.soundLoudness])
    this.walker.paintTheBody(this.settings.coatColour)
    this.walker.showTheFaces(this.settings.faceFeaturesShown)
    this.frameRateCounter.show(this.settings.isFrameRateShown)
    this.host.showTheResolution(this.settings.hasFullResolution, this.camera)
    this.host.showSmoothEdges(this.settings.hasSmoothEdges)
    this.host.showSoftShadowsInCorners(this.settings.hasSoftShadowsInCorners, this.scene, this.camera)
    this.showTheGlow(this.settings.hasGlow)
    this.garden.showDistantFlowers(this.settings.objectDetail)
    this.walker.showTheSparrowShadow(this.settings.objectDetail)
  }

  private showTheAchievementsOnTheWall(areShown: boolean): void {
    this.room.showTheMedal(areShown)
    if (!areShown) this.achievementNotice.dismissEveryNotice()
  }

  private showTheGlow(isOn: boolean): void {
    this.host.showTheGlow(isOn, () => new GlowPass(this.host.renderer, this.scene, this.camera, [this.garden.root, this.sky.root], this.log))
  }

  private cameraModeChanged(): void {
    if (this.settings.cameraMode === 'firstPerson') this.look = { headingRadians: this.playerController.walk.headingRadians, pitchRadians: 0 }
    else this.playerController.stopWalkingFreely()
  }

  private showThePlayerSittingDownOrStandingUp(seconds: number): void {
    const isSeated = this.settings.cameraMode === 'firstPerson' && this.playerController.isSeatedAtTheRitualPlace
    this.look = this.sittingDown.lookAfterAFrame({ isSeated, look: this.look, tableInView: this.playerController.closeUpInView?.target ?? null, walker: this.playerController.walk.position, playerHeightCentimetres: this.debugSettings.playerHeightCentimetres }, seconds)
  }

  private moveCamera(seconds: number): void {
    const areTheGearsWatched = this.settingsScreen.isShown
    if (areTheGearsWatched !== this.wereTheGearsWatched) this.log(areTheGearsWatched ? 'the camera turns to the gears on the wall while the settings are open' : 'the camera goes back as the settings close')
    this.wereTheGearsWatched = areTheGearsWatched
    if (areTheGearsWatched) return this.watchTheGears(seconds)
    this.zoom.viewShown(this.playerController.view)
    this.showThePlayerSittingDownOrStandingUp(seconds)
    const isFirstPersonView = this.settings.cameraMode === 'firstPerson'
    if (isFirstPersonView && !this.wasFirstPersonView) this.beginTheGlideIntoFirstPerson()
    this.wasFirstPersonView = isFirstPersonView
    this.showFieldOfView(isFirstPersonView ? firstPersonFieldOfViewDegrees : cameraFieldOfViewDegrees, seconds)
    const goal = isFirstPersonView ? this.cameraGoal() : zoomedPose(this.cameraGoal(), this.zoom.distanceShare)
    this.cameraPose = isFirstPersonView ? this.poseOnTheWayToTheEyes(goal, seconds) : poseEasedTowards(this.cameraPose, goal, seconds)
    this.camera.position.set(this.cameraPose.position.x, this.cameraPose.position.y, this.cameraPose.position.z)
    this.camera.lookAt(this.cameraPose.target.x, this.cameraPose.target.y, this.cameraPose.target.z)
    this.camera.updateMatrixWorld()
  }

  private beginTheGlideIntoFirstPerson(): void {
    this.glideIntoFirstPerson = { poseWhereItBegan: this.cameraPose, secondsSoFar: 0 }
    this.log(`first person begins, and the camera glides into the player's eyes over ${firstPersonGlideSeconds} s`)
  }

  private poseOnTheWayToTheEyes(eyes: CameraPose, seconds: number): CameraPose {
    const glide = this.glideIntoFirstPerson
    if (glide === null) return eyes
    glide.secondsSoFar += seconds
    if (glide.secondsSoFar < firstPersonGlideSeconds) return poseGlidingIntoFirstPerson(glide.poseWhereItBegan, eyes, glide.secondsSoFar)
    this.glideIntoFirstPerson = null
    this.log("the camera has glided into the player's eyes, and first person follows them from now on")
    return eyes
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

  private drawTheGlassBeforeItIsSeen(): void {
    const partsCulledOutOfView: THREE.Object3D[] = []
    this.scene.traverse((part) => {
      if (!part.frustumCulled) return
      partsCulledOutOfView.push(part)
      part.frustumCulled = false
    })
    this.carried.drawWithTheGlassTransmittingAndClear(() => this.render())
    for (const part of partsCulledOutOfView) part.frustumCulled = true
  }

  private render(): void {
    const shadowPose = `${this.roomLights.sunPose} | ${this.walker.shadowPose} | ${this.carried.shadowCastersPose()} | ${this.room.shadowCastersPose()}`
    this.host.drawTheShadowsWhenThePoseChanges(shadowPose)
    this.host.renderer.clear()
    roomLayers.showThePassTo(this.camera, 'room')
    this.host.drawThePicture(this.scene, this.camera)
    this.host.frameBudget.phaseEnded('roomPass', performance.now())
    this.host.drawTheGlowOver()
    this.host.frameBudget.phaseEnded('glowPass', performance.now())
    this.host.renderer.clearDepth()
    const heldItemsCamera = this.heldItemsCamera()
    roomLayers.showThePassTo(heldItemsCamera, 'heldInView')
    this.host.renderer.render(this.scene, heldItemsCamera)
    this.host.frameBudget.phaseEnded('heldItemsPass', performance.now())
    if (this.playerController.inspectionView !== null) this.drawTheInspectedItemOverTheDimmedRoom()
    this.host.frameBudget.phaseEnded('inspectionPass', performance.now())
    this.host.drawTheSmoothingOver()
    this.host.frameBudget.phaseEnded('smoothingPass', performance.now())
    roomLayers.showThePassTo(this.camera, 'room')
  }

  private drawTheInspectedItemOverTheDimmedRoom(): void {
    this.inspectionStage.dimWhatIsDrawn(this.host.renderer)
    this.host.renderer.clearDepth()
    roomLayers.showThePassTo(this.camera, 'inspected')
    this.host.renderer.render(this.scene, this.camera)
  }

  private cameraGoal(): CameraPose {
    const closeUp = this.playerController.closeUpInView
    if (this.settings.cameraMode === 'firstPerson') return firstPersonPose(this.playerController.walk.position, this.look, eyeHeightMetres(this.debugSettings.playerHeightCentimetres, this.sittingDown.seatedShare))
    if (closeUp !== null) return closeUpPose(closeUp, this.camera.aspect)
    return overviewPose(this.playerController.walk.position, this.camera.aspect)
  }

  private listenToPresses(): void {
    const canvas = this.host.renderer.domElement
    canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && this.mayCatchTheMouse() && !this.keyboardAndMouse.isLocked) return this.keyboardAndMouse.catchTheMouse()
      this.touchInput.fingerDown(event.pointerId, this.pointOfThe(event))
    })
    canvas.addEventListener('pointermove', (event) => {
      this.touchInput.fingerMoved(event.pointerId, this.pointOfThe(event))
      if (event.pointerType === 'mouse' && event.buttons === 0 && this.settings.cameraMode === 'room') this.turnTheWalkerTowardsTheMouse(this.pointOfThe(event))
    })
    canvas.addEventListener('pointerup', (event) => this.touchInput.fingerUp(event.pointerId))
    canvas.addEventListener('pointercancel', (event) => this.touchInput.fingerCancelled(event.pointerId))
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault()
      this.touchInput.wheelTurned(event.deltaY)
    }, { passive: false })
    for (const safariGesture of ['gesturestart', 'gesturechange']) document.addEventListener(safariGesture, (event) => event.preventDefault())
  }

  private mayCatchTheMouse(): boolean {
    return this.screenControlsShown().mayHoldTheMouse && this.keyboardAndMouse.mayBeCaught
  }

  private pointOfThe(event: PointerEvent): ScreenPoint {
    if (!this.keyboardAndMouse.isLocked) return { x: event.clientX, y: event.clientY }
    const bounds = this.host.renderer.domElement.getBoundingClientRect()
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
  }

  private turnTheWalkerTowardsTheMouse(point: ScreenPoint): void {
    this.raycaster.setFromCamera(this.pointerAt(point), this.camera)
    const hit = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3())
    if (hit !== null) this.playerController.mouseMovedOverTheFloor({ x: hit.x, z: hit.z })
  }

  private aimPlanePointAt(point: ScreenPoint): FloorPoint | null {
    this.raycaster.setFromCamera(this.pointerAt(point), this.camera)
    const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.aimPlaneHeight())
    const hit = this.raycaster.ray.intersectPlane(aimPlane, new THREE.Vector3())
    return hit === null ? null : { x: hit.x, z: hit.z }
  }

  private aimPlaneHeight(): number {
    const targetId = this.playerController.aimedPourView?.targetId
    const location = targetId === undefined ? undefined : this.session.state.vessels[targetId]?.location
    return (standingSpotOf(location)?.y ?? 0) + aimPlaneAboveTargetMetres
  }

  private pointerAt(point: ScreenPoint): THREE.Vector2 {
    const bounds = this.host.renderer.domElement.getBoundingClientRect()
    return new THREE.Vector2(((point.x - bounds.left) / bounds.width) * 2 - 1, -((point.y - bounds.top) / bounds.height) * 2 + 1)
  }

  private tapTargetAt(point: ScreenPoint): TapReach {
    return tapTargetUnderTheFinger(point, this.host.renderer.domElement.getBoundingClientRect(), this.tappablePassesDrawnLastFirst(), (target) => this.playerController.doesATapReachPastTheHands(target))
  }

  private tappablePassesDrawnLastFirst(): readonly TappablePass[] {
    const tappable = [...this.room.tappableMeshes, ...this.carried.tappableMeshes, ...this.garden.tappableMeshes]
    const heldInView: TappablePass = { camera: this.heldItemsCamera(), tappable: tappable.filter((mesh) => this.carried.isHeldInView(mesh)), areasOnTheScreen: this.carried.areasOnTheScreen, isDrawnOverTheScene: true }
    const room: TappablePass = { camera: this.camera, tappable: tappable.filter((mesh) => !this.carried.isHeldInView(mesh)), areasOnTheScreen: [], isDrawnOverTheScene: false }
    return [heldInView, room]
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
    this.host.fitToWindow(this.camera)
  }

}

function clothPatternsByIdIn(room: RoomDefinition, arrangement: RoomArrangement): ReadonlyMap<string, ClothPattern> {
  return new Map(room.cloths.map((cloth) => [cloth.id, arrangement.clothPattern]))
}

function shapedItemsIn(state: DeepReadonly<SessionState>, log: AppLog): ShapedItem[] {
  const itemIds = carriedItemIdsIn(state)
  const itemIdsWithoutAShape = itemIds.filter((itemId) => carriedShapeOf(state, itemId) === undefined)
  if (itemIdsWithoutAShape.length > 0) {
    const problem = `the room layout has no shape for ${itemIdsWithoutAShape.join(', ')}, so they are not drawn`
    if (import.meta.env.DEV) throw new Error(problem)
    log(problem, 'error')
  }
  return itemIds.flatMap((itemId) => {
    const shape = carriedShapeOf(state, itemId)
    return shape === undefined ? [] : [{ itemId, shape }]
  })
}
