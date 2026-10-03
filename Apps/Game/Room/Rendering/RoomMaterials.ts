import * as THREE from 'three'
import { GlassThatClears, materialOfALook, type Look } from '../../../Engine/Rendering/Looks.ts'
import { MaterialCache } from '../../../Engine/Rendering/MaterialCache.ts'
import { paintedTexture, paintingMaterial } from '../../../Engine/Rendering/Painting/PaintedTexture.ts'
import { text } from '../../Texts/Texts.ts'
import { weaveCloth } from './Paintings/ClothWeave.ts'
import type { ClothPattern, CushionColour } from '../NewGame/RoomArrangement.ts'
import type { FigurineId } from '../../../../Shared/Content/Rooms.ts'
import type { AppLog } from '../../../Engine/AppLog.ts'
import { paintCrackle } from './Paintings/CrackleGlaze.ts'
import { paintHeron } from './Paintings/HeronPainting.ts'
import { paintKintsugi } from './Paintings/KintsugiGlaze.ts'
import { paintKoiPond, type KoiPond } from './Paintings/KoiPond.ts'
import { paintGinkgoLeaves } from './Paintings/GinkgoPainting.ts'
import { paintGuidePage } from './Paintings/GuidePagePainting.ts'
import { paintLotus } from './Paintings/LotusPainting.ts'
import { paintProphecyInscription, prophecyInscriptionPixelsPerMetre } from './Paintings/ProphecyInscription.ts'
import { paintTeaCharacter } from './Paintings/TeaCharacterPainting.ts'
import { paintGreenMarble } from './Paintings/MarbleGlaze.ts'
import { paintTemperBands } from './Paintings/TemperBands.ts'
import { paintSakuraOverFuji } from './Paintings/ThermosPainting.ts'
import { paintToad } from './Paintings/ToadPainting.ts'
import { paintYixingClay } from './Paintings/YixingClay.ts'

export type Surface =
  | 'floor'
  | 'lampDisplay'
  | 'heaterLampDisplay'
  | 'controlKey'
  | 'lampLit'
  | 'lampDark'
  | 'wall'
  | 'wood'
  | 'darkWood'
  | 'bamboo'
  | 'clay'
  | 'claySeenFromInside'
  | 'porcelain'
  | 'liquidBody'
  | 'steel'
  | 'thermosInside'
  | 'thermosPainting'
  | 'aluminium'
  | 'caddyGreen'
  | 'caddyGreenSeenFromInside'
  | 'cloth'
  | 'redCheckCloth'
  | 'wetCloth'
  | 'teaStainedCloth'
  | 'charredCloth'
  | 'charredBamboo'
  | 'ash'
  | 'smoke'
  | 'flame'
  | 'flameCore'
  | 'ember'
  | 'redHotMetal'
  | 'dullRedHeat'
  | 'brightRedHeat'
  | 'leaves'
  | 'jade'
  | 'toadBrown'
  | 'heaterPlate'
  | 'workingHeaterPlate'
  | 'sky'
  | 'skyDome'
  | 'middaySkyTop'
  | 'middaySkyHorizon'
  | 'warmSkyTop'
  | 'warmSkyHorizon'
  | 'cloud'
  | 'inspectionDimming'
  | 'walkerCoat'
  | 'walkerSkin'
  | 'walkerEye'
  | 'googlyEyeWhite'
  | 'walkerHair'
  | 'terracottaCushion'
  | 'softBlueCushion'
  | 'puddle'
  | 'gaugeGlass'
  | 'gaugeTube'
  | 'tapWater'
  | 'pouredLiquid'
  | 'liquidSurface'
  | 'steam'
  | 'heldSteam'
  | 'bowlSteam'
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
  | 'blackGlaze'
  | 'emeraldGlaze'
  | 'temperGlaze'
  | 'glass'
  | 'gildedRim'
  | 'medalRibbon'
  | 'gearMetal'
  | 'darkGearMetal'
  | 'darkIron'
  | 'faucetArm'
  | 'clearGlassHeldInView'
  | 'koiPainting'
  | 'toadPainting'
  | 'prophecyInscription'
  | 'lotusPainting'
  | 'ginkgoPainting'
  | 'guideBookPage'
  | 'guideBookCover'
  | 'guideBookPageEdges'
  | 'heronPainting'
  | 'teaCharacterPainting'
  | 'yixingClay'
  | 'lawn'

