import * as THREE from 'three'
import { definitionIn, type Catalog } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import { caddyItemId } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { RitualSession } from '../../../Shared/Simulation/Ritual/RitualSession.ts'
import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import { tableViewState } from '../Table/TablePresenter.ts'
import { remarkText, tasteCardLines } from '../Table/TableTexts.ts'
import { cameraFieldOfViewDegrees, closeUpPose, overviewPose, poseEasedTowards } from './Camera/CameraPoses.ts'
import { carriedItemShapes, furnitureWithId, type CameraPose } from './RoomLayout.ts'
import type { RoomLog } from './RoomNavigator.ts'
import { RoomPlay, type RitualPort, type RoomTapTarget } from './RoomPlay.ts'
import { offeringResponseText } from './RoomTexts.ts'
import { CarriedItems } from './Views/CarriedItems.ts'
import { HandButtons } from './Views/HandButtons.ts'
import { RoomCaption } from './Views/RoomCaption.ts'
import { RoomMaterials } from './Views/RoomMaterials.ts'
import { RoomModel, type TapTargetTag } from './Views/RoomModel.ts'
import { WalkerModel } from './Views/WalkerModel.ts'

const backgroundColour = '#f6e9d6'
const longestFrameSeconds = 0.1
const tapSlopPixels = 12
const smallestUpwardNormalOfASurface = 0.7
const heaterGlowColour = new THREE.Color('#e0603a')
const heaterGlowIntensity = 0.8

