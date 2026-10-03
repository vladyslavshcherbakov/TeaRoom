import sparrowUrl from '../Models/sparrow.glb?url'
import type { AppLog } from '../../../Engine/AppLog.ts'
import { AnimatedModel, type AnimatedModelLook } from '../../../Engine/Rendering/AnimatedModel.ts'
import type { SparrowAnimation } from '../Debug/SparrowAnimations.ts'

const sparrowLook: AnimatedModelLook = { name: 'sparrow', url: sparrowUrl, heightMetres: 0.3, blendSeconds: 0.2 }

export class SparrowModel {
  private readonly model: AnimatedModel<SparrowAnimation>
  private castsAShadow = false

  constructor(animation: SparrowAnimation, log: AppLog) {
    this.model = new AnimatedModel(sparrowLook, animation, log)
  }

  get root(): AnimatedModel<SparrowAnimation>['root'] {
    return this.model.root
  }

  get shadowPose(): string {
    const seconds = this.model.secondsIntoTheAnimation
    if (!this.castsAShadow || seconds === null) return 'sparrow casts no shadow'
    return `sparrow ${this.model.animationShown} at ${seconds.toFixed(3)} s`
  }

  play(animation: SparrowAnimation): void {
    this.model.play(animation)
  }

  castAShadow(isCast: boolean): void {
    this.castsAShadow = isCast
    this.model.castAShadow(isCast)
  }

  advance(realSeconds: number): void {
    this.model.advance(realSeconds)
  }
}