export type PlantSurface = 'bloom' | 'foliage' | 'stem' | 'daisyPetals' | 'flowerHeart' | 'poppyHeart' | 'sunflowerHeart'

export type SurfaceMaterial = THREE.MeshStandardMaterial | THREE.MeshBasicMaterial | THREE.MeshLambertMaterial

export type ColouredSurface = { readonly [Name in Surface]: (typeof lookBySurface)[Name] extends { readonly colour: string } ? Name : never }[Surface]

export type SurfaceMaterials = Pick<RoomMaterials, 'materialFor' | 'unsharedMaterialFor' | 'glassThatClears' | 'colourOf' | 'colourOfACloth'>

type ColouredLook = Look | { readonly kind: 'temperGlaze' } | { readonly kind: 'wovenCloth'; readonly pattern: ClothPattern }

type PaintedLook =
  | { readonly kind: 'kintsugi' | 'thermosPainting' | 'yixingClay' | 'koiPainting' | 'prophecy' }
  | { readonly kind: 'paintedGlaze'; readonly paint: (log: AppLog) => HTMLCanvasElement }
  | { readonly kind: 'painting'; readonly paint: (log: AppLog) => HTMLCanvasElement }

type SurfaceLook = { readonly isSeenFromBothSides?: true } & (({ readonly colour: string } & ColouredLook) | PaintedLook)

const steamOpacity = 0.25
const bowlSteamOpacity = 0.15
const heldSteamOpacity = 0.08
const smokeOpacity = 0.4
const inspectionDimmingOpacity = 0.6
const heaterPlateColour = '#3d3733'
const workingHeaterGlowIntensity = 0.8
const clayColour = '#b8643c'
const porcelainColour = '#f7f2e8'
const caddyGreenColour = '#5f9a7c'
const clayPoreDepth = 1.5
const clothRoughness = 1

