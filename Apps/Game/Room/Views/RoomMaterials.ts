import * as THREE from 'three'

export type Surface =
  | 'floor'
  | 'wall'
  | 'skirting'
  | 'wood'
  | 'darkWood'
  | 'clay'
  | 'porcelain'
  | 'steel'
  | 'caddyGreen'
  | 'cloth'
  | 'jade'
  | 'toadBrown'
  | 'heaterPlate'
  | 'sky'
  | 'walkerCoat'
  | 'walkerSkin'
  | 'cushion'
  | 'leaves'
  | 'puddle'
  | 'chosenGlow'
  | 'gaugeGlass'
  | 'tapWater'

const surfaceColours: Readonly<Record<Surface, string>> = {
  floor: '#e9cfa4',
  wall: '#f4e7d2',
  skirting: '#d9b98c',
  wood: '#c98e5a',
  darkWood: '#8f5a3a',
  clay: '#b8643c',
  porcelain: '#f7f2e8',
  steel: '#7d97a3',
  caddyGreen: '#5f9a7c',
  cloth: '#e7dcc4',
  jade: '#6fb59a',
  toadBrown: '#b39a5c',
  heaterPlate: '#3d3733',
  sky: '#f2a36b',
  walkerCoat: '#3f7f8f',
  walkerSkin: '#f1c9a5',
  cushion: '#d4735e',
  leaves: '#4f6b2f',
  puddle: '#9c6a44',
  chosenGlow: '#fff1c2',
  gaugeGlass: '#f4f8f9',
  tapWater: '#a9d3ea',
}

const unlitSurfaces: ReadonlySet<Surface> = new Set(['sky'])

export class RoomMaterials {
  private readonly materialsBySurface = new Map<Surface, THREE.Material>()

  materialFor(surface: Surface): THREE.Material {
    const existing = this.materialsBySurface.get(surface)
    if (existing !== undefined) return existing
    const material = this.unsharedMaterialFor(surface)
    this.materialsBySurface.set(surface, material)
    return material
  }

  unsharedMaterialFor(surface: Surface): THREE.MeshStandardMaterial | THREE.MeshBasicMaterial {
    return unlitSurfaces.has(surface)
      ? new THREE.MeshBasicMaterial({ color: surfaceColours[surface] })
      : new THREE.MeshStandardMaterial({ color: surfaceColours[surface], roughness: 0.92, metalness: 0, flatShading: true })
  }
}
