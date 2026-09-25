import * as THREE from 'three'
import { touchAreaOf } from './RoomLayers.ts'
import type { HandIndex } from '../../../../Shared/Simulation/State/SessionState.ts'
import {
  faucetSpout,
  sinkBasin,
  furniture,
  furnitureWithId,
  itemSpots,
  puddleCentreOn,
  puddleRadiusMetres,
  roomHalfSize,
  windowOnBackWall,
  medalOnLeftWall,
  settingsGearOnLeftWall,
  type Footprint,
  type Furniture,
  type FurnitureId,
  type ItemSpot,
  type WorldPoint,
} from '../RoomLayout.ts'
import type { RoomMaterials, Surface } from './RoomMaterials.ts'
import type { TableViewState } from '../../Table/TableViewState.ts'

const puddleSegments = 40
const wallHeight = 2.6
const wallThickness = 0.12
const medalRadiusMetres = 0.13
const medalThicknessMetres = 0.025
const medalRibbonWidthMetres = 0.09
const medalRibbonLengthMetres = 0.3
const medalRibbonTiltRadians = 0.35
const medalTouchAreaMetres = 0.55
const gearRadiusMetres = 0.13
const gearThicknessMetres = 0.03
const gearToothMetres = 0.06
const gearTeeth = 8
const gearTouchAreaWidthMetres = 0.9
const gearTouchAreaHeightMetres = 0.7
const gearTouchAreaDepthMetres = 0.3
const gearTouchAreaBelowTheGearMetres = 0.08
const faucetPostAboveTheSpoutMetres = 0.04
const faucetTouchAreaWidthMetres = 0.2
const faucetTouchAreaAboveTheCounterMetres = 0.12
const faucetTouchAreaBeyondTheFaucetMetres = 0.08
const reachOfFurnitureMetres = 0.35
const heaterGlowColour = new THREE.Color('#e0603a')
const heaterGlowIntensity = 0.8
const noGlow = new THREE.Color(0x000000)

export type TapTargetTag =
  | { readonly furnitureId: FurnitureId }
  | { readonly isFloor: true }
  | { readonly isHeater: true }
  | { readonly isHeaterSwitch: true }
  | { readonly isFaucet: true }
  | { readonly itemId: string }
  | { readonly handIndex: HandIndex }
  | { readonly lidOfItemId: string }
  | { readonly figurineId: string }
  | { readonly isRoseBush: true }
  | { readonly isMedal: true }
  | { readonly isSettingsGear: true }

export class RoomModel {
  private readonly materials: RoomMaterials
  private readonly heaterPlate: THREE.Mesh
  private readonly puddlesByPlace = new Map<string, THREE.Mesh>()
  readonly root = new THREE.Group()
  readonly tappableMeshes: THREE.Object3D[] = []

  constructor(materials: RoomMaterials, heaterSpot: WorldPoint) {
    this.materials = materials
    this.addFloor()
    this.addBackWallWithWindow()
    this.addLeftWall()
    this.addMedal()
    this.addSettingsGear()
    for (const piece of furniture) this.addFurniture(piece)
    for (const spot of itemSpots) this.addItem(spot)
    this.heaterPlate = this.addHeater(heaterSpot)
  }

  showHeater(isOn: boolean): void {
    const material = this.heaterPlate.material
    if (!(material instanceof THREE.MeshStandardMaterial)) return
    material.emissive.copy(isOn ? heaterGlowColour : noGlow)
    material.emissiveIntensity = isOn ? heaterGlowIntensity : 0
  }

  showPuddles(puddles: readonly TableViewState.Puddle[]): void {
    for (const mesh of this.puddlesByPlace.values()) mesh.visible = false
    for (const puddle of puddles) {
      const centre = puddleCentreOn(puddle.placeId, puddle.spilledAround)
      if (centre === null || puddle.share === 0) continue
      const mesh = this.puddlesByPlace.get(puddle.placeId) ?? this.addPuddle(puddle.placeId)
      mesh.position.set(centre.x, centre.y, centre.z)
      mesh.scale.setScalar(puddleRadiusMetres(puddle.share))
      mesh.visible = true
    }
  }

  private addFloor(): void {
    const floor = this.box('floor', roomHalfSize * 2, 0.1, roomHalfSize * 2, { x: 0, y: -0.05, z: 0 })
    floor.receiveShadow = true
    this.tag(floor, { isFloor: true })
  }

