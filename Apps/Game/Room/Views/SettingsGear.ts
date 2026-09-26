import * as THREE from 'three'
import type { SurfaceMaterials } from './RoomMaterials.ts'

type GearOutline = {
  readonly teeth: number
  readonly pitchRadius: number
  readonly toothHeight: number
  readonly depth: number
  readonly windows: number
  readonly rimWidth: number
  readonly hubRadius: number
}

const bigGear: GearOutline = { teeth: 12, pitchRadius: 0.135, toothHeight: 0.03, depth: 0.022, windows: 5, rimWidth: 0.024, hubRadius: 0.042 }
const smallGear: GearOutline = { teeth: 6, pitchRadius: 0.0675, toothHeight: 0.03, depth: 0.016, windows: 0, rimWidth: 0, hubRadius: 0.018 }
const smallGearDirectionRadians = Math.PI / 4
const bevelMetres = 0.003
const toothRootShareOfThePitch = 0.56
const toothTipShareOfThePitch = 0.3
const rootArcPoints = 4
const spokeShareOfAWindow = 0.28
const windowInsideTheRimMetres = 0.008
const rivetsOnTheRim = 10
const rivetRadiusMetres = 0.005
const axleRiseMetres = 0.012
const nutRadiusMetres = 0.022
const nutHeightMetres = 0.01
const boltHeadRadiusMetres = 0.008
const turnRadiansPerSecond = 0.12

export class SettingsGear {
  readonly root = new THREE.Group()
  private readonly big: THREE.Group
  private readonly small: THREE.Group

  constructor(materials: SurfaceMaterials) {
    this.big = gearOf(bigGear, materials.materialFor('brass'), materials)
    this.small = gearOf(smallGear, materials.materialFor('copper'), materials)
    const centresApart = bigGear.pitchRadius + smallGear.pitchRadius
    this.small.position.set(Math.cos(smallGearDirectionRadians) * centresApart, Math.sin(smallGearDirectionRadians) * centresApart, 0)
    this.root.add(this.big, this.small)
    this.root.traverse((part) => (part.castShadow = true))
    this.turn(0)
  }

  turn(timeSeconds: number): void {
    const bigTurn = timeSeconds * turnRadiansPerSecond
    const gapTowardsTheSmallGear = smallGearDirectionRadians - Math.PI / bigGear.teeth
    this.big.rotation.z = gapTowardsTheSmallGear + bigTurn
    this.small.rotation.z = smallGearDirectionRadians + Math.PI - bigTurn * (bigGear.teeth / smallGear.teeth)
  }
}

function gearOf(outline: GearOutline, metal: THREE.Material, materials: SurfaceMaterials): THREE.Group {
  const gear = new THREE.Group()
  const wheel = new THREE.Mesh(new THREE.ExtrudeGeometry(gearShapeOf(outline), { depth: outline.depth, bevelEnabled: true, bevelThickness: bevelMetres, bevelSize: bevelMetres, bevelSegments: 2, curveSegments: 24 }), metal)
  const darkIron = materials.materialFor('darkIron')
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(outline.hubRadius, outline.hubRadius, outline.depth + axleRiseMetres, 24), darkIron)
  axle.rotation.x = Math.PI / 2
  axle.position.z = (outline.depth + axleRiseMetres) / 2
  const front = outline.depth + axleRiseMetres
  const nutRadius = Math.min(nutRadiusMetres, outline.hubRadius * 0.8)
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(nutRadius, nutRadius, nutHeightMetres, 6), metal)
  nut.rotation.x = Math.PI / 2
  nut.position.z = front + nutHeightMetres / 2
  const boltHead = new THREE.Mesh(new THREE.SphereGeometry(Math.min(boltHeadRadiusMetres, nutRadius * 0.6), 12, 8), darkIron)
  boltHead.position.z = front + nutHeightMetres
  gear.add(wheel, axle, nut, boltHead, ...rivetsOn(outline, darkIron))
  return gear
}

function gearShapeOf(outline: GearOutline): THREE.Shape {
  const rootRadius = outline.pitchRadius - outline.toothHeight / 2
  const tipRadius = outline.pitchRadius + outline.toothHeight / 2
  const pitchAngle = (Math.PI * 2) / outline.teeth
  const rootHalf = (pitchAngle * toothRootShareOfThePitch) / 2
  const tipHalf = (pitchAngle * toothTipShareOfThePitch) / 2
  const points: THREE.Vector2[] = []
  for (let tooth = 0; tooth < outline.teeth; tooth += 1) {
    const centre = tooth * pitchAngle
    points.push(pointAt(centre - rootHalf, rootRadius), pointAt(centre - tipHalf, tipRadius), pointAt(centre + tipHalf, tipRadius), pointAt(centre + rootHalf, rootRadius))
    for (let step = 1; step < rootArcPoints; step += 1) points.push(pointAt(centre + rootHalf + ((pitchAngle - 2 * rootHalf) * step) / rootArcPoints, rootRadius))
  }
  const shape = new THREE.Shape(points)
  shape.holes.push(...windowsOf(outline, rootRadius))
  return shape
}

function windowsOf(outline: GearOutline, rootRadius: number): THREE.Path[] {
  const outerRadius = rootRadius - outline.rimWidth
  const innerRadius = outline.hubRadius + windowInsideTheRimMetres
  if (outline.windows === 0 || outerRadius <= innerRadius) return []
  const windowAngle = (Math.PI * 2) / outline.windows
  return Array.from({ length: outline.windows }, (_, index) => {
    const start = index * windowAngle + (windowAngle * spokeShareOfAWindow) / 2
    const end = (index + 1) * windowAngle - (windowAngle * spokeShareOfAWindow) / 2
    const window = new THREE.Path()
    window.absarc(0, 0, outerRadius, start, end, false)
    window.absarc(0, 0, innerRadius, end, start, true)
    window.closePath()
    return window
  })
}

function rivetsOn(outline: GearOutline, material: THREE.Material): THREE.Mesh[] {
  if (outline.rimWidth === 0) return []
  const radius = outline.pitchRadius - outline.toothHeight / 2 - outline.rimWidth / 2
  const rivet = new THREE.SphereGeometry(rivetRadiusMetres, 10, 6)
  return Array.from({ length: rivetsOnTheRim }, (_, index) => {
    const angle = ((index + 0.5) / rivetsOnTheRim) * Math.PI * 2
    const mesh = new THREE.Mesh(rivet, material)
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, outline.depth + bevelMetres)
    return mesh
  })
}

function pointAt(angle: number, radius: number): THREE.Vector2 {
  return new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius)
}
