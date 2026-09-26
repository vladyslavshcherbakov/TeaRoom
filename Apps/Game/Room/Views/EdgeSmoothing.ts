import * as THREE from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'

export class EdgeSmoothing {
  private readonly material: THREE.ShaderMaterial
  private readonly quad: FullScreenQuad
  private frame: THREE.FramebufferTexture

  constructor(renderer: THREE.WebGLRenderer) {
    this.material = new THREE.ShaderMaterial({ ...FXAAShader, uniforms: THREE.UniformsUtils.clone(FXAAShader.uniforms), depthTest: false, depthWrite: false })
    this.quad = new FullScreenQuad(this.material)
    this.frame = new THREE.FramebufferTexture(1, 1)
    this.fitTo(renderer)
  }

  fitTo(renderer: THREE.WebGLRenderer): void {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2())
    this.frame.dispose()
    this.frame = new THREE.FramebufferTexture(size.x, size.y)
    this.material.uniforms['tDiffuse'] = { value: this.frame }
    this.material.uniforms['resolution'] = { value: new THREE.Vector2(1 / size.x, 1 / size.y) }
  }

  drawOver(renderer: THREE.WebGLRenderer): void {
    renderer.copyFramebufferToTexture(this.frame)
    this.quad.render(renderer)
  }

  dispose(): void {
    this.frame.dispose()
    this.material.dispose()
    this.quad.dispose()
  }
}
