import * as THREE from 'three'
import { text } from '../../Texts/Texts.ts'
import { weaveCloth } from './ClothWeave.ts'
import type { ClothPattern } from '../RoomArrangement.ts'
import { paintCrackle } from './CrackleGlaze.ts'
import { paintHeron } from './HeronPainting.ts'
import { paintKintsugi } from './KintsugiGlaze.ts'
import { paintKoiPond, type KoiPond } from './KoiPond.ts'
import { paintLotus } from './LotusPainting.ts'
import { paintProphecyInscription, prophecyInscriptionPixelsPerMetre } from './ProphecyInscription.ts'
import { paintTeaCharacter } from './TeaCharacterPainting.ts'
import { paintGreenMarble } from './MarbleGlaze.ts'
import { paintTemperBands } from './TemperBands.ts'
import { paintSakuraOverFuji } from './ThermosPainting.ts'
import { paintToad } from './ToadPainting.ts'
import { paintYixingClay } from './YixingClay.ts'

export type Surface =
  | 'floor'
  | 'lampDisplay'
  | 'controlKey'
  | 'lampLit'
  | 'lampDark'
  | 'wall'
  | 'wood'
  | 'darkWood'
  | 'bamboo'
  | 'clay'
  | 'porcelain'
  | 'steel'
  | 'thermosInside'
  | 'thermosPainting'
  | 'aluminium'
  | 'caddyGreen'
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
  | 'jade'
  | 'toadBrown'
  | 'heaterPlate'
  | 'sky'
  | 'walkerCoat'
  | 'walkerSkin'
  | 'walkerEye'
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
  | 'medalRibbon'
  | 'brass'
  | 'copper'
  | 'darkIron'
  | 'clearGlassHeldInView'
  | 'koiPainting'
  | 'toadPainting'
  | 'prophecyInscription'
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

export type SurfaceMaterials = Pick<RoomMaterials, 'materialFor' | 'unsharedMaterialFor' | 'colourOf' | 'bowlIdWithTheToadUnderneath'>

export type BowlPaintings = {
  readonly koiPond: KoiPond
  readonly bowlIdWithTheToadUnderneath: string
}

type SurfaceLook = { readonly colour: string } & (
  | { readonly kind: 'matte' | 'unlit' | 'glow' | 'pearly' | 'pouredLiquid' | 'liquidSurface' | 'glass' | 'clearGlass' | 'gold' | 'aluminium' | 'temperGlaze' | 'kintsugi' | 'thermosPainting' | 'yixingClay' | 'koiPainting' | 'prophecy' }
  | { readonly kind: 'mist'; readonly opacity: number }
  | { readonly kind: 'glaze'; readonly paint: (() => HTMLCanvasElement) | null }
  | { readonly kind: 'painting'; readonly paint: () => HTMLCanvasElement }
  | { readonly kind: 'wovenCloth'; readonly pattern: ClothPattern }
)

const steamOpacity = 0.45
const smokeOpacity = 0.4
const glassEdgeSharpness = 2
const glassGlintFrom = 0.7
const glassGlintFull = 1.4
const glassEdgeShade = 0.25
const glassEdgeDarkening = 0.5
const glassFacingOpacity = 0.1
const glassEdgeOpacity = 0.9
const glassSeenEdgeOnFragment = `
  float glassFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
  float glassEdge = pow(1.0 - glassFacing, ${glassEdgeSharpness.toFixed(1)});
  float glassGlint = smoothstep(${glassGlintFrom.toFixed(2)}, ${glassGlintFull.toFixed(2)}, max(max(gl_FragColor.r, gl_FragColor.g), gl_FragColor.b));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(${glassEdgeShade.toFixed(2)}), glassEdge * ${glassEdgeDarkening.toFixed(2)});
  gl_FragColor.a = max(mix(${glassFacingOpacity.toFixed(2)}, ${glassEdgeOpacity.toFixed(2)}, glassEdge), glassGlint);
`
const clayPoreDepth = 1.5
const pouredLiquidOpacity = 0.85
const paintingSharpness = 8
const clothRoughness = 1

