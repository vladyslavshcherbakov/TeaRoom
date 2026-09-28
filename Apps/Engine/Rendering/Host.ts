import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import type { AppLog } from '../AppLog.ts'
import { FrameBudget } from '../FrameBudget.ts'
import { WorldTime } from '../WorldTime.ts'
import { freeTheComposer } from './Composers.ts'
import { EdgeSmoothing } from './EdgeSmoothing.ts'
import type { GlowPass } from './GlowPass.ts'
import type { DrawnResources } from './DrawnResources.ts'

export type HostSetUp = {
  readonly largestPixelRatioByDefault: number
  readonly transmissionResolutionShare: number
  readonly clearColour: string
  readonly softShadowsInCorners: { readonly radiusMetres: number; readonly strength: number; readonly resolutionShare: number }
}

export type FrameTimes = {
  readonly realSeconds: number
  readonly worldSeconds: number
}

const samplesOfThePictureUnderTheEffects = 4

export class Host<Phase extends string> {
  private readonly setUp: HostSetUp
  private readonly log: AppLog
  private readonly timer = new THREE.Timer()
  private readonly worldTime: WorldTime
  private softShadowsInCorners: EffectComposer | null = null
  private softShadowsInCornersAgain: (() => EffectComposer) | null = null
  private glow: GlowPass | null = null
  private glowAgain: (() => GlowPass) | null = null
  private edgeSmoothing: EdgeSmoothing | null = null
  private shadowPoseLastDrawn = ''
  private timeScale = 1
  readonly renderer = new THREE.WebGLRenderer({ antialias: true })
  readonly frameBudget = new FrameBudget<Phase>()

