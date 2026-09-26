import * as THREE from 'three'
import type { TableViewState } from '../../../Table/TableViewState.ts'
import type { SurfaceMaterials } from '../RoomMaterials.ts'
import type { CarriedModel } from './CarriedModel.ts'
import type { FireLook } from './CarriedShapeLook.ts'
import type { CharTo } from './ItemParts.ts'
import { shareOfSteamLeftAt } from './ItemContents.ts'

const puffCount = 5
const puffRadiusMetres = 0.022
const steamRiseMetresPerSecond = 0.16
const smokeRiseMetresPerSecond = 0.07
const smokeColumnMetres = 0.26
const steamColumnMetres = 0.14
const smallestPuffScale = 0.5
const smokeDriftMetres = 0.03
const flameRadiusMetres = 0.012
const flameHeightMetres = 0.04
const flameCoreShare = 0.55
const flickerPerSecond = 9
const puffsByHeating: Readonly<Record<TableViewState.Heating, number>> = { none: 0, steaming: puffCount, warming: 0, smoking: 2, scorching: 3, smouldering: puffCount, burning: puffCount }
const flickerDepth = 0.2
const emberCount = 14
const emberRadiusMetres = 0.0035
const goldenAngleRadians = 2.4
const emberPulsesPerSecond = 3
const dimmestEmberScale = 0.6
const embersFromHeating: ReadonlySet<TableViewState.Heating> = new Set(['smouldering', 'burning'])
const smokeGrowsFasterThanSteam = 1.6

export class ItemFire {
  private readonly item: CarriedModel
  private readonly look: FireLook
  private readonly charTo: CharTo
  private readonly steam: THREE.Material
  private readonly smoke: THREE.Material
  private readonly steamOfEachPuff: readonly THREE.Material[]
  private readonly puffs: readonly THREE.Mesh[]
  private readonly flame = new THREE.Group()
  private readonly embers: readonly THREE.Mesh[]
  private shownCharring = 0
  readonly meshes: readonly THREE.Object3D[]

  constructor(materials: SurfaceMaterials, item: CarriedModel, look: FireLook, charTo: CharTo) {
    this.item = item
    this.look = look
    this.charTo = charTo
    this.steam = materials.materialFor('steam')
    this.smoke = materials.materialFor('smoke')
    this.steamOfEachPuff = Array.from({ length: puffCount }, () => this.steam.clone())
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

  show(table: TableViewState, timeSeconds: number): void {
    const charring = table.charringByItem[this.item.itemId]
    this.char(charring?.charring ?? 0)
    const heating = charring?.heating ?? 'none'
    const isShown = heating !== 'none' && this.item.root.visible && !this.item.isHeldInView
    this.flame.visible = isShown && heating === 'burning'
    this.puffs.forEach((puff, index) => (puff.visible = isShown && index < puffsByHeating[heating]))
    const areEmbersShown = isShown && embersFromHeating.has(heating)
    this.embers.forEach((ember) => (ember.visible = areEmbersShown))
    if (!isShown) return
    if (areEmbersShown) this.glowEmbers(timeSeconds)
    const { x, y, z } = this.look.flameAt
    const rootOfTheFlame = this.item.root.localToWorld(new THREE.Vector3(x, y, z))
    if (this.flame.visible) this.flicker(rootOfTheFlame, timeSeconds)
    this.risePuffs(rootOfTheFlame, heating, timeSeconds)
  }

  private char(charring: number): void {
    if (charring === this.shownCharring) return
    this.shownCharring = charring
    this.charTo(charring)
  }

  private glowEmbers(timeSeconds: number): void {
    const { embersAround, emberSpreadMetres } = this.look
    this.embers.forEach((ember, index) => {
      const angle = index * goldenAngleRadians
      const reachShare = Math.sqrt((index + 0.5) / emberCount) * this.shownCharring
      const x = embersAround.x + Math.cos(angle) * reachShare * emberSpreadMetres.x
      const z = embersAround.z + Math.sin(angle) * reachShare * emberSpreadMetres.z
      ember.position.copy(this.item.root.localToWorld(new THREE.Vector3(x, embersAround.y, z)))
      ember.scale.setScalar(dimmestEmberScale + (1 - dimmestEmberScale) * Math.abs(Math.sin(timeSeconds * emberPulsesPerSecond + index * goldenAngleRadians)))
    })
  }

  private flicker(rootOfTheFlame: THREE.Vector3, timeSeconds: number): void {
    const flicker = 1 - flickerDepth + flickerDepth * Math.sin(timeSeconds * flickerPerSecond) * Math.sin(timeSeconds * flickerPerSecond * 1.7)
    this.flame.position.copy(rootOfTheFlame)
    this.flame.scale.set(1, flicker, 1)
  }

  private risePuffs(rootOfTheFlame: THREE.Vector3, heating: TableViewState.Heating, timeSeconds: number): void {
    const isSmoke = heating !== 'steaming'
    const risePerSecond = isSmoke ? smokeRiseMetresPerSecond : steamRiseMetresPerSecond
    const columnMetres = isSmoke ? smokeColumnMetres : steamColumnMetres
    this.puffs.forEach((puff, index) => {
      const rise = (timeSeconds * risePerSecond / columnMetres + index / puffCount) % 1
      const drift = isSmoke ? Math.sin(timeSeconds + index * 1.3) * smokeDriftMetres * rise : 0
      puff.material = isSmoke ? this.smoke : this.fadingSteam(index, rise)
      puff.position.set(rootOfTheFlame.x + drift, rootOfTheFlame.y + flameHeightMetres + rise * columnMetres, rootOfTheFlame.z)
      puff.scale.setScalar(smallestPuffScale + rise * (isSmoke ? smokeGrowsFasterThanSteam : 1))
    })
  }

  private fadingSteam(index: number, rise: number): THREE.Material {
    const steam = this.steamOfEachPuff[index] ?? this.steam
    steam.opacity = this.steam.opacity * shareOfSteamLeftAt(rise)
    return steam
  }
}