const lookBySurface: Readonly<Record<Surface, SurfaceLook>> = {
  floor: { colour: '#e9cfa4', kind: 'matte' },
  wall: { colour: '#f4e7d2', kind: 'matte' },
  wood: { colour: '#c98e5a', kind: 'matte' },
  darkWood: { colour: '#8f5a3a', kind: 'matte' },
  bamboo: { colour: '#e6c67a', kind: 'matte' },
  clay: { colour: '#b8643c', kind: 'matte' },
  porcelain: { colour: '#f7f2e8', kind: 'matte' },
  steel: { colour: '#7d97a3', kind: 'matte' },
  lampDisplay: { colour: '#ffffff', kind: 'unlit' },
  controlKey: { colour: '#d8cfbd', kind: 'matte' },
  lampLit: { colour: '#7dff9e', kind: 'unlit' },
  lampDark: { colour: '#1d3324', kind: 'matte' },
  thermosInside: { colour: '#3f4b50', kind: 'matte' },
  thermosPainting: { colour: '#ffffff', kind: 'thermosPainting' },
  aluminium: { colour: '#aab0b5', kind: 'aluminium' },
  caddyGreen: { colour: '#5f9a7c', kind: 'matte' },
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
  jade: { colour: '#6fb59a', kind: 'matte' },
  toadBrown: { colour: '#b39a5c', kind: 'matte' },
  heaterPlate: { colour: '#3d3733', kind: 'matte' },
  sky: { colour: '#f2a36b', kind: 'unlit' },
  walkerCoat: { colour: '#3f7f8f', kind: 'matte' },
  walkerSkin: { colour: '#f1c9a5', kind: 'matte' },
  walkerEye: { colour: '#221a16', kind: 'matte' },
  walkerHair: { colour: '#2b1d15', kind: 'matte' },
  terracottaCushion: { colour: '#d4735e', kind: 'matte' },
  softBlueCushion: { colour: '#7f9dc4', kind: 'matte' },
  puddle: { colour: '#9c6a44', kind: 'matte' },
  gaugeGlass: { colour: '#f4f8f9', kind: 'matte' },
  gaugeTube: { colour: '#4d5a60', kind: 'matte' },
  tapWater: { colour: '#a9d3ea', kind: 'matte' },
  pouredLiquid: { colour: '#c9e3f0', kind: 'pouredLiquid' },
  liquidSurface: { colour: '#ffffff', kind: 'liquidSurface' },
  steam: { colour: '#ffffff', kind: 'mist', opacity: steamOpacity },
  sinkHollow: { colour: '#56626a', kind: 'matte' },
  sinkWall: { colour: '#b7c2c7', kind: 'matte' },
  caddyInside: { colour: '#2f3d33', kind: 'matte' },
  caddyLabel: { colour: '#efe2c4', kind: 'matte' },
  caddyRim: { colour: '#c9a45c', kind: 'matte' },
  whiteGlaze: { colour: '#fbfaf6', kind: 'glaze', paint: null },
  pearlGlaze: { colour: '#f2ece6', kind: 'pearly' },
  skyBlueGlaze: { colour: '#9fd0ea', kind: 'glaze', paint: paintCrackle },
  blueGlaze: { colour: '#2f5ea8', kind: 'kintsugi' },
  yellowGlaze: { colour: '#f1cd55', kind: 'glaze', paint: null },
  emeraldGlaze: { colour: '#1f8a68', kind: 'glaze', paint: paintGreenMarble },
  temperGlaze: { colour: '#7a6650', kind: 'temperGlaze' },
  glass: { colour: '#ffffff', kind: 'glass' },
  gildedRim: { colour: '#e2b451', kind: 'gold' },
  medalRibbon: { colour: '#a8392e', kind: 'matte' },
  brass: { colour: '#c9a04e', kind: 'gold' },
  copper: { colour: '#c07048', kind: 'gold' },
  darkIron: { colour: '#34302c', kind: 'matte' },
  clearGlassHeldInView: { colour: '#26302c', kind: 'clearGlass' },
  koiPainting: { colour: '#ffffff', kind: 'koiPainting' },
  toadPainting: { colour: '#ffffff', kind: 'painting', paint: paintToad },
  prophecyInscription: { colour: '#ffffff', kind: 'prophecy' },
  lotusPainting: { colour: '#ffffff', kind: 'painting', paint: paintLotus },
  heronPainting: { colour: '#ffffff', kind: 'painting', paint: paintHeron },
  teaCharacterPainting: { colour: '#ffffff', kind: 'painting', paint: paintTeaCharacter },
  yixingClay: { colour: '#ffffff', kind: 'yixingClay' },
  lawn: { colour: '#79a94f', kind: 'matte' },
  bloom: { colour: '#ffffff', kind: 'matte' },
  foliage: { colour: '#3f7a32', kind: 'matte' },
  stem: { colour: '#4d8a36', kind: 'matte' },
  daisyPetals: { colour: '#fbfbf6', kind: 'matte' },
  flowerHeart: { colour: '#f2c21c', kind: 'matte' },
  poppyHeart: { colour: '#1d1a17', kind: 'matte' },
  sunflowerHeart: { colour: '#5a3616', kind: 'matte' },
}

export class RoomMaterials {
  private readonly materialsBySurface = new Map<Surface, THREE.Material>()
  private readonly reflections: THREE.Texture | null
  private readonly koiPond: KoiPond
  private prophecyPainting: HTMLCanvasElement | null = null
  readonly bowlIdWithTheToadUnderneath: string

  constructor(reflections: THREE.Texture | null, bowlPaintings: BowlPaintings) {
    this.reflections = reflections
    this.koiPond = bowlPaintings.koiPond
    this.bowlIdWithTheToadUnderneath = bowlPaintings.bowlIdWithTheToadUnderneath
  }

