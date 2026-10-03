import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import sparrowUrl from '../Models/sparrow.glb?url'
import { bytesAt } from '../../../Engine/BytesAt.ts'
import type { AppLog } from '../../../Engine/AppLog.ts'
import type { SparrowAnimation } from '../Debug/SparrowAnimations.ts'

const sparrowHeightMetres = 0.3
const animationBlendSeconds = 0.2

type LoadedSparrow = {
  readonly mixer: THREE.AnimationMixer
  readonly clips: readonly THREE.AnimationClip[]
}

export class SparrowModel {
  private readonly log: AppLog
  private loaded: LoadedSparrow | null = null
  private animation: SparrowAnimation
  private action: THREE.AnimationAction | null = null
  private castsAShadow = false
  readonly root = new THREE.Group()

  constructor(animation: SparrowAnimation, log: AppLog) {
    this.animation = animation
    this.log = log
    void this.load()
  }

  get shadowPose(): string {
    const loaded = this.loaded
    if (!this.castsAShadow || loaded === null) return 'sparrow casts no shadow'
    return `sparrow ${this.animation} at ${loaded.mixer.time.toFixed(3)} s`
  }

  play(animation: SparrowAnimation): void {
    this.animation = animation
    this.startTheAnimation()
  }

  castAShadow(isCast: boolean): void {
    this.castsAShadow = isCast
    this.root.traverse((part) => (part.castShadow = isCast))
  }

  advance(realSeconds: number): void {
    this.loaded?.mixer.update(realSeconds)
  }

  private async load(): Promise<void> {
    try {
      const gltf = await new GLTFLoader().parseAsync(await bytesAt(sparrowUrl), '')
      const model = gltf.scene
      model.traverse((part) => (part.frustumCulled = false))
      standOnTheOrigin(model)
      this.root.add(model)
      this.castAShadow(this.castsAShadow)
      this.loaded = { mixer: new THREE.AnimationMixer(model), clips: gltf.animations }
      this.log(`the sparrow is loaded with ${gltf.animations.length} animations`)
      this.startTheAnimation()
    } catch (error) {
      this.log(`the sparrow could not be loaded, so the giant afro carries no bird: ${String(error)}`, 'error')
    }
  }

  private startTheAnimation(): void {
    const loaded = this.loaded
    if (loaded === null) return
    const clip = loaded.clips.find((candidate) => candidate.name === this.animation)
    if (clip === undefined) return this.log(`the sparrow has no animation ${this.animation}, so it keeps the one it plays`, 'error')
    const next = loaded.mixer.clipAction(clip)
    this.action?.fadeOut(animationBlendSeconds)
    next.reset().fadeIn(animationBlendSeconds).play()
    this.action = next
    this.log(`the sparrow plays ${this.animation}`)
  }
}

function standOnTheOrigin(model: THREE.Object3D): void {
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
  model.scale.setScalar(sparrowHeightMetres / size.y)
  const box = new THREE.Box3().setFromObject(model)
  const centre = box.getCenter(new THREE.Vector3())
  model.position.set(-centre.x, -box.min.y, -centre.z)
}
