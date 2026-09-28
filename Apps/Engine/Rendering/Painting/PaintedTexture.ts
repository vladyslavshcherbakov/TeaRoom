import * as THREE from 'three'

export type TextureUse = { readonly holdsColours: boolean; readonly wrapsAround: boolean }

const paintingSharpness = 8

export function paintedTexture(painting: HTMLCanvasElement, use: TextureUse): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(painting)
  if (use.holdsColours) texture.colorSpace = THREE.SRGBColorSpace
  if (use.wrapsAround) texture.wrapS = THREE.RepeatWrapping
  texture.anisotropy = paintingSharpness
  return texture
}

export function paintingMaterial(painting: HTMLCanvasElement): THREE.MeshStandardMaterial {
  const texture = paintedTexture(painting, { holdsColours: true, wrapsAround: false })
  texture.premultiplyAlpha = true
  return new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    roughness: 0.45,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -8,
  })
}