  constructor(container: HTMLElement, setUp: HostSetUp, log: AppLog) {
    this.setUp = setUp
    this.log = log
    this.worldTime = new WorldTime(log)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, setUp.largestPixelRatioByDefault))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.shadowMap.autoUpdate = false
    this.renderer.transmissionResolutionScale = setUp.transmissionResolutionShare
    this.renderer.autoClear = false
    this.renderer.setClearColor(setUp.clearColour)
    this.renderer.info.autoReset = false
    container.append(this.renderer.domElement)
    this.logWhenTheBrowserTakesTheDrawingContext(this.renderer.domElement)
  }

  get elapsedSeconds(): number {
    return this.timer.getElapsed()
  }

  start(frame: (times: FrameTimes) => void): void {
    this.timer.reset()
    this.renderer.setAnimationLoop(() => {
      this.frameBudget.frameBegan(performance.now())
      this.renderer.info.reset()
      this.timer.update()
      const realSeconds = this.timer.getDelta()
      frame({ realSeconds, worldSeconds: this.worldTime.frameDrawn(realSeconds) * this.timeScale })
    })
  }

  drawnResources(): DrawnResources {
    const { memory, programs } = this.renderer.info
    return { geometries: memory.geometries, textures: memory.textures, programs: programs?.length ?? 0 }
  }

  runTheWorldAt(timeScale: number): void {
    if (timeScale === this.timeScale) return
    this.timeScale = timeScale
    this.log(`the world runs at ${timeScale} times real time`)
  }

  reflectionsOf(environment: THREE.Scene, blurSigma: number): THREE.Texture {
    const generator = new THREE.PMREMGenerator(this.renderer)
    const reflections = generator.fromScene(environment, blurSigma).texture
    generator.dispose()
    return reflections
  }

  drawTheShadowsWhenThePoseChanges(shadowPose: string): void {
    this.renderer.shadowMap.needsUpdate = shadowPose !== this.shadowPoseLastDrawn
    this.shadowPoseLastDrawn = shadowPose
  }

  drawThePicture(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.softShadowsInCorners !== null) this.softShadowsInCorners.render()
    else this.renderer.render(scene, camera)
  }

  drawTheGlowOver(): void {
    this.glow?.drawOver(this.renderer)
  }

  drawTheSmoothingOver(): void {
    this.edgeSmoothing?.drawOver(this.renderer)
  }

  showTheResolution(isFull: boolean, camera: THREE.PerspectiveCamera): void {
    const pixelRatio = isFull ? window.devicePixelRatio : Math.min(window.devicePixelRatio, this.setUp.largestPixelRatioByDefault)
    if (this.renderer.getPixelRatio() === pixelRatio) return
    this.renderer.setPixelRatio(pixelRatio)
    this.log(`the picture is drawn at ${pixelRatio} pixels for each point of the page`)
    this.redrawTheEffectsAtTheNewResolution()
    this.fitToWindow(camera)
  }

  showSmoothEdges(isOn: boolean): void {
    if ((this.edgeSmoothing !== null) === isOn) return
    this.edgeSmoothing?.dispose()
    this.edgeSmoothing = isOn ? new EdgeSmoothing(this.renderer) : null
  }

  showSoftShadowsInCorners(isOn: boolean, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    if ((this.softShadowsInCorners !== null) === isOn) return
    if (this.softShadowsInCorners !== null) freeTheComposer(this.softShadowsInCorners)
    this.softShadowsInCornersAgain = isOn ? () => this.softShadowsInCornersOf(scene, camera) : null
    this.softShadowsInCorners = this.softShadowsInCornersAgain?.() ?? null
  }

  showTheGlow(isOn: boolean, glowOfTheScene: () => GlowPass): void {
    if ((this.glow !== null) === isOn) return
    this.glow?.dispose()
    this.glowAgain = isOn ? glowOfTheScene : null
    this.glow = this.glowAgain?.() ?? null
  }

  fitToWindow(camera: THREE.PerspectiveCamera): void {
    const width = window.innerWidth
    const height = window.innerHeight
    this.renderer.setSize(width, height)
    this.softShadowsInCorners?.setSize(width, height)
    this.glow?.setSize(width, height)
    this.edgeSmoothing?.fitTo(this.renderer)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  private redrawTheEffectsAtTheNewResolution(): void {
    if (this.softShadowsInCorners !== null) {
      freeTheComposer(this.softShadowsInCorners)
      this.softShadowsInCorners = this.softShadowsInCornersAgain?.() ?? null
    }
    if (this.glow !== null) {
      this.glow.dispose()
      this.glow = this.glowAgain?.() ?? null
    }
  }

  private softShadowsInCornersOf(scene: THREE.Scene, camera: THREE.PerspectiveCamera): EffectComposer {
    const size = this.renderer.getSize(new THREE.Vector2())
    const pixelRatio = this.renderer.getPixelRatio()
    const smoothedPicture = new THREE.WebGLRenderTarget(size.x * pixelRatio, size.y * pixelRatio, { type: THREE.HalfFloatType, samples: samplesOfThePictureUnderTheEffects })
    const composer = new EffectComposer(this.renderer, smoothedPicture)
    composer.setPixelRatio(pixelRatio)
    composer.setSize(size.x, size.y)
    composer.addPass(new RenderPass(scene, camera))
    const ambientOcclusion = new AmbientOcclusionAtAShareOfTheResolution(scene, camera, size.x, size.y, this.setUp.softShadowsInCorners.resolutionShare)
    ambientOcclusion.updateGtaoMaterial({ radius: this.setUp.softShadowsInCorners.radiusMetres })
    ambientOcclusion.blendIntensity = this.setUp.softShadowsInCorners.strength
    composer.addPass(ambientOcclusion)
    composer.addPass(new OutputPass())
    return composer
  }

  private logWhenTheBrowserTakesTheDrawingContext(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('webglcontextlost', () => this.log('the browser took the WebGL context away, so nothing can be drawn until it gives it back', 'error'))
    canvas.addEventListener('webglcontextrestored', () => this.log('the browser gave the WebGL context back'))
  }
}

class AmbientOcclusionAtAShareOfTheResolution extends GTAOPass {
  private readonly resolutionShare: number

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, width: number, height: number, resolutionShare: number) {
    super(scene, camera, Math.max(1, Math.round(width * resolutionShare)), Math.max(1, Math.round(height * resolutionShare)))
    this.resolutionShare = resolutionShare
  }

  override setSize(width: number, height: number): void {
    super.setSize(Math.max(1, Math.round(width * this.resolutionShare)), Math.max(1, Math.round(height * this.resolutionShare)))
  }
}
