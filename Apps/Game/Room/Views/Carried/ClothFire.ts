import * as THREE from 'three'
import type { TableViewState } from '../../../Table/TableViewState.ts'
import type { RoomMaterials } from '../RoomMaterials.ts'
import type { CarriedModel } from './CarriedModel.ts'
import { charTheCloth } from './RumpledClothGeometry.ts'

const puffCount = 5
const puffRadiusMetres = 0.022
const steamRiseMetresPerSecond = 0.16
const smokeRiseMetresPerSecond = 0.07
const columnMetres = 0.26
const smallestPuffScale = 0.5
const smokeDriftMetres = 0.03
const flameOnTheFold = new THREE.Vector3(0.035, 0.012, -0.01)
const flameRadiusMetres = 0.012
const flameHeightMetres = 0.04
const flameCoreShare = 0.55
const flickerPerSecond = 9
const puffsByHeating: Readonly<Record<TableViewState.ClothHeating, number>> = { none: 0, steaming: puffCount, smoking: 2, scorching: 3, smouldering: puffCount, burning: puffCount }
const flickerDepth = 0.2
const emberCount = 14
const emberRadiusMetres = 0.0035
const emberSpreadMetres = 0.07
const emberAboveTheClothMetres = 0.006
const goldenAngleRadians = 2.4
const emberPulsesPerSecond = 3
const dimmestEmberScale = 0.6
const embersFromHeating: ReadonlySet<TableViewState.ClothHeating> = new Set(['smouldering', 'burning'])
const smokeGrowsFasterThanSteam = 1.6

export class ClothFire {
  private readonly steam: THREE.Material
  private readonly smoke: THREE.Material
  private readonly puffs: readonly THREE.Mesh[]
  private readonly flame = new THREE.Group()
  private readonly embers: readonly THREE.Mesh[]
  private readonly charredColour: THREE.Color
  private shownCharring = 0
  readonly meshes: readonly THREE.Object3D[]

  constructor(materials: RoomMaterials) {
    this.steam = materials.materialFor('steam')
    this.smoke = materials.materialFor('smoke')
    this.charredColour = materials.colourOf('charredCloth')
    this.puffs = Array.from({ length: puffCount }, () => new THREE.Mesh(new THREE.SphereGeometry(puffRadiusMetres, 8, 6), this.smoke))
    const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(flameRadiusMetres, flameHeightMetres, 10), materials.materialFor('flame'))
    const flameCore = new THREE.Mesh(new THREE.ConeGeometry(flameRadiusMetres * flameCoreShare, flameHeightMetres * flameCoreShare, 8), materials.materialFor('flameCore'))
    outerFlame.position.y = flameHeightMetres / 2
    flameCore.position.y = (flameHeightMetres * flameCoreShare) / 2
    this.flame.add(outerFlame, flameCore)
    this.embers = Array.from({ length: emberCount }, () => new THREE.Mesh(new THREE.SphereGeometry(emberRadiusMetres, 6, 4), materials.materialFor('ember')))
    for (const part of [...this.puffs, ...this.embers, outerFlame, flameCore]) part.castShadow = false
    this.meshes = [...this.puffs, ...this.embers, this.flame]
  }

  show(cloth: CarriedModel | undefined, heating: TableViewState.ClothHeating, timeSeconds: number): void {
    const isShown = cloth !== undefined && heating !== 'none' && cloth.root.visible && !cloth.isHeldInView
    this.flame.visible = isShown && heating === 'burning'
    this.puffs.forEach((puff, index) => (puff.visible = isShown && index < puffsByHeating[heating]))
    const areEmbersShown = isShown && embersFromHeating.has(heating)
    this.embers.forEach((ember) => (ember.visible = areEmbersShown))
    if (!isShown || cloth === undefined) return
    if (areEmbersShown) this.glowEmbers(cloth, timeSeconds)
    const rootOfTheFlame = cloth.root.localToWorld(flameOnTheFold.clone())
    if (this.flame.visible) this.flicker(rootOfTheFlame, timeSeconds)
    this.risePuffs(rootOfTheFlame, heating, timeSeconds)
  }

  char(cloth: CarriedModel | undefined, charring: number): void {
    if (cloth === undefined || charring === this.shownCharring) return
    this.shownCharring = charring
    cloth.root.traverse((part) => {
      if (part instanceof THREE.Mesh) charTheCloth(part.geometry, charring, this.charredColour)
    })
  }

  private glowEmbers(cloth: CarriedModel, timeSeconds: number): void {
    this.embers.forEach((ember, index) => {
      const angle = index * goldenAngleRadians
      const reach = emberSpreadMetres * Math.sqrt((index + 0.5) / emberCount) * this.shownCharring
      ember.position.copy(cloth.root.localToWorld(new THREE.Vector3(Math.cos(angle) * reach, emberAboveTheClothMetres, Math.sin(angle) * reach)))
      ember.scale.setScalar(dimmestEmberScale + (1 - dimmestEmberScale) * Math.abs(Math.sin(timeSeconds * emberPulsesPerSecond + index * goldenAngleRadians)))
    })
  }

  private flicker(rootOfTheFlame: THREE.Vector3, timeSeconds: number): void {
    const flicker = 1 - flickerDepth + flickerDepth * Math.sin(timeSeconds * flickerPerSecond) * Math.sin(timeSeconds * flickerPerSecond * 1.7)
    this.flame.position.copy(rootOfTheFlame)
    this.flame.scale.set(1, flicker, 1)
  }

  private risePuffs(rootOfTheFlame: THREE.Vector3, heating: TableViewState.ClothHeating, timeSeconds: number): void {
    const isSmoke = heating !== 'steaming'
    const risePerSecond = isSmoke ? smokeRiseMetresPerSecond : steamRiseMetresPerSecond
    this.puffs.forEach((puff, index) => {
      const rise = (timeSeconds * risePerSecond / columnMetres + index / puffCount) % 1
      const drift = isSmoke ? Math.sin(timeSeconds + index * 1.3) * smokeDriftMetres * rise : 0
      puff.material = isSmoke ? this.smoke : this.steam
      puff.position.set(rootOfTheFlame.x + drift, rootOfTheFlame.y + flameHeightMetres + rise * columnMetres, rootOfTheFlame.z)
      puff.scale.setScalar(smallestPuffScale + rise * (isSmoke ? smokeGrowsFasterThanSteam : 1))
    })
  }
}