const lookBySurface = {
  floor: { colour: '#e9cfa4', kind: 'matte' },
  wall: { colour: '#f4e7d2', kind: 'matte' },
  wood: { colour: '#c98e5a', kind: 'matte' },
  darkWood: { colour: '#8f5a3a', kind: 'matte' },
  bamboo: { colour: '#e6c67a', kind: 'matte' },
  clay: { colour: clayColour, kind: 'matte' },
  claySeenFromInside: { colour: clayColour, kind: 'matte', isSeenFromBothSides: true },
  porcelain: { colour: porcelainColour, kind: 'matte', isSeenFromBothSides: true },
  liquidBody: { colour: porcelainColour, kind: 'matte' },
  steel: { colour: '#7d97a3', kind: 'matte' },
  lampDisplay: { colour: '#ffffff', kind: 'unlit' },
  heaterLampDisplay: { colour: '#b3b3b3', kind: 'unlit' },
  controlKey: { colour: '#d8cfbd', kind: 'matte' },
  lampLit: { colour: '#7dff9e', kind: 'unlit' },
  lampDark: { colour: '#1d3324', kind: 'matte' },
  thermosInside: { colour: '#3f4b50', kind: 'matte', isSeenFromBothSides: true },
  thermosPainting: { kind: 'thermosPainting' },
  aluminium: { colour: '#aab0b5', kind: 'aluminium', isSeenFromBothSides: true },
  caddyGreen: { colour: caddyGreenColour, kind: 'matte' },
  caddyGreenSeenFromInside: { colour: caddyGreenColour, kind: 'matte', isSeenFromBothSides: true },
  cloth: { colour: '#ffffff', kind: 'wovenCloth', pattern: 'blueStripes' },
  redCheckCloth: { colour: '#ffffff', kind: 'wovenCloth', pattern: 'redCheck' },
  wetCloth: { colour: '#a4a4a6', kind: 'matte' },
  teaStainedCloth: { colour: '#f2dc96', kind: 'matte' },
  charredCloth: { colour: '#2e2520', kind: 'matte' },
  charredBamboo: { colour: '#1c1714', kind: 'matte' },
  ash: { colour: '#77716b', kind: 'matte' },
  smoke: { colour: '#5f5a57', kind: 'mist', opacity: smokeOpacity },
  flame: { colour: '#ff8a2a', kind: 'glow' },
  flameCore: { colour: '#ffe07a', kind: 'glow' },
  ember: { colour: '#ff4a12', kind: 'glow' },
  redHotMetal: { colour: '#3a0904', kind: 'matte' },
  dullRedHeat: { colour: '#8a1000', kind: 'unlit' },
  brightRedHeat: { colour: '#ff2a00', kind: 'unlit' },
  leaves: { colour: '#ffffff', kind: 'foliage' },
  jade: { colour: '#6fb59a', kind: 'matte' },
  toadBrown: { colour: '#b39a5c', kind: 'matte' },
  heaterPlate: { colour: heaterPlateColour, kind: 'matte' },
  workingHeaterPlate: { colour: heaterPlateColour, kind: 'heated', glowColour: '#e0603a', glowIntensity: workingHeaterGlowIntensity },
  sky: { colour: '#f2a36b', kind: 'unlit' },
  skyDome: { colour: '#ffffff', kind: 'skyDome' },
  middaySkyTop: { colour: '#4f8fd0', kind: 'unlit' },
  middaySkyHorizon: { colour: '#cfe6f5', kind: 'unlit' },
  warmSkyTop: { colour: '#7f8fc4', kind: 'unlit' },
  warmSkyHorizon: { colour: '#ffc9a0', kind: 'unlit' },
  cloud: { colour: '#ffffff', kind: 'cloud', emissive: '#c9d6e3' },
  inspectionDimming: { colour: '#1c140d', kind: 'veil', opacity: inspectionDimmingOpacity },
  walkerCoat: { colour: '#3f7f8f', kind: 'matte' },
  walkerSkin: { colour: '#f1c9a5', kind: 'matte' },
  walkerEye: { colour: '#221a16', kind: 'matte' },
  googlyEyeWhite: { colour: '#fbfbf8', kind: 'glaze' },
  walkerHair: { colour: '#2b1d15', kind: 'matte' },
  terracottaCushion: { colour: '#d4735e', kind: 'matte' },
  softBlueCushion: { colour: '#7f9dc4', kind: 'matte' },
  puddle: { colour: '#9c6a44', kind: 'matte' },
  gaugeGlass: { colour: '#f4f8f9', kind: 'matte' },
  gaugeTube: { colour: '#4d5a60', kind: 'matte' },
  tapWater: { colour: '#a9d3ea', kind: 'matte' },
  pouredLiquid: { colour: '#c9e3f0', kind: 'translucent' },
  liquidSurface: { colour: '#ffffff', kind: 'liquidSurface' },
  steam: { colour: '#ffffff', kind: 'mist', opacity: steamOpacity },
  heldSteam: { colour: '#ffffff', kind: 'mist', opacity: heldSteamOpacity },
  bowlSteam: { colour: '#ffffff', kind: 'mist', opacity: bowlSteamOpacity },
  sinkHollow: { colour: '#56626a', kind: 'matte' },
  sinkWall: { colour: '#b7c2c7', kind: 'matte' },
  caddyInside: { colour: '#2f3d33', kind: 'matte' },
  caddyLabel: { colour: '#efe2c4', kind: 'matte' },
  caddyRim: { colour: '#c9a45c', kind: 'matte' },
  whiteGlaze: { colour: '#fbfaf6', kind: 'glaze', isSeenFromBothSides: true },
  pearlGlaze: { colour: '#f2ece6', kind: 'pearly', isSeenFromBothSides: true },
  skyBlueGlaze: { kind: 'paintedGlaze', paint: paintCrackle, isSeenFromBothSides: true },
  blueGlaze: { kind: 'kintsugi', isSeenFromBothSides: true },
  yellowGlaze: { colour: '#f1cd55', kind: 'glaze', isSeenFromBothSides: true },
  blackGlaze: { colour: '#15120f', kind: 'glaze', isSeenFromBothSides: true },
  emeraldGlaze: { kind: 'paintedGlaze', paint: paintGreenMarble, isSeenFromBothSides: true },
  temperGlaze: { colour: '#7a6650', kind: 'temperGlaze', isSeenFromBothSides: true },
  glass: { colour: '#ffffff', kind: 'glass', isSeenFromBothSides: true },
  gildedRim: { colour: '#e2b451', kind: 'gold' },
  medalRibbon: { colour: '#a8392e', kind: 'matte' },
  gearMetal: { colour: '#7f868b', kind: 'aluminium' },
  darkGearMetal: { colour: '#5f666b', kind: 'aluminium' },
  darkIron: { colour: '#34302c', kind: 'matte' },
  faucetArm: { colour: '#3a4a52', kind: 'matte' },
  clearGlassHeldInView: { colour: '#26302c', kind: 'clearGlass', isSeenFromBothSides: true },
  koiPainting: { kind: 'koiPainting' },
  toadPainting: { kind: 'painting', paint: paintToad },
  prophecyInscription: { kind: 'prophecy' },
  lotusPainting: { kind: 'painting', paint: paintLotus },
  ginkgoPainting: { kind: 'painting', paint: paintGinkgoLeaves },
  guideBookPage: { kind: 'painting', paint: paintGuidePage },
  guideBookCover: { colour: '#4a1f14', kind: 'matte' },
  guideBookPageEdges: { colour: '#e6d4ac', kind: 'matte' },
  heronPainting: { kind: 'painting', paint: paintHeron },
  teaCharacterPainting: { kind: 'painting', paint: paintTeaCharacter },
  yixingClay: { kind: 'yixingClay', isSeenFromBothSides: true },
  lawn: { colour: '#79a94f', kind: 'matte' },
} as const satisfies Readonly<Record<Surface, SurfaceLook>>

