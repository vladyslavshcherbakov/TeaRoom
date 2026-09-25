import * as THREE from 'three'
import { weaveCloth } from './ClothWeave.ts'
import { paintCrackle } from './CrackleGlaze.ts'
import { paintKintsugi } from './KintsugiGlaze.ts'
import { paintKoi } from './KoiPainting.ts'
import { paintLotus } from './LotusPainting.ts'
import { paintGreenMarble } from './MarbleGlaze.ts'
import { paintTemperBands } from './TemperBands.ts'

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
  | 'teaStainedCloth'
  | 'charredCloth'
  | 'smoke'
  | 'flame'
  | 'flameCore'
  | 'ember'
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
  | 'temperGlaze'
  | 'flutedGlass'
  | 'clearGlassHeldInView'
  | 'koiPainting'
  | 'lotusPainting'

const surfaceColours: Readonly<Record<Surface, string>> = {
  floor: '#e9cfa4',
  wall: '#f4e7d2',
  wood: '#c98e5a',
  darkWood: '#8f5a3a',
  clay: '#b8643c',
  porcelain: '#f7f2e8',
  steel: '#7d97a3',
  caddyGreen: '#5f9a7c',
  cloth: '#ffffff',
  wetCloth: '#8a7c68',
  teaStainedCloth: '#f2dc96',
  charredCloth: '#2e2520',
  smoke: '#5f5a57',
  flame: '#ff8a2a',
  flameCore: '#ffe07a',
  ember: '#ff4a12',
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
  temperGlaze: '#7a6650',
  flutedGlass: '#ffffff',
  clearGlassHeldInView: '#eef7f2',
  koiPainting: '#ffffff',
  lotusPainting: '#ffffff',
}

const unlitSurfaces: ReadonlySet<Surface> = new Set(['sky'])
const steamOpacity = 0.45
const smokeOpacity = 0.4
const clearGlassOpacity = 0.28
const pouredLiquidOpacity = 0.85
const paintingSharpness = 8
const clothRoughness = 1
const glazedSurfaces: ReadonlySet<Surface> = new Set(['whiteGlaze', 'skyBlueGlaze', 'yellowGlaze', 'emeraldGlaze'])
const pearlySurfaces: ReadonlySet<Surface> = new Set(['pearlGlaze'])
const glazePaintings: Partial<Record<Surface, () => HTMLCanvasElement>> = { emeraldGlaze: paintGreenMarble, skyBlueGlaze: paintCrackle }

export class RoomMaterials {
  private readonly materialsBySurface = new Map<Surface, THREE.Material>()
  private readonly reflections: THREE.Texture | null

  constructor(reflections: THREE.Texture | null) {
    this.reflections = reflections
  }

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
    if (surface === 'smoke') return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: smokeOpacity, depthWrite: false })
    if (surface === 'flame' || surface === 'flameCore' || surface === 'ember') return new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    if (surface === 'temperGlaze') return this.temperGlazeMaterial(color)
    if (surface === 'blueGlaze') return this.kintsugiMaterial()
    if (surface === 'flutedGlass') return this.glassMaterial(color)
    if (surface === 'clearGlassHeldInView') return this.clearGlassMaterial(color)
    if (surface === 'koiPainting') return paintingMaterial(paintKoi())
    if (surface === 'lotusPainting') return paintingMaterial(paintLotus())
    if (surface === 'cloth') return wovenClothMaterial()
    if (surface === 'pouredLiquid') return new THREE.MeshStandardMaterial({ color, transparent: true, opacity: pouredLiquidOpacity })
    if (unlitSurfaces.has(surface)) return new THREE.MeshBasicMaterial({ color })
    if (pearlySurfaces.has(surface)) return new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 0.8, iridescence: 1, iridescenceIOR: 1.4 })
    if (glazedSurfaces.has(surface)) return glazeMaterial(surface, color)
    return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, flatShading: true })
  }

  private kintsugiMaterial(): THREE.MeshPhysicalMaterial {
    const kintsugi = paintKintsugi()
    const colours = new THREE.CanvasTexture(kintsugi.colours)
    colours.colorSpace = THREE.SRGBColorSpace
    const surface = new THREE.CanvasTexture(kintsugi.surface)
    for (const texture of [colours, surface]) {
      texture.wrapS = THREE.RepeatWrapping
      texture.anisotropy = paintingSharpness
    }
    return new THREE.MeshPhysicalMaterial({
      map: colours,
      metalnessMap: surface,
      roughnessMap: surface,
      metalness: 1,
      roughness: 1,
      clearcoat: 0.6,
      envMap: this.reflections,
      envMapIntensity: 1.4,
    })
  }

  private temperGlazeMaterial(color: string): THREE.MeshPhysicalMaterial {
    const thicknessMap = new THREE.CanvasTexture(paintTemperBands())
    return new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.85,
      roughness: 0.2,
      clearcoat: 0.6,
      iridescence: 1,
      iridescenceIOR: 1.9,
      iridescenceThicknessRange: [140, 780],
      iridescenceThicknessMap: thicknessMap,
      envMap: this.reflections,
      envMapIntensity: 1.3,
    })
  }

  private clearGlassMaterial(color: string): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0,
      roughness: 0.05,
      transparent: true,
      opacity: clearGlassOpacity,
      specularIntensity: 1,
      envMap: this.reflections,
      envMapIntensity: 1.2,
    })
  }

  private glassMaterial(color: string): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0,
      roughness: 0.04,
      transmission: 1,
      ior: 1.5,
      thickness: 0.004,
      attenuationColor: '#e4f3ea',
      attenuationDistance: 0.25,
      specularIntensity: 1,
      envMap: this.reflections,
      envMapIntensity: 1,
    })
  }
}

function paintingMaterial(painting: HTMLCanvasElement): THREE.MeshStandardMaterial {
  const texture = new THREE.CanvasTexture(painting)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = paintingSharpness
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

function wovenClothMaterial(): THREE.MeshStandardMaterial {
  const texture = new THREE.CanvasTexture(weaveCloth())
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = paintingSharpness
  return new THREE.MeshStandardMaterial({ map: texture, color: surfaceColours.cloth, roughness: clothRoughness, metalness: 0, side: THREE.DoubleSide, vertexColors: true })
}

function glazeMaterial(surface: Surface, color: string): THREE.MeshPhysicalMaterial {
  const paintGlaze = glazePaintings[surface]
  if (paintGlaze === undefined) return new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.6 })
  const texture = new THREE.CanvasTexture(paintGlaze())
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.anisotropy = paintingSharpness
  return new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.3, clearcoat: 0.7 })
}
