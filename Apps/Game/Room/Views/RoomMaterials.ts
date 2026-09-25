import * as THREE from 'three'
import { weaveCloth } from './ClothWeave.ts'
import { paintCrackle } from './CrackleGlaze.ts'
import { paintHeron } from './HeronPainting.ts'
import { paintKintsugi } from './KintsugiGlaze.ts'
import { paintKoi } from './KoiPainting.ts'
import { paintLotus } from './LotusPainting.ts'
import { paintTeaCharacter } from './TeaCharacterPainting.ts'
import { paintGreenMarble } from './MarbleGlaze.ts'
import { paintTemperBands } from './TemperBands.ts'
import { paintSakuraOverFuji } from './ThermosPainting.ts'
import { paintYixingClay } from './YixingClay.ts'

export type Surface =
  | 'floor'
  | 'wall'
  | 'wood'
  | 'darkWood'
  | 'clay'
  | 'porcelain'
  | 'steel'
  | 'thermosInside'
  | 'thermosPainting'
  | 'aluminium'
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
  | 'liquidSurface'
  | 'steam'
  | 'sinkHollow'
  | 'sinkWall'
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
  | 'glass'
  | 'gildedRim'
  | 'clearGlassHeldInView'
  | 'koiPainting'
  | 'lotusPainting'
  | 'heronPainting'
  | 'teaCharacterPainting'
  | 'yixingClay'
  | 'lawn'
  | 'bloom'
  | 'foliage'
  | 'stem'
  | 'daisyPetals'
  | 'flowerHeart'
  | 'poppyHeart'
  | 'sunflowerHeart'

const surfaceColours: Readonly<Record<Surface, string>> = {
  floor: '#e9cfa4',
  wall: '#f4e7d2',
  wood: '#c98e5a',
  darkWood: '#8f5a3a',
  clay: '#b8643c',
  porcelain: '#f7f2e8',
  steel: '#7d97a3',
  thermosInside: '#3f4b50',
  thermosPainting: '#ffffff',
  aluminium: '#aab0b5',
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
  liquidSurface: '#ffffff',
  steam: '#ffffff',
  sinkHollow: '#56626a',
  sinkWall: '#b7c2c7',
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
  glass: '#ffffff',
  gildedRim: '#e2b451',
  clearGlassHeldInView: '#eef7f2',
  koiPainting: '#ffffff',
  lotusPainting: '#ffffff',
  heronPainting: '#ffffff',
  teaCharacterPainting: '#ffffff',
  yixingClay: '#ffffff',
  lawn: '#79a94f',
  bloom: '#ffffff',
  foliage: '#3f7a32',
  stem: '#4d8a36',
  daisyPetals: '#fbfbf6',
  flowerHeart: '#f2c21c',
  poppyHeart: '#1d1a17',
  sunflowerHeart: '#5a3616',
}

const unlitSurfaces: ReadonlySet<Surface> = new Set(['sky'])
const steamOpacity = 0.45
const smokeOpacity = 0.4
const clearGlassOpacity = 0.28
const clayPoreDepth = 1.5
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
    if (surface === 'glass') return this.glassMaterial(color)
    if (surface === 'gildedRim') return this.goldMaterial(color)
    if (surface === 'liquidSurface') return this.liquidSurfaceMaterial(color)
    if (surface === 'aluminium') return this.aluminiumMaterial(color)
    if (surface === 'thermosPainting') return this.thermosPaintingMaterial()
    if (surface === 'clearGlassHeldInView') return this.clearGlassMaterial(color)
    if (surface === 'koiPainting') return paintingMaterial(paintKoi())
    if (surface === 'lotusPainting') return paintingMaterial(paintLotus())
    if (surface === 'heronPainting') return paintingMaterial(paintHeron())
    if (surface === 'teaCharacterPainting') return paintingMaterial(paintTeaCharacter())
    if (surface === 'yixingClay') return yixingClayMaterial()
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
      clearcoatMap: surface,
      metalness: 1,
      roughness: 1,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
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

  private aluminiumMaterial(color: string): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({ color, metalness: 0.8, roughness: 0.5, envMap: this.reflections, envMapIntensity: 0.55 })
  }

  private thermosPaintingMaterial(): THREE.MeshPhysicalMaterial {
    const texture = new THREE.CanvasTexture(paintSakuraOverFuji())
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = paintingSharpness
    return new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.35, clearcoat: 0.8, envMap: this.reflections, envMapIntensity: 0.8 })
  }

  private liquidSurfaceMaterial(color: string): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.06, specularIntensity: 1, transparent: true, envMap: this.reflections, envMapIntensity: 1 })
  }

  private goldMaterial(color: string): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.18, envMap: this.reflections, envMapIntensity: 1.5 })
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

function yixingClayMaterial(): THREE.MeshStandardMaterial {
  const clay = paintYixingClay()
  const colours = new THREE.CanvasTexture(clay.colours)
  colours.colorSpace = THREE.SRGBColorSpace
  const pores = new THREE.CanvasTexture(clay.pores)
  for (const texture of [colours, pores]) {
    texture.wrapS = THREE.RepeatWrapping
    texture.anisotropy = paintingSharpness
  }
  return new THREE.MeshStandardMaterial({ map: colours, bumpMap: pores, bumpScale: clayPoreDepth, roughness: 0.9, metalness: 0 })
}