export const surfaceByClothPattern: Readonly<Record<ClothPattern, Surface>> = {
  blueStripes: 'cloth',
  redCheck: 'redCheckCloth',
}

export const surfaceByCushionColour: Readonly<Record<CushionColour, Surface>> = {
  terracotta: 'terracottaCushion',
  softBlue: 'softBlueCushion',
}

export const surfaceByFigurineId: Readonly<Record<FigurineId, Surface>> = {
  dragon: 'jade',
  toad: 'toadBrown',
}

const colourByPlantSurface: Readonly<Record<PlantSurface, string>> = {
  bloom: '#ffffff',
  foliage: '#3f7a32',
  stem: '#4d8a36',
  daisyPetals: '#fbfbf6',
  flowerHeart: '#f2c21c',
  poppyHeart: '#1d1a17',
  sunflowerHeart: '#5a3616',
}

export class RoomMaterials {
  private readonly materialsBySurface = new MaterialCache<Surface, THREE.Material>((surface) => this.unsharedMaterialFor(surface))
  private readonly materialsByPlantSurface = new MaterialCache<PlantSurface, THREE.MeshLambertMaterial>((surface) => new THREE.MeshLambertMaterial({ color: colourByPlantSurface[surface], flatShading: true }))
  private readonly reflections: THREE.Texture | null
  private readonly koiPond: KoiPond
  private readonly log: AppLog
  private prophecyPainting: HTMLCanvasElement | null = null

  constructor(reflections: THREE.Texture | null, koiPond: KoiPond, log: AppLog) {
    this.log = log
    this.reflections = reflections
    this.koiPond = koiPond
  }

  materialFor(surface: Surface): THREE.Material {
    return this.materialsBySurface.sharedMaterialFor(surface)
  }

  plantMaterialFor(surface: PlantSurface): THREE.MeshLambertMaterial {
    return this.materialsByPlantSurface.sharedMaterialFor(surface)
  }

  prophecySizeMetres(): { readonly width: number; readonly height: number } {
    const painting = this.paintedProphecy()
    return { width: painting.width / prophecyInscriptionPixelsPerMetre, height: painting.height / prophecyInscriptionPixelsPerMetre }
  }

  colourOf(surface: ColouredSurface): THREE.Color {
    return new THREE.Color(lookBySurface[surface].colour)
  }

  colourOfACloth(teaStain: number, wetShare: number): THREE.Color {
    const dryColour = this.colourOf('cloth').lerp(this.colourOf('teaStainedCloth'), teaStain)
    const wetDarkening = this.colourOf('cloth').lerp(this.colourOf('wetCloth'), wetShare)
    return dryColour.multiply(wetDarkening)
  }

  glassThatClears(transmitting: ColouredSurface): GlassThatClears {
    const glass = new GlassThatClears(lookBySurface[transmitting].colour, this.reflections)
    const transmittingLook: SurfaceLook = lookBySurface[transmitting]
    if (transmittingLook.isSeenFromBothSides === true) glass.material.side = THREE.DoubleSide
    return glass
  }

