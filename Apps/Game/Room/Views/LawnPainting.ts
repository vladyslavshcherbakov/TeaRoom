import * as THREE from 'three'

const paintingPixelsAcross = 2048
const paintingSamples = 4
const cameraHeightMetres = 10

export function paintingOfPlantsOnTheLawn(renderer: THREE.WebGLRenderer, plantMeshes: readonly THREE.Object3D[], halfSizeMetres: number, lawnColour: THREE.Color): THREE.Texture {
  const target = new THREE.WebGLRenderTarget(paintingPixelsAcross, paintingPixelsAcross, { samples: paintingSamples, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter })
  target.texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
  const scene = new THREE.Scene()
  scene.background = lawnColour
  scene.add(...plantMeshes)
  const camera = new THREE.OrthographicCamera(-halfSizeMetres, halfSizeMetres, halfSizeMetres, -halfSizeMetres, 0.1, cameraHeightMetres * 2)
  camera.position.set(0, cameraHeightMetres, 0)
  camera.up.set(0, 0, -1)
  camera.lookAt(0, 0, 0)
  const previousTarget = renderer.getRenderTarget()
  renderer.setRenderTarget(target)
  renderer.render(scene, camera)
  renderer.setRenderTarget(previousTarget)
  scene.remove(...plantMeshes)
  return target.texture
}
