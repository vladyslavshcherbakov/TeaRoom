import * as THREE from 'three'
import type { Daylight } from '../Sky/DaylightCycle.ts'

const noonSun = new THREE.Color('#fff4e4')
const horizonSun = new THREE.Color('#ff9a55')
const noonSky = new THREE.Color('#f2f6ff')
const horizonSky = new THREE.Color('#ffd6b8')
const groundBounce = '#c9a27a'
const fillColour = '#dfe8ff'
const fillIntensity = 0.6
const shadowMapSize = 1024
const shadowReachMetres = 6
const shadowBias = -0.0005

export class RoomLights {
  private readonly sky = new THREE.HemisphereLight(noonSky, groundBounce, 1.6)
  private readonly sun = new THREE.DirectionalLight(noonSun, 2.2)
  private readonly fill = new THREE.DirectionalLight(fillColour, fillIntensity)
  readonly lights: readonly THREE.Light[]

  constructor() {
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(shadowMapSize, shadowMapSize)
    this.sun.shadow.camera.left = -shadowReachMetres
    this.sun.shadow.camera.right = shadowReachMetres
    this.sun.shadow.camera.top = shadowReachMetres
    this.sun.shadow.camera.bottom = -shadowReachMetres
    this.sun.shadow.bias = shadowBias
    this.fill.position.set(6, 4, 6)
    this.lights = [this.sky, this.sun, this.fill]
    for (const light of this.lights) light.layers.enableAll()
  }

  show(daylight: Daylight): void {
    this.sun.position.set(daylight.sunPosition.x, daylight.sunPosition.y, daylight.sunPosition.z)
    this.sun.color.copy(noonSun).lerp(horizonSun, daylight.warmth)
    this.sun.intensity = daylight.sunIntensity
    this.sky.color.copy(noonSky).lerp(horizonSky, daylight.warmth)
    this.sky.intensity = daylight.skyIntensity
  }
}