export class RoomScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(cameraFieldOfViewDegrees, 1, 0.1, 100)
  private readonly raycaster = new THREE.Raycaster()
  private readonly clock = new THREE.Clock()
  private readonly session: RitualSession
  private readonly catalog: Catalog
  private readonly play: RoomPlay
  private readonly room: RoomModel
  private readonly walker: WalkerModel
  private readonly carried: CarriedItems
  private readonly hands: HandButtons
  private readonly caption: RoomCaption
  private cameraPose: CameraPose
  private pressStart: { x: number; y: number } | null = null

  constructor(container: HTMLElement, session: RitualSession, catalog: Catalog, log: RoomLog) {
    this.session = session
    this.catalog = catalog
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.append(this.renderer.domElement)
    const ritual: RitualPort = {
      get state() {
        return session.state
      },
      dispatch: (command) => this.reactTo(session.dispatch(command)),
    }
    this.play = new RoomPlay(ritual, catalog, log)
    const materials = new RoomMaterials()
    const roomDefinition = definitionIn(catalog, 'rooms', session.state.roomId)
    this.room = new RoomModel(materials, roomDefinition.heaterSpot)
    this.walker = new WalkerModel(materials)
    const carriedItemIds = [...roomDefinition.vessels.map((vessel) => vessel.id), caddyItemId]
    reportItemsWithoutAShape(carriedItemIds, log)
    this.carried = new CarriedItems(materials, carriedItemIds)
    this.hands = new HandButtons(
      container,
      (handIndex) => this.play.handTapped(handIndex),
      () => this.play.sipTapped(),
    )
    this.caption = new RoomCaption(container)
    this.scene.background = new THREE.Color(backgroundColour)
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
    const state = this.session.state
    const table = tableViewState(state, this.catalog)
    this.carried.show({ state, table, walk: this.play.walk, isWalkerShown, timeSeconds: this.clock.elapsedTime })
    this.showHeater(table.heater.isOn)
    this.room.showRitualTools(table.spoonFillShare, this.play.chosenTool)
    this.room.showPuddle(table.puddleShare)
    this.hands.show({ hands: state.keeper.hands, selectedHandIndex: this.play.selectedHandIndex, canSip: this.play.sippableCupId !== null })
    this.cameraPose = poseEasedTowards(this.cameraPose, this.cameraGoal(), seconds)
    this.camera.position.set(this.cameraPose.position.x, this.cameraPose.position.y, this.cameraPose.position.z)
    this.camera.lookAt(this.cameraPose.target.x, this.cameraPose.target.y, this.cameraPose.target.z)
    this.renderer.render(this.scene, this.camera)
  }

  private reactTo(events: readonly RitualEvent[]): readonly RitualEvent[] {
    this.caption.show(events.flatMap(captionLinesOf))
    return events
  }

  private showHeater(isOn: boolean): void {
    const material = this.room.heaterPlate.material
    if (!(material instanceof THREE.MeshStandardMaterial)) return
    material.emissive.copy(isOn ? heaterGlowColour : new THREE.Color(0x000000))
    material.emissiveIntensity = isOn ? heaterGlowIntensity : 0
  }

  private cameraGoal(): CameraPose {
    const view = this.play.view
    if (view.kind === 'closeUp') return closeUpPose(furnitureWithId(view.furnitureId).closeUp, this.camera.aspect)
    return overviewPose(this.play.walk.position, this.camera.aspect)
  }

  private listenToPresses(): void {
    const canvas = this.renderer.domElement
    canvas.addEventListener('pointerdown', (event) => {
      this.pressStart = { x: event.clientX, y: event.clientY }
      this.play.pressStarted(this.tapTargetAt(event.clientX, event.clientY))
    })
    canvas.addEventListener('pointermove', (event) => {
      const start = this.pressStart
      if (start === null || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= tapSlopPixels) return
      this.play.pressMovedAway()
      this.play.pressMovedOver(this.tapTargetAt(event.clientX, event.clientY))
    })
    const pressEnded = (): void => {
      this.pressStart = null
      this.play.pressEnded()
    }
    canvas.addEventListener('pointerup', pressEnded)
    canvas.addEventListener('pointercancel', pressEnded)
  }

  private tapTargetAt(clientX: number, clientY: number): RoomTapTarget {
    const bounds = this.renderer.domElement.getBoundingClientRect()
    const pointer = new THREE.Vector2(((clientX - bounds.left) / bounds.width) * 2 - 1, -((clientY - bounds.top) / bounds.height) * 2 + 1)
    this.raycaster.setFromCamera(pointer, this.camera)
    const tappable = [...this.room.tappableMeshes, ...this.carried.tappableMeshes]
    const [nearest] = this.raycaster.intersectObjects(tappable, true).filter((hit) => isShown(hit.object))
    const tag = nearest?.object.userData['tapTarget'] as TapTargetTag | undefined
    if (nearest === undefined || tag === undefined) return { kind: 'nothing' }
    if ('itemId' in tag) return { kind: 'item', itemId: tag.itemId }
    if ('handIndex' in tag) return { kind: 'hand', handIndex: tag.handIndex }
    if ('isHeater' in tag) return { kind: 'heater' }
    if ('isHeaterSwitch' in tag) return { kind: 'heaterSwitch' }
    if ('isFloor' in tag) return { kind: 'floor', point: { x: nearest.point.x, z: nearest.point.z } }
    if ('lidOfItemId' in tag) return { kind: 'lid', itemId: tag.lidOfItemId }
    if ('tool' in tag) return { kind: 'tool', tool: tag.tool }
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

function reportItemsWithoutAShape(itemIds: readonly string[], log: RoomLog): void {
  const itemIdsWithoutAShape = itemIds.filter((itemId) => carriedItemShapes[itemId] === undefined)
  if (itemIdsWithoutAShape.length === 0) return
  const problem = `the room layout has no shape for ${itemIdsWithoutAShape.join(', ')}, so they are not drawn`
  if (import.meta.env.DEV) throw new Error(problem)
  log(problem)
}

function captionLinesOf(event: RitualEvent): readonly string[] {
  switch (event.type) {
    case 'teaTasted':
      return tasteCardLines(event.verdict)
    case 'figurineAcceptedTea':
      return [offeringResponseText(event.figurineId, event.response)]
    case 'godsMoodChanged':
      return [remarkText(event.remark)]
    default:
      return []
  }
}

function isShown(object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object
  while (current !== null) {
    if (!current.visible) return false
    current = current.parent
  }
  return true
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
  return [skyAndFloor, eveningSun, fill]
}
