import * as THREE from 'three'

const keyLightColour = '#fff4e6'
const keyLightIntensity = 1.6
const keyLightInCamera = new THREE.Vector3(-0.5, 0.6, 0.3)

export class CloseLookStage {
  private readonly dimmingScene = new THREE.Scene()
  private readonly dimmingCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly keyLight = new THREE.DirectionalLight(keyLightColour, keyLightIntensity)
  private readonly distanceMetres: number
  readonly lights: readonly THREE.Object3D[]

  constructor(dimming: THREE.Material, distanceMetres: number, showTheLightToThePass: (light: THREE.Object3D) => void) {
    this.dimmingScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dimming))
    this.distanceMetres = distanceMetres
    showTheLightToThePass(this.keyLight)
    this.lights = [this.keyLight, this.keyLight.target]
  }

  followTheCamera(camera: THREE.PerspectiveCamera): void {
    this.keyLight.position.copy(camera.localToWorld(keyLightInCamera.clone()))
    this.keyLight.target.position.copy(camera.localToWorld(new THREE.Vector3(0, 0, -this.distanceMetres)))
    this.keyLight.target.updateMatrixWorld()
  }

  dimWhatIsDrawn(renderer: THREE.WebGLRenderer): void {
    renderer.render(this.dimmingScene, this.dimmingCamera)
  }
}
