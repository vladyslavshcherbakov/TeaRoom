import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { isMarkedAsGlowing } from './RoomLayers.ts'

type MaterialOfAMesh = THREE.Material | THREE.Material[]

const glowStrength = 0.8
const glowRadius = 0.4
const glowThreshold = 0
const glowResolutionShare = 0.5

export class RoomGlow {
  private readonly composer: EffectComposer
  private readonly overlay: FullScreenQuad
  private readonly scene: THREE.Scene
  private readonly unlitStandIn = new THREE.MeshBasicMaterial({ color: 0x000000 })
  private readonly emissiveStandInByMaterial = new Map<THREE.Material, THREE.MeshBasicMaterial>()
  private readonly swappedMaterials: [THREE.Mesh, MaterialOfAMesh][] = []

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene
    const size = renderer.getSize(new THREE.Vector2())
    this.composer = new EffectComposer(renderer)
    this.composer.renderToScreen = false
    this.composer.setPixelRatio(renderer.getPixelRatio() * glowResolutionShare)
    this.composer.setSize(size.x, size.y)
    this.composer.addPass(new RenderPass(scene, camera, undefined, new THREE.Color(0x000000), 1))
    this.composer.addPass(new UnrealBloomPass(size.clone().multiplyScalar(glowResolutionShare), glowStrength, glowRadius, glowThreshold))
    this.overlay = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { glow: { value: null } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D glow; varying vec2 vUv; void main() { gl_FragColor = texture2D(glow, vUv); \n#include <colorspace_fragment>\n}',
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      toneMapped: false,
    }))
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height)
  }

  drawOver(renderer: THREE.WebGLRenderer): void {
    const shadowsNeedUpdate = renderer.shadowMap.needsUpdate
    renderer.shadowMap.needsUpdate = false
    this.darkenWhatDoesNotGlow()
    this.composer.render()
    this.restoreTheMaterials()
    renderer.shadowMap.needsUpdate = shadowsNeedUpdate
    const material = this.overlay.material
    if (material instanceof THREE.ShaderMaterial) material.uniforms['glow'] = { value: this.composer.readBuffer.texture }
    this.overlay.render(renderer)
  }

  dispose(): void {
    this.composer.dispose()
    this.overlay.dispose()
    this.unlitStandIn.dispose()
    for (const standIn of this.emissiveStandInByMaterial.values()) standIn.dispose()
  }

  private darkenWhatDoesNotGlow(): void {
    this.scene.traverseVisible((part) => {
      if (!(part instanceof THREE.Mesh) || isMarkedAsGlowing(part)) return
      const glowing = Array.isArray(part.material) ? part.material.map((material) => this.glowOf(material)) : this.glowOf(part.material)
      this.swappedMaterials.push([part, part.material])
      part.material = glowing
    })
  }

  private restoreTheMaterials(): void {
    for (const [mesh, material] of this.swappedMaterials) mesh.material = material
    this.swappedMaterials.length = 0
  }

  private glowOf(material: THREE.Material): THREE.Material {
    if (material instanceof THREE.MeshBasicMaterial && material.blending === THREE.AdditiveBlending) return material
    if (!(material instanceof THREE.MeshStandardMaterial) || material.emissiveIntensity <= 0) return this.unlitStandIn
    const standIn = this.emissiveStandInByMaterial.get(material) ?? new THREE.MeshBasicMaterial()
    this.emissiveStandInByMaterial.set(material, standIn)
    standIn.color.copy(material.emissive).multiplyScalar(Math.min(1, material.emissiveIntensity))
    standIn.side = material.side
    return standIn
  }
}
