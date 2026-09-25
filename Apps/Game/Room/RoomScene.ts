import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { definitionIn, type Catalog } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import { carriedItemIdsIn } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { RitualSession } from '../../../Shared/Simulation/Ritual/RitualSession.ts'
import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
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
import { firstPersonFieldOfViewDegrees, firstPersonPose, lookTurnedBy, stepFor, type FirstPersonLook } from './Camera/FirstPersonLook.ts'
import { RoomGestures, type ScreenPoint } from './RoomGestures.ts'
import { carriedShapeOf, furnitureWithId, type CameraPose, type FloorPoint, type ShapedItem } from './RoomLayout.ts'
import type { RoomLog } from './RoomNavigator.ts'
import { RoomPlay, type RitualPort, type RoomTapTarget } from './RoomPlay.ts'
import { captionLinesFor, roomRemarkLine } from './RoomTexts.ts'
import { tapTargetAmong } from './TapTargetAmong.ts'
import { CarriedItems } from './Views/CarriedItems.ts'
import { Garden } from './Views/Garden.ts'
import { roomLayers } from './Views/RoomLayers.ts'
import { daylightAt, hoursSinceSunriseFor } from './Sky/DaylightCycle.ts'
import { DebugMenu, type CameraMode } from './Views/DebugMenu.ts'
import { Joysticks } from './Views/Joysticks.ts'
import { Sky } from './Views/Sky.ts'
import { isWalking } from './Walking/Walk.ts'
import { RoomCaption } from './Views/RoomCaption.ts'
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

export class RoomScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(cameraFieldOfViewDegrees, 1, 0.1, 100)
  private readonly raycaster = newRaycasterSeeingEveryLayer()
  private readonly clock = new THREE.Clock()
  private readonly session: RitualSession
  private readonly catalog: Catalog
  private readonly log: RoomLog
  private readonly voiceSeed: number
  private readonly shareThroughTheTimeOfDay: number
  private readonly play: RoomPlay
  private readonly room: RoomModel
  private readonly walker: WalkerModel
  private readonly carried: CarriedItems
  private readonly sipButton: SipButton
  private readonly pourControls: PourControls
  private readonly caption: RoomCaption
  private readonly debugMenu: DebugMenu
  private readonly joysticks: Joysticks
  private readonly garden: Garden
  private readonly sky = new Sky()
  private readonly zoom = new CameraZoom()
  private readonly gestures: RoomGestures
  private readonly roomLights = new RoomLights()
  private cameraPose: CameraPose
  private cameraMode: CameraMode = 'room'
  private look: FirstPersonLook = { headingRadians: Math.PI, pitchRadians: 0 }
  private shadowPoseLastDrawn = ''

  constructor(container: HTMLElement, session: RitualSession, catalog: Catalog, log: RoomLog, voiceSeed: number, shareThroughTheTimeOfDay: number) {
    this.session = session
    this.catalog = catalog
    this.log = log
    this.voiceSeed = voiceSeed
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
    this.play = new RoomPlay(ritual, catalog, log, {
      remarked: (remark) => this.caption.show([roomRemarkLine(remark, this.voiceSeed)]),
      debugMenuAsked: () => this.debugMenu.open(this.cameraMode),
    })
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
    this.joysticks = new Joysticks(container)
    this.debugMenu = new DebugMenu(container, { cameraModeChosen: (mode) => this.cameraModeChosen(mode) })
    this.garden = new Garden(materials)
    this.scene.add(this.room.root, this.garden.root, this.sky.root, this.walker.root, this.carried.root, ...this.roomLights.lights)
    this.fitToWindow()
    this.cameraPose = overviewPose(this.play.walk.position, this.camera.aspect)
    this.listenToPresses()
    window.addEventListener('resize', () => this.fitToWindow())
    this.renderer.setAnimationLoop(() => this.frame())
  }

  private frame(): void {
    const seconds = Math.min(this.clock.getDelta(), longestFrameSeconds)
    this.walkAndLookInFirstPerson(seconds)
    this.play.advance(seconds)
    this.reactTo(this.session.advance(seconds))
    this.caption.advance(seconds)
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
    if (isWalking(walk)) this.look = { ...this.look, headingRadians: walk.headingRadians }
    this.look = lookTurnedBy(this.look, this.joysticks.look, seconds)
    const stick = this.joysticks.walk
    if (stick.right === 0 && stick.up === 0) return this.play.stopWalkingFreely()
    this.play.walkFreely(stepFor(stick, this.look.headingRadians, seconds), this.look.headingRadians)
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
    this.showFieldOfView(isFirstPersonView ? firstPersonFieldOfViewDegrees : cameraFieldOfViewDegrees)
    const goal = this.cameraGoal()
    this.cameraPose = isFirstPersonView ? goal : poseEasedTowards(this.cameraPose, zoomedPose(goal, this.zoom.distanceShare), seconds)
    this.camera.position.set(this.cameraPose.position.x, this.cameraPose.position.y, this.cameraPose.position.z)
    this.camera.lookAt(this.cameraPose.target.x, this.cameraPose.target.y, this.cameraPose.target.z)
    this.camera.updateMatrixWorld()
  }

  private showFieldOfView(degrees: number): void {
    if (this.camera.fov === degrees) return
    this.camera.fov = degrees
    this.camera.updateProjectionMatrix()
  }

  private render(): void {
    const shadowPose = `${this.roomLights.sunPose} | ${this.walker.shadowPose} | ${this.carried.shadowCastersPose()}`
    this.renderer.shadowMap.needsUpdate = shadowPose !== this.shadowPoseLastDrawn
    this.shadowPoseLastDrawn = shadowPose
    this.renderer.clear()
    this.camera.layers.set(roomLayers.room)
    this.camera.layers.enable(roomLayers.untappableRoom)
    this.renderer.render(this.scene, this.camera)
    this.renderer.clearDepth()
    this.camera.layers.set(roomLayers.heldInView)
    this.renderer.render(this.scene, this.camera)
    this.camera.layers.set(roomLayers.room)
  }

  private reactTo(events: readonly RitualEvent[]): readonly RitualEvent[] {
    this.caption.show(captionLinesFor(events, this.voiceSeed))
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
