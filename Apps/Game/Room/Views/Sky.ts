import * as THREE from 'three'
import { seededRandom } from '../SeededRandom.ts'
import type { Daylight } from '../Sky/DaylightCycle.ts'
import { putOnLayer, roomLayers } from './RoomLayers.ts'
import type { RoomMaterials } from './RoomMaterials.ts'

const skyRadiusMetres = 70
const skySegmentsAround = 32
const skySegmentsUp = 16
const horizonBlendsUpToShare = 0.45
const cloudCount = 7
const puffsInACloud = 6
const cloudDistanceMetres = 48
const lowestCloudMetres = 14
const cloudHeightSpreadMetres = 9
const cloudPuffRadiusMetres = 2.2
const cloudSeed = 70913

export class Sky {
  private readonly dome: THREE.Mesh
  private readonly middaySkyTop: THREE.Color
  private readonly middayHorizon: THREE.Color
  private readonly warmSkyTop: THREE.Color
  private readonly warmHorizon: THREE.Color
  private shownWarmth = -1
  readonly root = new THREE.Group()

  constructor(materials: RoomMaterials) {
    this.middaySkyTop = materials.colourOf('middaySkyTop')
    this.middayHorizon = materials.colourOf('middaySkyHorizon')
    this.warmSkyTop = materials.colourOf('warmSkyTop')
    this.warmHorizon = materials.colourOf('warmSkyHorizon')
    const geometry = new THREE.SphereGeometry(skyRadiusMetres, skySegmentsAround, skySegmentsUp)
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3), 3))
    this.dome = new THREE.Mesh(geometry, materials.materialFor('skyDome'))
    this.dome.renderOrder = -1
    this.root.add(this.dome, ...clouds(materials.materialFor('cloud')))
    putOnLayer(this.root, roomLayers.untappableRoom)
    this.root.traverse((part) => (part.castShadow = false))
    this.root.visible = false
  }

  show(daylight: Daylight, isShown: boolean, centre: THREE.Vector3): void {
    this.root.visible = isShown
    if (!isShown) return
    this.root.position.set(centre.x, 0, centre.z)
    if (daylight.warmth !== this.shownWarmth) this.paintTheDome(daylight.warmth)
  }

  private paintTheDome(warmth: number): void {
    this.shownWarmth = warmth
    const top = this.middaySkyTop.clone().lerp(this.warmSkyTop, warmth)
    const horizon = this.middayHorizon.clone().lerp(this.warmHorizon, warmth)
    const position = this.dome.geometry.getAttribute('position')
    const colour = this.dome.geometry.getAttribute('color')
    const blended = new THREE.Color()
    for (let index = 0; index < position.count; index += 1) {
      const heightShare = Math.max(0, position.getY(index) / skyRadiusMetres)
      blended.copy(horizon).lerp(top, THREE.MathUtils.smoothstep(heightShare, 0, horizonBlendsUpToShare))
      colour.setXYZ(index, blended.r, blended.g, blended.b)
    }
    colour.needsUpdate = true
  }
}

function clouds(material: THREE.Material): THREE.Group[] {
  const nextRandom = seededRandom(cloudSeed)
  const puff = new THREE.IcosahedronGeometry(cloudPuffRadiusMetres, 1)
  return Array.from({ length: cloudCount }, (_, index) => {
    const cloud = new THREE.Group()
    const around = ((index + nextRandom() * 0.6) / cloudCount) * Math.PI * 2
    cloud.position.set(Math.cos(around) * cloudDistanceMetres, lowestCloudMetres + nextRandom() * cloudHeightSpreadMetres, Math.sin(around) * cloudDistanceMetres)
    cloud.lookAt(0, cloud.position.y, 0)
    for (let puffIndex = 0; puffIndex < puffsInACloud; puffIndex += 1) {
      const mesh = new THREE.Mesh(puff, material)
      const along = (puffIndex - puffsInACloud / 2) * cloudPuffRadiusMetres * 0.9
      mesh.position.set(along, Math.abs(Math.sin(puffIndex * 1.7)) * cloudPuffRadiusMetres * 0.8 * nextRandom(), 0)
      mesh.scale.setScalar(0.7 + nextRandom() * 0.6)
      cloud.add(mesh)
    }
    return cloud
  })
}