  unsharedMaterialFor(surface: Surface): SurfaceMaterial {
    const look: SurfaceLook = lookBySurface[surface]
    const material = this.materialOf(look)
    if (look.isSeenFromBothSides === true) material.side = THREE.DoubleSide
    return material
  }

  private materialOf(look: SurfaceLook): SurfaceMaterial {
    if (!('colour' in look)) return this.paintedMaterialOf(look)
    const color = look.colour
    switch (look.kind) {
      case 'temperGlaze':
        return this.temperGlazeMaterial(color)
      case 'wovenCloth':
        return wovenClothMaterial(look.pattern, color, this.log)
      case 'matte':
      case 'unlit':
      case 'foliage':
      case 'glow':
      case 'pearly':
      case 'translucent':
      case 'liquidSurface':
      case 'glass':
      case 'clearGlass':
      case 'gold':
      case 'aluminium':
      case 'glaze':
      case 'skyDome':
      case 'mist':
      case 'veil':
      case 'cloud':
      case 'heated':
        return materialOfALook(look, color, this.reflections)
    }
  }

  private paintedMaterialOf(look: PaintedLook): SurfaceMaterial {
    switch (look.kind) {
      case 'paintedGlaze':
        return paintedGlazeMaterial(look.paint(this.log))
      case 'kintsugi':
        return this.kintsugiMaterial()
      case 'thermosPainting':
        return this.thermosPaintingMaterial()
      case 'yixingClay':
        return yixingClayMaterial(this.log)
      case 'koiPainting':
        return paintingMaterial(paintKoiPond(this.koiPond, this.log))
      case 'prophecy':
        return paintingMaterial(this.paintedProphecy())
      case 'painting':
        return paintingMaterial(look.paint(this.log))
    }
  }

  private paintedProphecy(): HTMLCanvasElement {
    this.prophecyPainting ??= paintProphecyInscription([text('wall.prophecy.firstLine'), text('wall.prophecy.secondLine')], this.log)
    return this.prophecyPainting
  }

  private kintsugiMaterial(): THREE.MeshPhysicalMaterial {
    const kintsugi = paintKintsugi(this.log)
    const colours = paintedTexture(kintsugi.colours, { holdsColours: true, wrapsAround: true })
    const surface = paintedTexture(kintsugi.surface, { holdsColours: false, wrapsAround: true })
    return new THREE.MeshPhysicalMaterial({
      map: colours,
      metalnessMap: surface,
      roughnessMap: surface,
      clearcoatMap: surface,
      metalness: 1,
      roughness: 1,
      clearcoat: 0.25,
      clearcoatRoughness: 0.2,
      envMap: this.reflections,
      envMapIntensity: 1.4,
    })
  }

  private temperGlazeMaterial(color: string): THREE.MeshPhysicalMaterial {
    const thicknessMap = new THREE.CanvasTexture(paintTemperBands(this.log))
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

  private thermosPaintingMaterial(): THREE.MeshPhysicalMaterial {
    const texture = paintedTexture(paintSakuraOverFuji(this.log), { holdsColours: true, wrapsAround: false })
    return new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.35, clearcoat: 0.8, envMap: this.reflections, envMapIntensity: 0.8 })
  }

}

function wovenClothMaterial(pattern: ClothPattern, color: string, log: AppLog): THREE.MeshStandardMaterial {
  const texture = paintedTexture(weaveCloth(pattern, log), { holdsColours: true, wrapsAround: false })
  return new THREE.MeshStandardMaterial({ map: texture, color, roughness: clothRoughness, metalness: 0, side: THREE.DoubleSide, vertexColors: true })
}

function paintedGlazeMaterial(painting: HTMLCanvasElement): THREE.MeshPhysicalMaterial {
  const texture = paintedTexture(painting, { holdsColours: true, wrapsAround: true })
  return new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.3, clearcoat: 0.7 })
}

function yixingClayMaterial(log: AppLog): THREE.MeshStandardMaterial {
  const clay = paintYixingClay(log)
  const colours = paintedTexture(clay.colours, { holdsColours: true, wrapsAround: true })
  const pores = paintedTexture(clay.pores, { holdsColours: false, wrapsAround: true })
  return new THREE.MeshStandardMaterial({ map: colours, bumpMap: pores, bumpScale: clayPoreDepth, roughness: 0.9, metalness: 0 })
}
