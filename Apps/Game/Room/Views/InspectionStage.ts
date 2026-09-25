import * as THREE from 'three'
import { inspectedDistanceMetres } from './Carried/InspectedInView.ts'
import { roomLayers } from './RoomLayers.ts'

const dimmingColour = '#1c140d'
const dimmingOpacity = 0.6
const keyLightColour = '#fff4e6'
const keyLightIntensity = 1.6
const keyLightInCamera = new THREE.Vector3(-0.5, 0.6, 0.3)

export class InspectionStage {
  private readonly dimmingScene = new THREE.Scene()
  private readonly dimmingCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly keyLight = new THREE.DirectionalLight(keyLightColour, keyLightIntensity)
  readonly lights: readonly THREE.Object3D[]

  constructor() {
    const dimming = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: dimmingColour, transparent: true, opacity: dimmingOpacity, depthTest: false, depthWrite: false }))
    this.dimmingScene.add(dimming)
    this.keyLight.layers.set(roomLayers.inspected)
    this.lights = [this.keyLight, this.keyLight.target]
  }

  followTheCamera(camera: THREE.PerspectiveCamera): void {
    this.keyLight.position.copy(camera.localToWorld(keyLightInCamera.clone()))
    this.keyLight.target.position.copy(camera.localToWorld(new THREE.Vector3(0, 0, -inspectedDistanceMetres)))
    this.keyLight.target.updateMatrixWorld()
  }

  dimWhatIsDrawn(renderer: THREE.WebGLRenderer): void {
    renderer.render(this.dimmingScene, this.dimmingCamera)
  }
}