  materialFor(surface: Surface): THREE.Material {
    const existing = this.materialsBySurface.get(surface)
    if (existing !== undefined) return existing
    const material = this.unsharedMaterialFor(surface)
    this.materialsBySurface.set(surface, material)
    return material
  }

  prophecySizeMetres(): { readonly width: number; readonly height: number } {
    const painting = this.paintedProphecy()
    return { width: painting.width / prophecyInscriptionPixelsPerMetre, height: painting.height / prophecyInscriptionPixelsPerMetre }
  }

  colourOf(surface: Surface): THREE.Color {
    return new THREE.Color(lookBySurface[surface].colour)
  }

  unsharedMaterialFor(surface: Surface): THREE.MeshStandardMaterial | THREE.MeshBasicMaterial {
    const look = lookBySurface[surface]
    const color = look.colour
    switch (look.kind) {
      case 'matte':
        return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, flatShading: true })
      case 'unlit':
        return new THREE.MeshBasicMaterial({ color })
      case 'mist':
        return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: look.opacity, depthWrite: false })
      case 'glow':
        return new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
      case 'pearly':
        return new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 0.8, iridescence: 1, iridescenceIOR: 1.4 })
      case 'glaze':
        return glazeMaterial(look.paint, color)
      case 'pouredLiquid':
        return new THREE.MeshStandardMaterial({ color, transparent: true, opacity: pouredLiquidOpacity })
      case 'liquidSurface':
        return this.liquidSurfaceMaterial(color)
      case 'glass':
        return this.glassMaterial(color)
      case 'clearGlass':
        return this.clearGlassMaterial(color)
      case 'gold':
        return this.goldMaterial(color)
      case 'aluminium':
        return this.aluminiumMaterial(color)
      case 'temperGlaze':
        return this.temperGlazeMaterial(color)
      case 'kintsugi':
        return this.kintsugiMaterial()
      case 'thermosPainting':
        return this.thermosPaintingMaterial()
      case 'yixingClay':
        return yixingClayMaterial()
      case 'koiPainting':
        return paintingMaterial(paintKoiPond(this.koiPond))
      case 'prophecy':
        return paintingMaterial(this.paintedProphecy())
      case 'painting':
        return paintingMaterial(look.paint())
      case 'wovenCloth':
        return wovenClothMaterial(look.pattern)
    }
  }

  private paintedProphecy(): HTMLCanvasElement {
    this.prophecyPainting ??= paintProphecyInscription([text('wall.prophecy.firstLine'), text('wall.prophecy.secondLine')])
    return this.prophecyPainting
  }

  private kintsugiMaterial(): THREE.MeshPhysicalMaterial {
    const kintsugi = paintKintsugi()
    const colours = paintedTexture(kintsugi.colours, { holdsColours: true, wrapsAround: true })
    const surface = paintedTexture(kintsugi.surface, { holdsColours: false, wrapsAround: true })
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
    const material = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0,
      roughness: 0.05,
      transparent: true,
      specularIntensity: 1,
      envMap: this.reflections,
      envMapIntensity: 1.6,
    })
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>\n${glassSeenEdgeOnFragment}`)
    }
    return material
  }

  private aluminiumMaterial(color: string): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({ color, metalness: 0.8, roughness: 0.5, envMap: this.reflections, envMapIntensity: 0.55 })
  }

  private thermosPaintingMaterial(): THREE.MeshPhysicalMaterial {
    const texture = paintedTexture(paintSakuraOverFuji(), { holdsColours: true, wrapsAround: false })
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

function wovenClothMaterial(pattern: ClothPattern): THREE.MeshStandardMaterial {
  const texture = paintedTexture(weaveCloth(pattern), { holdsColours: true, wrapsAround: false })
  return new THREE.MeshStandardMaterial({ map: texture, color: lookBySurface.cloth.colour, roughness: clothRoughness, metalness: 0, side: THREE.DoubleSide, vertexColors: true })
}

function glazeMaterial(paintGlaze: (() => HTMLCanvasElement) | null, color: string): THREE.MeshPhysicalMaterial {
  if (paintGlaze === null) return new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.6 })
  const texture = paintedTexture(paintGlaze(), { holdsColours: true, wrapsAround: true })
  return new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.3, clearcoat: 0.7 })
}

function yixingClayMaterial(): THREE.MeshStandardMaterial {
  const clay = paintYixingClay()
  const colours = paintedTexture(clay.colours, { holdsColours: true, wrapsAround: true })
  const pores = paintedTexture(clay.pores, { holdsColours: false, wrapsAround: true })
  return new THREE.MeshStandardMaterial({ map: colours, bumpMap: pores, bumpScale: clayPoreDepth, roughness: 0.9, metalness: 0 })
}

function paintedTexture(painting: HTMLCanvasElement, use: { readonly holdsColours: boolean; readonly wrapsAround: boolean }): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(painting)
  if (use.holdsColours) texture.colorSpace = THREE.SRGBColorSpace
  if (use.wrapsAround) texture.wrapS = THREE.RepeatWrapping
  texture.anisotropy = paintingSharpness
  return texture
}
