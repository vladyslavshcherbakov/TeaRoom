import * as THREE from 'three'
import { curlNoiseAt } from '../Flow/CurlNoise.ts'

export type WispsMotion = {
  readonly riseMetresPerSecond: number
  readonly lifeSeconds: number
  readonly swirlMetresPerSecond: number
  readonly swirlSizeMetres: number
  readonly swirlChangePerSecond: number
  readonly sizeMetres: number
  readonly bornWithinMetres: number
  readonly keptShareOfTheSourcesSpeed: number
  readonly kickFadePerSecond: number
}

export type WispsLook = {
  readonly colour: THREE.ColorRepresentation
  readonly opacity: number
}

export type WispSource = {
  readonly position: THREE.Vector3
  readonly wispsPerSecond: number
  readonly lean: THREE.Vector3
  readonly scale: number
}

const fadesInOverShareOfItsLife = 0.12
const smallestSizeShare = 0.6
const growthOverItsLife = 1.2
const calmestSwirlShare = 0.3
const fastestSourceToFollowMetresPerSecond = 2
const randomSeed = 20251003

const vertexShader = `
attribute float wispOpacity;
attribute float wispSize;
uniform float pixelsPerMetreAtOneMetre;
varying float shownOpacity;
void main() {
  vec4 inView = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * inView;
  gl_PointSize = wispSize * pixelsPerMetreAtOneMetre / max(-inView.z, 0.01);
  shownOpacity = wispOpacity;
}
`

