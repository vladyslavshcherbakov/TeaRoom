import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { bytesAt } from '../BytesAt.ts'
import type { AppLog } from '../AppLog.ts'

export type AnimatedModelLook = {
  readonly name: string
  readonly url: string
  readonly heightMetres: number
  readonly blendSeconds: number
}

type LoadedModel = {
  readonly mixer: THREE.AnimationMixer
  readonly clips: readonly THREE.AnimationClip[]
}

export class AnimatedModel<Animation extends string> {
  private readonly look: AnimatedModelLook
  private readonly log: AppLog
  private loaded: LoadedModel | null = null
  private animation: Animation
  private action: THREE.AnimationAction | null = null
  private castsAShadow = false
  readonly root = new THREE.Group()

  constructor(look: AnimatedModelLook, animation: Animation, log: AppLog) {
    this.look = look
    this.animation = animation
    this.log = log
    void this.load()
  }

  get animationShown(): Animation {
    return this.animation
  }

  get secondsIntoTheAnimation(): number | null {
    return this.loaded?.mixer.time ?? null
  }

  play(animation: Animation): void {
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
      const gltf = await new GLTFLoader().parseAsync(await bytesAt(this.look.url), '')
      const model = gltf.scene
      model.traverse((part) => (part.frustumCulled = false))
      standOnTheOrigin(model, this.look.heightMetres)
      this.root.add(model)
      this.castAShadow(this.castsAShadow)
      this.loaded = { mixer: new THREE.AnimationMixer(model), clips: gltf.animations }
      this.log(`the model ${this.look.name} is loaded with ${gltf.animations.length} animations`)
      this.startTheAnimation()
    } catch (error) {
      this.log(`the model ${this.look.name} could not be loaded, so it is not shown: ${String(error)}`, 'error')
    }
  }

  private startTheAnimation(): void {
    const loaded = this.loaded
    if (loaded === null) return
    const clip = loaded.clips.find((candidate) => candidate.name === this.animation)
    if (clip === undefined) return this.log(`the model ${this.look.name} has no animation ${this.animation}, so it keeps the one it plays`, 'error')
    const next = loaded.mixer.clipAction(clip)
    this.action?.fadeOut(this.look.blendSeconds)
    next.reset().fadeIn(this.look.blendSeconds).play()
    this.action = next
    this.log(`the model ${this.look.name} plays ${this.animation}`)
  }
}

function standOnTheOrigin(model: THREE.Object3D, heightMetres: number): void {
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
  model.scale.setScalar(heightMetres / size.y)
  const box = new THREE.Box3().setFromObject(model)
  const centre = box.getCenter(new THREE.Vector3())
  model.position.set(-centre.x, -box.min.y, -centre.z)
}
