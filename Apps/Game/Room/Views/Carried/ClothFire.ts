import * as THREE from 'three'
import type { TableViewState } from '../../../Table/TableViewState.ts'
import type { RoomMaterials } from '../RoomMaterials.ts'
import type { CarriedModel } from './CarriedModel.ts'

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
const flickerDepth = 0.2
const smokeGrowsFasterThanSteam = 1.6

export class ClothFire {
  private readonly steam: THREE.Material
  private readonly smoke: THREE.Material
  private readonly puffs: readonly THREE.Mesh[]
  private readonly flame = new THREE.Group()
  readonly meshes: readonly THREE.Object3D[]

  constructor(materials: RoomMaterials) {
    this.steam = materials.materialFor('steam')
    this.smoke = materials.materialFor('smoke')
    this.puffs = Array.from({ length: puffCount }, () => new THREE.Mesh(new THREE.SphereGeometry(puffRadiusMetres, 8, 6), this.smoke))
    const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(flameRadiusMetres, flameHeightMetres, 10), materials.materialFor('flame'))
    const flameCore = new THREE.Mesh(new THREE.ConeGeometry(flameRadiusMetres * flameCoreShare, flameHeightMetres * flameCoreShare, 8), materials.materialFor('flameCore'))
    outerFlame.position.y = flameHeightMetres / 2
    flameCore.position.y = (flameHeightMetres * flameCoreShare) / 2
    this.flame.add(outerFlame, flameCore)
    for (const part of [...this.puffs, outerFlame, flameCore]) part.castShadow = false
    this.meshes = [...this.puffs, this.flame]
  }

  show(cloth: CarriedModel | undefined, heating: TableViewState.ClothHeating, timeSeconds: number): void {
    const isShown = cloth !== undefined && heating !== 'none' && cloth.root.visible && !cloth.isHeldInView
    this.flame.visible = isShown && heating === 'smouldering'
    this.puffs.forEach((puff) => (puff.visible = isShown))
    if (!isShown || cloth === undefined) return
    const rootOfTheFlame = cloth.root.localToWorld(flameOnTheFold.clone())
    if (this.flame.visible) this.flicker(rootOfTheFlame, timeSeconds)
    this.risePuffs(rootOfTheFlame, heating, timeSeconds)
  }

  private flicker(rootOfTheFlame: THREE.Vector3, timeSeconds: number): void {
    const flicker = 1 - flickerDepth + flickerDepth * Math.sin(timeSeconds * flickerPerSecond) * Math.sin(timeSeconds * flickerPerSecond * 1.7)
    this.flame.position.copy(rootOfTheFlame)
    this.flame.scale.set(1, flicker, 1)
  }

  private risePuffs(rootOfTheFlame: THREE.Vector3, heating: TableViewState.ClothHeating, timeSeconds: number): void {
    const isSmoke = heating === 'smouldering'
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