const fragmentShader = `
uniform vec3 colour;
uniform float opacity;
varying float shownOpacity;
void main() {
  vec2 fromTheMiddle = gl_PointCoord * 2.0 - 1.0;
  float squaredDistance = dot(fromTheMiddle, fromTheMiddle);
  if (squaredDistance > 1.0) discard;
  float softEdge = (1.0 - squaredDistance) * (1.0 - squaredDistance);
  gl_FragColor = vec4(colour, opacity * shownOpacity * softEdge);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export class RisingWisps {
  private readonly motion: WispsMotion
  private readonly mostWisps: number
  private readonly positions: Float32Array
  private readonly opacities: Float32Array
  private readonly sizes: Float32Array
  private readonly kicks: Float32Array
  private readonly leans: Float32Array
  private readonly ages: Float32Array
  private readonly scales: Float32Array
  private readonly material: THREE.ShaderMaterial
  private readonly geometry = new THREE.BufferGeometry()
  private readonly wispsOwedBySource: number[] = []
  private readonly lastPositionBySource: (THREE.Vector3 | null)[] = []
  private randomState = randomSeed
  private wispCount = 0
  readonly points: THREE.Points

  constructor(mostWisps: number, motion: WispsMotion, look: WispsLook) {
    this.motion = motion
    this.mostWisps = mostWisps
    this.positions = new Float32Array(mostWisps * 3)
    this.opacities = new Float32Array(mostWisps)
    this.sizes = new Float32Array(mostWisps)
    this.kicks = new Float32Array(mostWisps * 3)
    this.leans = new Float32Array(mostWisps * 3)
    this.ages = new Float32Array(mostWisps)
    this.scales = new Float32Array(mostWisps)
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setAttribute('wispOpacity', new THREE.BufferAttribute(this.opacities, 1).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setAttribute('wispSize', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setDrawRange(0, 0)
    this.material = new THREE.ShaderMaterial({
      uniforms: { colour: { value: new THREE.Color(look.colour) }, opacity: { value: look.opacity }, pixelsPerMetreAtOneMetre: { value: 1 } },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    })
    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
    this.points.onBeforeRender = (renderer, _scene, camera) => this.fitTheSizesTo(renderer, camera)
  }

  get count(): number {
    return this.wispCount
  }

  showLook(look: WispsLook): void {
    this.material.uniforms['colour']?.value.set(look.colour)
    if (this.material.uniforms['opacity'] !== undefined) this.material.uniforms['opacity'].value = look.opacity
  }

  wispPositions(): readonly THREE.Vector3[] {
    return Array.from({ length: this.wispCount }, (_, index) => new THREE.Vector3().fromArray(this.positions, index * 3))
  }

  advance(seconds: number, timeSeconds: number, sources: readonly WispSource[]): void {
    this.moveTheWisps(seconds, timeSeconds)
    sources.forEach((source, index) => this.releaseWispsFrom(source, index, seconds))
    this.lastPositionBySource.length = sources.length
    this.wispsOwedBySource.length = sources.length
    this.showTheWisps()
  }

  clear(): void {
    this.wispCount = 0
    this.lastPositionBySource.length = 0
    this.wispsOwedBySource.length = 0
    this.geometry.setDrawRange(0, 0)
  }

  private moveTheWisps(seconds: number, timeSeconds: number): void {
    const { riseMetresPerSecond, lifeSeconds, swirlMetresPerSecond, swirlSizeMetres, swirlChangePerSecond, kickFadePerSecond } = this.motion
    const keptKick = Math.exp(-kickFadePerSecond * seconds)
    let index = 0
    while (index < this.wispCount) {
      const age = (this.ages[index] ?? 0) + seconds
      if (age >= lifeSeconds) {
        this.removeWisp(index)
        continue
      }
      this.ages[index] = age
      const scale = this.scales[index] ?? 1
      const at = index * 3
      const x = this.positions[at] ?? 0
      const y = this.positions[at + 1] ?? 0
      const z = this.positions[at + 2] ?? 0
      const swirl = curlNoiseAt(x / (swirlSizeMetres * scale), y / (swirlSizeMetres * scale) - timeSeconds * swirlChangePerSecond, z / (swirlSizeMetres * scale))
      const swirlSpeed = swirlMetresPerSecond * scale * (calmestSwirlShare + (1 - calmestSwirlShare) * (age / lifeSeconds))
      for (let axis = 0; axis < 3; axis += 1) {
        const rise = (this.leans[at + axis] ?? 0) * riseMetresPerSecond * scale
        const swirlAlong = axis === 0 ? swirl.x : axis === 1 ? swirl.y : swirl.z
        this.positions[at + axis] = (this.positions[at + axis] ?? 0) + (rise + swirlAlong * swirlSpeed + (this.kicks[at + axis] ?? 0)) * seconds
        this.kicks[at + axis] = (this.kicks[at + axis] ?? 0) * keptKick
      }
      index += 1
    }
  }

  private releaseWispsFrom(source: WispSource, sourceIndex: number, seconds: number): void {
    const sourceVelocity = this.velocityOfTheSource(source.position, sourceIndex, seconds)
    const owed = (this.wispsOwedBySource[sourceIndex] ?? 0) + source.wispsPerSecond * seconds
    const releasedNow = Math.floor(owed)
    this.wispsOwedBySource[sourceIndex] = owed - releasedNow
    for (let released = 0; released < releasedNow && this.wispCount < this.mostWisps; released += 1) this.addWisp(source, sourceVelocity)
  }

  private velocityOfTheSource(position: THREE.Vector3, sourceIndex: number, seconds: number): THREE.Vector3 {
    const lastPosition = this.lastPositionBySource[sourceIndex] ?? null
    this.lastPositionBySource[sourceIndex] = position.clone()
    if (lastPosition === null || seconds <= 0) return new THREE.Vector3()
    const velocity = position.clone().sub(lastPosition).divideScalar(seconds)
    return velocity.length() > fastestSourceToFollowMetresPerSecond ? new THREE.Vector3() : velocity
  }

  private addWisp(source: WispSource, sourceVelocity: THREE.Vector3): void {
    const index = this.wispCount
    const at = index * 3
    const spread = this.motion.bornWithinMetres * source.scale
    this.positions[at] = source.position.x + (this.nextRandom() - 0.5) * spread
    this.positions[at + 1] = source.position.y + (this.nextRandom() - 0.5) * spread * 0.5
    this.positions[at + 2] = source.position.z + (this.nextRandom() - 0.5) * spread
    this.kicks[at] = sourceVelocity.x * this.motion.keptShareOfTheSourcesSpeed
    this.kicks[at + 1] = sourceVelocity.y * this.motion.keptShareOfTheSourcesSpeed
    this.kicks[at + 2] = sourceVelocity.z * this.motion.keptShareOfTheSourcesSpeed
    this.leans[at] = source.lean.x
    this.leans[at + 1] = source.lean.y
    this.leans[at + 2] = source.lean.z
    this.ages[index] = 0
    this.scales[index] = source.scale
    this.wispCount += 1
  }

  private removeWisp(index: number): void {
    const last = this.wispCount - 1
    if (index !== last) {
      this.positions.copyWithin(index * 3, last * 3, last * 3 + 3)
      this.kicks.copyWithin(index * 3, last * 3, last * 3 + 3)
      this.leans.copyWithin(index * 3, last * 3, last * 3 + 3)
      this.ages[index] = this.ages[last] ?? 0
      this.scales[index] = this.scales[last] ?? 1
    }
    this.wispCount = last
  }

  private showTheWisps(): void {
    const { lifeSeconds, sizeMetres } = this.motion
    for (let index = 0; index < this.wispCount; index += 1) {
      const lifeShare = (this.ages[index] ?? 0) / lifeSeconds
      this.opacities[index] = Math.min(1, lifeShare / fadesInOverShareOfItsLife) * (1 - lifeShare) ** 2
      this.sizes[index] = sizeMetres * (this.scales[index] ?? 1) * (smallestSizeShare + growthOverItsLife * lifeShare)
    }
    for (const name of ['position', 'wispOpacity', 'wispSize']) {
      const attribute = this.geometry.getAttribute(name)
      attribute.needsUpdate = true
    }
    this.geometry.setDrawRange(0, this.wispCount)
  }

  private fitTheSizesTo(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void {
    const target = renderer.getRenderTarget()
    const pictureHeight = target === null ? renderer.getDrawingBufferSize(new THREE.Vector2()).y : target.height
    const uniform = this.material.uniforms['pixelsPerMetreAtOneMetre']
    if (uniform !== undefined) uniform.value = (pictureHeight / 2) * (camera.projectionMatrix.elements[5] ?? 1)
  }

  private nextRandom(): number {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0
    return this.randomState / 4294967296
  }
}
