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
import { RoomGestures, type ScreenPoint } from './RoomGestures.ts'
import { carriedShapeOf, furnitureWithId, type CameraPose, type FloorPoint, type ShapedItem } from './RoomLayout.ts'
import type { RoomLog } from './RoomNavigator.ts'
import { RoomPlay, type RitualPort, type RoomTapTarget } from './RoomPlay.ts'
import { captionLinesFor, roomRemarkLine } from './RoomTexts.ts'
import { CarriedItems } from './Views/CarriedItems.ts'
import { roomLayers } from './Views/RoomLayers.ts'
import { RoomCaption } from './Views/RoomCaption.ts'
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

export class RoomScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(cameraFieldOfViewDegrees, 1, 0.1, 100)
  private readonly raycaster = newRaycasterSeeingEveryLayer()
  private readonly clock = new THREE.Clock()
  private readonly session: RitualSession
  private readonly catalog: Catalog
  private readonly voiceSeed: number
  private readonly play: RoomPlay
  private readonly room: RoomModel
  private readonly walker: WalkerModel
  private readonly carried: CarriedItems
  private readonly sipButton: SipButton
  private readonly pourControls: PourControls
  private readonly caption: RoomCaption
  private cameraPose: CameraPose
  private readonly zoom = new CameraZoom()
  private readonly gestures: RoomGestures

  constructor(container: HTMLElement, session: RitualSession, catalog: Catalog, log: RoomLog, voiceSeed: number) {
    this.session = session
    this.catalog = catalog
    this.voiceSeed = voiceSeed
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.autoClear = false
    this.renderer.setClearColor(backgroundColour)
    container.append(this.renderer.domElement)
    const ritual: RitualPort = {
      get state() {
        return session.state
      },
      dispatch: (command) => this.reactTo(session.dispatch(command)),
    }
    this.play = new RoomPlay(ritual, catalog, log, (remark) => this.caption.show([roomRemarkLine(remark, this.voiceSeed)]))
    this.gestures = new RoomGestures(this.play, this.zoom, { tapTargetAt: (point) => this.tapTargetAt(point), aimPointAt: (point) => this.aimPlanePointAt(point) }, log)
    const materials = new RoomMaterials(reflectionsOfTheRoom(this.renderer))
    const roomDefinition = definitionIn(catalog, 'rooms', session.state.roomId)
    this.room = new RoomModel(materials, roomDefinition.heaterSpot)
    this.walker = new WalkerModel(materials)
    this.carried = new CarriedItems(materials, shapedItemsIn(session.state, log), roomDefinition.tap?.sinkSpot ?? null)
    this.sipButton = new SipButton(container, () => this.play.sipTapped())
    this.pourControls = new PourControls(container, {
      tiltPressed: () => this.play.tiltPressed(),
      tiltReleased: () => this.play.tiltReleased(),
    })
    this.caption = new RoomCaption(container)
    this.scene.add(this.room.root, this.walker.root, this.carried.root, ...lights())
    this.fitToWindow()
    this.cameraPose = overviewPose(this.play.walk.position, this.camera.aspect)
    this.listenToPresses()
    window.addEventListener('resize', () => this.fitToWindow())
    this.renderer.setAnimationLoop(() => this.frame())
  }

  private frame(): void {
    const seconds = Math.min(this.clock.getDelta(), longestFrameSeconds)
    this.play.advance(seconds)
    this.reactTo(this.session.advance(seconds))
    this.caption.advance(seconds)
    const isWalkerShown = this.play.view.kind !== 'closeUp'
    this.walker.show(this.play.walk, this.clock.elapsedTime)
    this.walker.root.visible = isWalkerShown
    this.moveCamera(seconds)
    const state = this.session.state
    const table = tableViewState(state, this.catalog)
    const heldInView = isWalkerShown ? null : { camera: this.camera, chosenHandIndex: this.play.chosenHandIndex }
    this.carried.show({ state, table, walk: this.play.walk, heldInView, aimedPour: this.play.aimedPourView, clothOnTheTableAt: this.play.clothOnTheTableAt, timeSeconds: this.clock.elapsedTime })
    this.room.showHeater(table.isHeaterOn)
    this.room.showPuddle(table.puddleShare)
    const isAiming = this.play.aimedPourView !== null
    this.sipButton.show(this.play.sippableCupId !== null && !isAiming)
    this.pourControls.show(isAiming)
    this.render()
  }

  private moveCamera(seconds: number): void {
    this.zoom.viewShown(this.play.view)
    this.cameraPose = poseEasedTowards(this.cameraPose, zoomedPose(this.cameraGoal(), this.zoom.distanceShare), seconds)
    this.camera.position.set(this.cameraPose.position.x, this.cameraPose.position.y, this.cameraPose.position.z)
    this.camera.lookAt(this.cameraPose.target.x, this.cameraPose.target.y, this.cameraPose.target.z)
    this.camera.updateMatrixWorld()
  }

  private render(): void {
    this.renderer.clear()
    this.camera.layers.set(roomLayers.room)
    this.camera.layers.enable(roomLayers.untappableRoom)
    this.renderer.render(this.scene, this.camera)
    this.renderer.clearDepth()
    this.renderer.shadowMap.autoUpdate = false
    this.camera.layers.set(roomLayers.heldInView)
    this.renderer.render(this.scene, this.camera)
    this.renderer.shadowMap.autoUpdate = true
    this.camera.layers.set(roomLayers.room)
  }

  private reactTo(events: readonly RitualEvent[]): readonly RitualEvent[] {
    this.caption.show(captionLinesFor(events, this.voiceSeed))
    return events
  }

  private cameraGoal(): CameraPose {
    const view = this.play.view
    if (view.kind === 'closeUp') return closeUpPose(furnitureWithId(view.furnitureId).closeUp, this.camera.aspect)
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
    const tappable = [...this.room.tappableMeshes, ...this.carried.tappableMeshes]
    const [nearest] = this.raycaster.intersectObjects(tappable, true).filter((hit) => isShown(hit.object))
    const tag = nearest === undefined ? undefined : tapTargetTagOf(nearest.object)
    if (nearest === undefined || tag === undefined) return { kind: 'nothing' }
    if ('itemId' in tag) return { kind: 'item', itemId: tag.itemId }
    if ('handIndex' in tag) return { kind: 'hand', handIndex: tag.handIndex }
    if ('isHeater' in tag) return { kind: 'heater' }
    if ('isHeaterSwitch' in tag) return { kind: 'heaterSwitch' }
    if ('isFaucet' in tag) return { kind: 'faucet' }
    if ('isFloor' in tag) return { kind: 'floor', point: { x: nearest.point.x, z: nearest.point.z } }
    if ('lidOfItemId' in tag) return { kind: 'lid', itemId: tag.lidOfItemId }
    if ('figurineId' in tag) return { kind: 'figurine', figurineId: tag.figurineId }
    const upwardNormal = nearest.face?.normal.clone().transformDirection(nearest.object.matrixWorld).y ?? 0
    if (upwardNormal < smallestUpwardNormalOfASurface) return { kind: 'furniture', furnitureId: tag.furnitureId }
    return { kind: 'surface', furnitureId: tag.furnitureId, point: { x: nearest.point.x, y: nearest.point.y, z: nearest.point.z } }
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

function lights(): THREE.Light[] {
  const skyAndFloor = new THREE.HemisphereLight('#fff4e0', '#c9a27a', 1.6)
  const eveningSun = new THREE.DirectionalLight('#ffd9b0', 2.2)
  eveningSun.position.set(2.5, 5, -6)
  eveningSun.castShadow = true
  eveningSun.shadow.mapSize.set(1024, 1024)
  eveningSun.shadow.camera.left = -5
  eveningSun.shadow.camera.right = 5
  eveningSun.shadow.camera.top = 5
  eveningSun.shadow.camera.bottom = -5
  eveningSun.shadow.bias = -0.0005
  const fill = new THREE.DirectionalLight('#dfe8ff', 0.6)
  fill.position.set(6, 4, 6)
  const allLights = [skyAndFloor, eveningSun, fill]
  for (const light of allLights) light.layers.enableAll()
  return allLights
}
