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
  | 'puddle'
  | 'gaugeGlass'
  | 'tapWater'
  | 'sinkHollow'
  | 'caddyInside'
  | 'caddyLabel'
  | 'caddyRim'
  | 'whiteGlaze'
  | 'pearlGlaze'
  | 'skyBlueGlaze'
  | 'blueGlaze'
  | 'yellowGlaze'
  | 'emeraldGlaze'

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
  puddle: '#9c6a44',
  gaugeGlass: '#f4f8f9',
  tapWater: '#a9d3ea',
  sinkHollow: '#4f5f66',
  caddyInside: '#2f3d33',
  caddyLabel: '#efe2c4',
  caddyRim: '#c9a45c',
  whiteGlaze: '#fbfaf6',
  pearlGlaze: '#f2ece6',
  skyBlueGlaze: '#9fd0ea',
  blueGlaze: '#2f5ea8',
  yellowGlaze: '#f1cd55',
  emeraldGlaze: '#1f8a68',
}

const unlitSurfaces: ReadonlySet<Surface> = new Set(['sky'])
const glazedSurfaces: ReadonlySet<Surface> = new Set(['whiteGlaze', 'skyBlueGlaze', 'blueGlaze', 'yellowGlaze', 'emeraldGlaze'])
const pearlySurfaces: ReadonlySet<Surface> = new Set(['pearlGlaze'])

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
    const color = surfaceColours[surface]
    if (unlitSurfaces.has(surface)) return new THREE.MeshBasicMaterial({ color })
    if (pearlySurfaces.has(surface)) return new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 0.8, iridescence: 1, iridescenceIOR: 1.4 })
    if (glazedSurfaces.has(surface)) return new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.6 })
    return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, flatShading: true })
  }
}