  private addBackWallWithWindow(): void {
    const z = -roomHalfSize - wallThickness / 2
    const { centreX, sillHeight, width, height } = windowOnBackWall
    const windowLeft = centreX - width / 2
    const windowRight = centreX + width / 2
    const windowTop = sillHeight + height
    this.box('wall', windowLeft + roomHalfSize, wallHeight, wallThickness, { x: (windowLeft - roomHalfSize) / 2, y: wallHeight / 2, z })
    this.box('wall', roomHalfSize - windowRight, wallHeight, wallThickness, { x: (windowRight + roomHalfSize) / 2, y: wallHeight / 2, z })
    this.box('wall', width, sillHeight, wallThickness, { x: centreX, y: sillHeight / 2, z })
    this.box('wall', width, wallHeight - windowTop, wallThickness, { x: centreX, y: (windowTop + wallHeight) / 2, z })
    this.box('darkWood', width + 0.1, 0.05, 0.3, { x: centreX, y: sillHeight, z: z + 0.1 })
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.4, height + 0.4), this.materials.materialFor('sky'))
    sky.position.set(centreX, sillHeight + height / 2, z - 0.3)
    this.root.add(sky)
    this.box('darkWood', 0.05, height, 0.06, { x: centreX, y: sillHeight + height / 2, z })
  }

  private addMedal(): void {
    const medal = new THREE.Group()
    for (const side of [-1, 1]) {
      const ribbon = this.plainBox('medalRibbon', medalRibbonWidthMetres, medalRibbonLengthMetres, 0.004, { x: side * medalRibbonWidthMetres * 0.45, y: medalRadiusMetres + medalRibbonLengthMetres * 0.42, z: 0.004 })
      ribbon.rotation.z = side * medalRibbonTiltRadians
      medal.add(ribbon)
    }
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(medalRadiusMetres, medalRadiusMetres, medalThicknessMetres, 32), this.materials.materialFor('gildedRim'))
    disc.rotation.x = Math.PI / 2
    disc.position.z = medalThicknessMetres / 2 + 0.008
    disc.castShadow = true
    const touchArea = this.touchArea(medalTouchAreaMetres, medalTouchAreaMetres * 1.3, 0.05)
    touchArea.position.set(0, medalRibbonLengthMetres * 0.4, 0.025)
    medal.add(disc, touchArea)
    medal.position.set(-roomHalfSize, medalOnLeftWall.y, medalOnLeftWall.z)
    medal.rotation.y = Math.PI / 2
    this.root.add(medal)
    this.tag(medal, { isMedal: true })
  }

  private addSettingsGear(): void {
    const gear = new THREE.Group()
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(gearRadiusMetres, gearRadiusMetres, gearThicknessMetres, 32), this.materials.materialFor('steel'))
    wheel.rotation.x = Math.PI / 2
    gear.add(wheel)
    for (let tooth = 0; tooth < gearTeeth; tooth += 1) {
      const angle = (tooth / gearTeeth) * Math.PI * 2
      const toothMesh = this.plainBox('steel', gearToothMetres, gearToothMetres, gearThicknessMetres, { x: Math.cos(angle) * gearRadiusMetres, y: Math.sin(angle) * gearRadiusMetres, z: 0 })
      toothMesh.rotation.z = angle
      gear.add(toothMesh)
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(gearRadiusMetres * 0.35, gearRadiusMetres * 0.35, gearThicknessMetres * 1.4, 16), this.materials.materialFor('heaterPlate'))
    hub.rotation.x = Math.PI / 2
    gear.add(hub)
    gear.traverse((part) => (part.castShadow = true))
    const touchArea = this.touchArea(gearTouchAreaWidthMetres, gearTouchAreaHeightMetres, gearTouchAreaDepthMetres)
    touchArea.position.set(0, -gearTouchAreaBelowTheGearMetres, gearTouchAreaDepthMetres / 2)
    gear.add(touchArea)
    gear.position.set(-roomHalfSize + gearThicknessMetres / 2 + 0.01, settingsGearOnLeftWall.y, settingsGearOnLeftWall.z)
    gear.rotation.y = Math.PI / 2
    this.root.add(gear)
    this.tag(gear, { isSettingsGear: true })
  }

  private touchArea(width: number, height: number, depth: number): THREE.Mesh {
    const area = touchAreaOf(new THREE.BoxGeometry(width, height, depth))
    area.userData = { isForgivingTouchArea: true }
    return area
  }

  private addLeftWall(): void {
    this.box('wall', wallThickness, wallHeight, roomHalfSize * 2, { x: -roomHalfSize - wallThickness / 2, y: wallHeight / 2, z: 0 })
  }

  private addFurniture(piece: Furniture): void {
    switch (piece.id) {
      case 'counter':
        return this.addCounter(piece)
      case 'shelf':
        return this.addShelf(piece)
      case 'teaTable':
        return this.addTeaTable(piece)
    }
  }

  private addCounter(piece: Furniture): void {
    const { footprint, height } = piece
    const left = footprint.x - footprint.width / 2
    const right = footprint.x + footprint.width / 2
    const back = footprint.z - footprint.depth / 2
    const front = footprint.z + footprint.depth / 2
    const hole = { left: sinkBasin.x - sinkBasin.width / 2, right: sinkBasin.x + sinkBasin.width / 2, back: sinkBasin.z - sinkBasin.depth / 2, front: sinkBasin.z + sinkBasin.depth / 2 }
    const topHeight = height - sinkBasin.floorHeight
    const topY = sinkBasin.floorHeight + topHeight / 2
    const pieces = [
      this.box('wood', footprint.width, sinkBasin.floorHeight, footprint.depth, { x: footprint.x, y: sinkBasin.floorHeight / 2, z: footprint.z }),
      this.box('wood', hole.left - left, topHeight, footprint.depth, { x: (left + hole.left) / 2, y: topY, z: footprint.z }),
      this.box('wood', right - hole.right, topHeight, footprint.depth, { x: (hole.right + right) / 2, y: topY, z: footprint.z }),
      this.box('wood', sinkBasin.width, topHeight, hole.back - back, { x: sinkBasin.x, y: topY, z: (back + hole.back) / 2 }),
      this.box('wood', sinkBasin.width, topHeight, front - hole.front, { x: sinkBasin.x, y: topY, z: (hole.front + front) / 2 }),
    ]
    for (const counterPiece of pieces) this.tag(counterPiece, { furnitureId: piece.id })
  }

  private addShelf(piece: Furniture): void {
    const { footprint, height } = piece
    for (const boardHeight of [0.05, 0.7, 1.2, height]) {
      this.tag(this.box('darkWood', footprint.width, 0.04, footprint.depth, { x: footprint.x, y: boardHeight, z: footprint.z }), { furnitureId: piece.id })
    }
    for (const side of [-1, 1]) {
      const sideZ = footprint.z + (side * footprint.depth) / 2
      this.tag(this.box('darkWood', footprint.width, height, 0.04, { x: footprint.x, y: height / 2, z: sideZ }), { furnitureId: piece.id })
    }
  }

  private addTeaTable(piece: Furniture): void {
    const { footprint, height } = piece
    this.tag(this.box('wood', footprint.width, 0.06, footprint.depth, { x: footprint.x, y: height - 0.03, z: footprint.z }), { furnitureId: piece.id })
    for (const [legX, legZ] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
      const position = { x: footprint.x + legX * (footprint.width / 2 - 0.08), y: (height - 0.06) / 2, z: footprint.z + legZ * (footprint.depth / 2 - 0.08) }
      this.tag(this.box('darkWood', 0.07, height - 0.06, 0.07, position), { furnitureId: piece.id })
    }
    const [frontSide] = piece.sides
    const cushion = this.cylinder('cushion', 0.28, 0.08, { x: frontSide.standingPoint.x, y: 0.04, z: frontSide.standingPoint.z })
    cushion.castShadow = false
  }

  private addItem(spot: ItemSpot): void {
    const mesh = this.itemMesh(spot)
    if (spot.shape === 'figurine') return this.tag(mesh, { figurineId: spot.id })
    if (spot.shape === 'faucet') return this.tag(mesh, { isFaucet: true })
    const furnitureId = furnitureWithinReachOf(spot)
    if (furnitureId !== null) this.tag(mesh, { furnitureId })
  }

  private addPuddle(placeId: string): THREE.Mesh {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, puddleSegments), this.materials.materialFor('puddle'))
    puddle.rotation.x = -Math.PI / 2
    this.puddlesByPlace.set(placeId, puddle)
    this.root.add(puddle)
    return puddle
  }

  private addHeater(spot: WorldPoint): THREE.Mesh {
    const plate = this.box('heaterPlate', 0.34, 0.05, 0.3, { x: spot.x, y: spot.y - 0.025, z: spot.z })
    plate.material = this.materials.unsharedMaterialFor('heaterPlate')
    this.tag(plate, { isHeater: true })
    const counterFront = furnitureWithId('counter').footprint
    const frontZ = counterFront.z + counterFront.depth / 2
    const switchPanel = this.box('heaterPlate', 0.32, 0.2, 0.02, { x: spot.x, y: spot.y - 0.2, z: frontZ + 0.01 })
    const switchKnob = this.cylinder('steel', 0.05, 0.04, { x: spot.x, y: spot.y - 0.2, z: frontZ + 0.04 })
    switchKnob.rotation.x = Math.PI / 2
    this.tag(switchPanel, { isHeaterSwitch: true })
    this.tag(switchKnob, { isHeaterSwitch: true })
    return plate
  }

  private itemMesh(spot: ItemSpot): THREE.Object3D {
    const { x, y, z } = spot.position
    switch (spot.shape) {
      case 'faucet':
        return this.faucet({ x, y, z })
      case 'figurine':
        return this.figurine(spot)
    }
  }

  private faucet(base: WorldPoint): THREE.Object3D {
    const faucet = new THREE.Group()
    const postHeight = faucetSpout.y - base.y + faucetPostAboveTheSpoutMetres
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, postHeight, 0.05), this.materials.materialFor('steel'))
    post.position.set(base.x, base.y + postHeight / 2, base.z)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, faucetSpout.z - base.z + 0.02), this.materials.materialFor('steel'))
    arm.position.set(base.x, faucetSpout.y + 0.02, (base.z + faucetSpout.z) / 2)
    post.castShadow = true
    arm.castShadow = true
    faucet.add(post, arm, this.faucetTouchArea(base, postHeight), ...this.sinkBasinInside(base.y))
    this.root.add(faucet)
    return faucet
  }

  private faucetTouchArea(base: WorldPoint, postHeight: number): THREE.Mesh {
    const bottom = base.y + faucetTouchAreaAboveTheCounterMetres
    const top = base.y + postHeight + faucetTouchAreaBeyondTheFaucetMetres
    const back = base.z - faucetTouchAreaBeyondTheFaucetMetres
    const front = faucetSpout.z + faucetTouchAreaBeyondTheFaucetMetres
    const area = this.touchArea(faucetTouchAreaWidthMetres, top - bottom, front - back)
    area.position.set(base.x, (bottom + top) / 2, (back + front) / 2)
    return area
  }

  private sinkBasinInside(counterHeight: number): THREE.Mesh[] {
    const { x, z, width, depth, floorHeight } = sinkBasin
    const wallHeight = counterHeight - floorHeight
    const wallY = floorHeight + wallHeight / 2
    const floor = this.plainBox('sinkHollow', width, sinkBasin.plateMetres, depth, { x, y: floorHeight + sinkBasin.plateMetres / 2, z })
    return [
      floor,
      this.plainBox('sinkWall', width, wallHeight, sinkBasin.plateMetres, { x, y: wallY, z: z - depth / 2 + sinkBasin.plateMetres / 2 }),
      this.plainBox('sinkWall', width, wallHeight, sinkBasin.plateMetres, { x, y: wallY, z: z + depth / 2 - sinkBasin.plateMetres / 2 }),
      this.plainBox('sinkWall', sinkBasin.plateMetres, wallHeight, depth, { x: x - width / 2 + sinkBasin.plateMetres / 2, y: wallY, z }),
      this.plainBox('sinkWall', sinkBasin.plateMetres, wallHeight, depth, { x: x + width / 2 - sinkBasin.plateMetres / 2, y: wallY, z }),
    ]
  }

  private plainBox(surface: Surface, width: number, height: number, depth: number, centre: WorldPoint): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), this.materials.materialFor(surface))
    mesh.position.set(centre.x, centre.y, centre.z)
    mesh.receiveShadow = true
    return mesh
  }

  private figurine(spot: ItemSpot): THREE.Object3D {
    const surface: Surface = spot.id === 'dragon' ? 'jade' : 'toadBrown'
    const figurine = new THREE.Group()
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), this.materials.materialFor(surface))
    body.position.y = 0.08
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), this.materials.materialFor(surface))
    head.position.y = 0.18
    figurine.add(body, head)
    figurine.position.set(spot.position.x, spot.position.y, spot.position.z)
    figurine.traverse((part) => (part.castShadow = true))
    this.root.add(figurine)
    return figurine
  }

  private box(surface: Surface, width: number, height: number, depth: number, centre: { x: number; y: number; z: number }): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), this.materials.materialFor(surface))
    mesh.position.set(centre.x, centre.y, centre.z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.root.add(mesh)
    return mesh
  }

  private cylinder(surface: Surface, radius: number, height: number, centre: { x: number; y: number; z: number }): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 14), this.materials.materialFor(surface))
    mesh.position.set(centre.x, centre.y, centre.z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.root.add(mesh)
    return mesh
  }

  private tag(object: THREE.Object3D, tag: TapTargetTag): void {
    object.traverse((part) => (part.userData = { ...part.userData, tapTarget: tag }))
    this.tappableMeshes.push(object)
  }
}

function furnitureWithinReachOf(spot: ItemSpot): FurnitureId | null {
  const piece = furniture.find((candidate) => isWithin(candidate.footprint, spot.position, reachOfFurnitureMetres))
  return piece?.id ?? null
}

function isWithin(footprint: Footprint, point: { x: number; z: number }, margin: number): boolean {
  return Math.abs(point.x - footprint.x) <= footprint.width / 2 + margin && Math.abs(point.z - footprint.z) <= footprint.depth / 2 + margin
}
