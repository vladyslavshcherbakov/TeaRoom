import * as THREE from 'three'
import { furnitureWithId, type CameraPose } from './RoomLayout.ts'
import { RoomNavigator, type RoomLog, type TapTarget } from './RoomNavigator.ts'
import { cameraFieldOfViewDegrees, closeUpPose, overviewPose, poseEasedTowards } from './Camera/CameraPoses.ts'
import { RoomMaterials } from './Views/RoomMaterials.ts'
import { RoomModel, type TapTargetTag } from './Views/RoomModel.ts'
import { WalkerModel } from './Views/WalkerModel.ts'

const backgroundColour = '#f6e9d6'
const longestFrameSeconds = 0.1
const tapSlopPixels = 12
const tapLongestMs = 500

export class RoomScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(cameraFieldOfViewDegrees, 1, 0.1, 100)
  private readonly raycaster = new THREE.Raycaster()
  private readonly clock = new THREE.Clock()
  private readonly navigator: RoomNavigator
  private readonly room: RoomModel
  private readonly walker: WalkerModel
  private cameraPose: CameraPose
  private pressStart: { x: number; y: number; atMs: number } | null = null

  constructor(container: HTMLElement, log: RoomLog) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.append(this.renderer.domElement)
    this.navigator = new RoomNavigator(log)
    const materials = new RoomMaterials()
    this.room = new RoomModel(materials)
    this.walker = new WalkerModel(materials)
    this.scene.background = new THREE.Color(backgroundColour)
    this.scene.add(this.room.root, this.walker.root, ...lights())
    this.fitToWindow()
    this.cameraPose = overviewPose(this.navigator.walk.position, this.camera.aspect)
    this.listenToTaps()
    window.addEventListener('resize', () => this.fitToWindow())
    this.renderer.setAnimationLoop(() => this.frame())
  }

  private frame(): void {
    const seconds = Math.min(this.clock.getDelta(), longestFrameSeconds)
    this.navigator.advance(seconds)
    this.walker.show(this.navigator.walk, this.clock.elapsedTime)
    this.walker.root.visible = this.navigator.view.kind !== 'closeUp'
    this.cameraPose = poseEasedTowards(this.cameraPose, this.cameraGoal(), seconds)
    this.camera.position.set(this.cameraPose.position.x, this.cameraPose.position.y, this.cameraPose.position.z)
    this.camera.lookAt(this.cameraPose.target.x, this.cameraPose.target.y, this.cameraPose.target.z)
    this.renderer.render(this.scene, this.camera)
  }

  private cameraGoal(): CameraPose {
    const view = this.navigator.view
    if (view.kind === 'closeUp') return closeUpPose(furnitureWithId(view.furnitureId).closeUp, this.camera.aspect)
    return overviewPose(this.navigator.walk.position, this.camera.aspect)
  }

  private listenToTaps(): void {
    const canvas = this.renderer.domElement
    canvas.addEventListener('pointerdown', (event) => {
      this.pressStart = { x: event.clientX, y: event.clientY, atMs: event.timeStamp }
    })
    canvas.addEventListener('pointerup', (event) => {
      const press = this.pressStart
      this.pressStart = null
      if (press === null) return
      const isTap = Math.hypot(event.clientX - press.x, event.clientY - press.y) <= tapSlopPixels && event.timeStamp - press.atMs <= tapLongestMs
      if (isTap) this.navigator.tapped(this.tapTargetAt(event.clientX, event.clientY))
    })
  }

  private tapTargetAt(clientX: number, clientY: number): TapTarget {
    const bounds = this.renderer.domElement.getBoundingClientRect()
    const pointer = new THREE.Vector2(((clientX - bounds.left) / bounds.width) * 2 - 1, -((clientY - bounds.top) / bounds.height) * 2 + 1)
    this.raycaster.setFromCamera(pointer, this.camera)
    const [nearest] = this.raycaster.intersectObjects(this.room.tappableMeshes, true)
    const tag = nearest?.object.userData['tapTarget'] as TapTargetTag | undefined
    if (nearest === undefined || tag === undefined) return { kind: 'nothing' }
    if ('furnitureId' in tag) return { kind: 'furniture', furnitureId: tag.furnitureId }
    return { kind: 'floor', point: { x: nearest.point.x, z: nearest.point.z } }
  }

  private fitToWindow(): void {
    const width = window.innerWidth
    const height = window.innerHeight
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }
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
