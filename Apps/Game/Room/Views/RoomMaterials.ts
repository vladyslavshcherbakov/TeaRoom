import * as THREE from 'three'

export type Surface =
  | 'floor'
  | 'wall'
  | 'wood'
  | 'darkWood'
  | 'clay'
  | 'porcelain'
  | 'steel'
  | 'caddyGreen'
  | 'cloth'
  | 'wetCloth'
  | 'jade'
  | 'toadBrown'
  | 'heaterPlate'
  | 'sky'
  | 'walkerCoat'
  | 'walkerSkin'
  | 'cushion'
  | 'puddle'
  | 'gaugeGlass'
  | 'gaugeTube'
  | 'tapWater'
  | 'pouredLiquid'
  | 'steam'
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
  | 'koi'

const surfaceColours: Readonly<Record<Surface, string>> = {
  floor: '#e9cfa4',
  wall: '#f4e7d2',
  wood: '#c98e5a',
  darkWood: '#8f5a3a',
  clay: '#b8643c',
  porcelain: '#f7f2e8',
  steel: '#7d97a3',
  caddyGreen: '#5f9a7c',
  cloth: '#e7dcc4',
  wetCloth: '#9f917a',
  jade: '#6fb59a',
  toadBrown: '#b39a5c',
  heaterPlate: '#3d3733',
  sky: '#f2a36b',
  walkerCoat: '#3f7f8f',
  walkerSkin: '#f1c9a5',
  cushion: '#d4735e',
  puddle: '#9c6a44',
  gaugeGlass: '#f4f8f9',
  gaugeTube: '#4d5a60',
  tapWater: '#a9d3ea',
  pouredLiquid: '#c9e3f0',
  steam: '#ffffff',
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
  koi: '#e4622e',
}

const unlitSurfaces: ReadonlySet<Surface> = new Set(['sky'])
const steamOpacity = 0.45
const pouredLiquidOpacity = 0.85
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

  colourOf(surface: Surface): THREE.Color {
    return new THREE.Color(surfaceColours[surface])
  }

  unsharedMaterialFor(surface: Surface): THREE.MeshStandardMaterial | THREE.MeshBasicMaterial {
    const color = surfaceColours[surface]
    if (surface === 'steam') return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: steamOpacity, depthWrite: false })
    if (surface === 'pouredLiquid') return new THREE.MeshStandardMaterial({ color, transparent: true, opacity: pouredLiquidOpacity })
    if (unlitSurfaces.has(surface)) return new THREE.MeshBasicMaterial({ color })
    if (pearlySurfaces.has(surface)) return new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 0.8, iridescence: 1, iridescenceIOR: 1.4 })
    if (glazedSurfaces.has(surface)) return new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.6 })
    return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, flatShading: true })
  }
}
