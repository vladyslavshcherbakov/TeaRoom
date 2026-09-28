import * as THREE from 'three'

export type RimSegments = {
  readonly aroundTheTube: number
  readonly aroundTheRim: number
}

export function openWall(radiusMetres: number, bottomMetres: number, topMetres: number, segmentsAround: number, material: THREE.Material, startRadians = 0): THREE.Mesh {
  const heightMetres = topMetres - bottomMetres
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(radiusMetres, radiusMetres, heightMetres, segmentsAround, 1, true, startRadians), material)
  wall.position.y = bottomMetres + heightMetres / 2
  return wall
}

export function rimAround(radiusMetres: number, tubeMetres: number, heightMetres: number, segments: RimSegments, material: THREE.Material): THREE.Mesh {
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radiusMetres, tubeMetres, segments.aroundTheTube, segments.aroundTheRim), material)
  rim.rotation.x = Math.PI / 2
  rim.position.y = heightMetres
  return rim
}

export function disc(radiusMetres: number, heightMetres: number, segmentsAround: number, facing: 'up' | 'down', material: THREE.Material): THREE.Mesh {
  const flat = new THREE.Mesh(new THREE.CircleGeometry(radiusMetres, segmentsAround), material)
  flat.rotation.x = facing === 'up' ? -Math.PI / 2 : Math.PI / 2
  flat.position.y = heightMetres
  return flat
}

export function radialFadingTexture(sizePixels: number, colour: readonly [number, number, number], opacityAt: (shareOfTheRadius: number) => number): THREE.DataTexture {
  const pixels = new Uint8Array(sizePixels * sizePixels * 4)
  const centre = sizePixels / 2
  const [red, green, blue] = colour
  for (let row = 0; row < sizePixels; row += 1) {
    for (let column = 0; column < sizePixels; column += 1) {
      const shareOfTheRadius = Math.min(1, Math.hypot(column + 0.5 - centre, row + 0.5 - centre) / centre)
      pixels.set([red, green, blue, Math.round(255 * opacityAt(shareOfTheRadius))], (row * sizePixels + column) * 4)
    }
  }
  const texture = new THREE.DataTexture(pixels, sizePixels, sizePixels)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}
