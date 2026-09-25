import * as THREE from 'three'
import { touchAreaOf } from './RoomLayers.ts'
import type { HandIndex } from '../../../../Shared/Simulation/State/SessionState.ts'
import {
  furnitureWithId,
  puddleCentreOn,
  puddleRadiusMetres,
  roomHalfSize,
  type Footprint,
  type Furniture,
  type FurnitureId,
  type ItemSpot,
  type RoomLayout,
  type SpotOnAWall,
  type WallSide,
  type WallWindow,
  type WorldPoint,
} from '../RoomLayout.ts'
import { facingDirection, shelfBoards, type Facing } from '../../../../Shared/Content/Rooms.ts'
import type { RoomArrangement } from '../RoomArrangement.ts'
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
const gearTouchAreaWidthMetres = 0.5
const gearTouchAreaHeightMetres = 0.5
const gearTouchAreaDepthMetres = 0.3
const gearTouchAreaBelowTheGearMetres = 0.02
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
  | { readonly isSink: true }
  | { readonly itemId: string }
  | { readonly handIndex: HandIndex }
  | { readonly lidOfItemId: string }
  | { readonly figurineId: string }
  | { readonly isRoseBush: true }
  | { readonly isMedal: true }
  | { readonly isSettingsGear: true }

type PointOnAWall = {
  readonly alongTheWall: number
  readonly y: number
  readonly intoTheRoom: number
}

const wallSides: readonly WallSide[] = ['back', 'left']
const sillDepthMetres = 0.3
const sillIntoTheRoomMetres = 0.1
const skyBehindTheWindowMetres = 0.3
const skyBeyondTheWindowMetres = 0.4
const smallestSkyGapBehindTheWallMetres = 0.01

export class RoomModel {
  private readonly materials: RoomMaterials
  private readonly layout: RoomLayout
  private readonly arrangement: RoomArrangement
  private readonly heaterPlate: THREE.Mesh
  private readonly puddlesByPlace = new Map<string, THREE.Mesh>()
  readonly root = new THREE.Group()
  readonly tappableMeshes: THREE.Object3D[] = []
  readonly prophecyInscription: THREE.Mesh | null

  constructor(materials: RoomMaterials, layout: RoomLayout, arrangement: RoomArrangement, heaterSpot: WorldPoint) {
    this.materials = materials
    this.layout = layout
    this.arrangement = arrangement
    this.addFloor()
    const inscriptions = wallSides.flatMap((wall) => this.addWall(wall, layout.windows.filter((window) => window.wall === wall)))
    this.prophecyInscription = inscriptions[0] ?? null
    this.addMedal(layout.medal)
    this.addSettingsGear(layout.settingsGear)
    for (const piece of layout.furniture) this.addFurniture(piece)
    for (const spot of layout.itemSpots) this.addItem(spot)
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
      const centre = puddleCentreOn(this.layout, puddle.placeId, puddle.spilledAround)
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

  private addWall(wall: WallSide, windows: readonly WallWindow[]): THREE.Mesh[] {
    const middleOfTheWall = -wallThickness / 2
    const windowsInOrder = [...windows].sort((first, second) => first.centreAlongTheWall - second.centreAlongTheWall)
    let solidFrom = -roomHalfSize
    const inscriptions: THREE.Mesh[] = []
    for (const window of windowsInOrder) {
      const windowStart = window.centreAlongTheWall - window.width / 2
      const windowTop = window.sillHeight + window.height
      this.wallBox(wall, 'wall', windowStart - solidFrom, wallHeight, wallThickness, { alongTheWall: (solidFrom + windowStart) / 2, y: wallHeight / 2, intoTheRoom: middleOfTheWall })
      this.wallBox(wall, 'wall', window.width, window.sillHeight, wallThickness, { alongTheWall: window.centreAlongTheWall, y: window.sillHeight / 2, intoTheRoom: middleOfTheWall })
      this.wallBox(wall, 'wall', window.width, wallHeight - windowTop, wallThickness, { alongTheWall: window.centreAlongTheWall, y: (windowTop + wallHeight) / 2, intoTheRoom: middleOfTheWall })
      this.wallBox(wall, 'darkWood', window.width + 0.1, 0.05, sillDepthMetres, { alongTheWall: window.centreAlongTheWall, y: window.sillHeight, intoTheRoom: middleOfTheWall + sillIntoTheRoomMetres })
      this.wallBox(wall, 'darkWood', 0.05, window.height, 0.06, { alongTheWall: window.centreAlongTheWall, y: window.sillHeight + window.height / 2, intoTheRoom: middleOfTheWall })
      this.addSkyBehind(wall, window)
      if (window.hasTheProphecyAbove) inscriptions.push(this.addProphecy(wall, { alongTheWall: window.centreAlongTheWall, y: (windowTop + wallHeight) / 2, intoTheRoom: -wallThickness - 0.002 }))
      solidFrom = window.centreAlongTheWall + window.width / 2
    }
    this.wallBox(wall, 'wall', roomHalfSize - solidFrom, wallHeight, wallThickness, { alongTheWall: (solidFrom + roomHalfSize) / 2, y: wallHeight / 2, intoTheRoom: middleOfTheWall })
    return inscriptions
  }

  private addSkyBehind(wall: WallSide, window: WallWindow): void {
    const skyStart = Math.max(-roomHalfSize, window.centreAlongTheWall - (window.width + skyBeyondTheWindowMetres) / 2)
    const skyEnd = Math.min(roomHalfSize, window.centreAlongTheWall + (window.width + skyBeyondTheWindowMetres) / 2)
    const distanceToTheWallsEnd = Math.min(skyStart + roomHalfSize, roomHalfSize - skyEnd)
    const gapBehindTheWall = Math.max(smallestSkyGapBehindTheWallMetres, Math.min(skyBehindTheWindowMetres - wallThickness / 2, distanceToTheWallsEnd))
    const size = { width: skyEnd - skyStart, height: window.height + skyBeyondTheWindowMetres }
    this.wallPlane(wall, 'sky', size, { alongTheWall: (skyStart + skyEnd) / 2, y: window.sillHeight + window.height / 2, intoTheRoom: -wallThickness - gapBehindTheWall }, false)
  }

  private addProphecy(wall: WallSide, point: PointOnAWall): THREE.Mesh {
    return this.wallPlane(wall, 'prophecyInscription', this.materials.prophecySizeMetres(), point, true)
  }

  private wallBox(wall: WallSide, surface: Surface, alongTheWall: number, height: number, thickness: number, centre: PointOnAWall): THREE.Mesh {
    const [width, depth] = wall === 'back' ? [alongTheWall, thickness] : [thickness, alongTheWall]
    return this.box(surface, width, height, depth, pointInTheRoom(wall, centre))
  }

  private wallPlane(wall: WallSide, surface: Surface, size: { width: number; height: number }, centre: PointOnAWall, facesOutside: boolean): THREE.Mesh {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(size.width, size.height), this.materials.materialFor(surface))
    const { x, y, z } = pointInTheRoom(wall, centre)
    plane.position.set(x, y, z)
    plane.rotation.y = turnFacingTheRoom(wall) + (facesOutside ? Math.PI : 0)
    this.root.add(plane)
    return plane
  }

  private addMedal(spot: SpotOnAWall): void {
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
    placeOnTheWall(medal, spot, 0)
    this.root.add(medal)
    this.tag(medal, { isMedal: true })
  }

  private addSettingsGear(spot: SpotOnAWall): void {
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
    placeOnTheWall(gear, spot, gearThicknessMetres / 2 + 0.01)
    this.root.add(gear)
    this.tag(gear, { isSettingsGear: true })
  }

  private touchArea(width: number, height: number, depth: number): THREE.Mesh {
    const area = touchAreaOf(new THREE.BoxGeometry(width, height, depth))
    area.userData = { isForgivingTouchArea: true }
    return area
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
    const { sinkBasin } = this.layout
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
    for (const boardHeight of [...shelfBoards.centreHeightsMetres, height]) {
      this.tag(this.box('darkWood', footprint.width, shelfBoards.thicknessMetres, footprint.depth, { x: footprint.x, y: boardHeight, z: footprint.z }), { furnitureId: piece.id })
    }
    const runsAlongX = footprint.width > footprint.depth
    for (const side of [-1, 1]) {
      const end = runsAlongX ? { x: footprint.x + (side * footprint.width) / 2, y: height / 2, z: footprint.z } : { x: footprint.x, y: height / 2, z: footprint.z + (side * footprint.depth) / 2 }
      const [endWidth, endDepth] = runsAlongX ? [0.04, footprint.depth] : [footprint.width, 0.04]
      this.tag(this.box('darkWood', endWidth, height, endDepth, end), { furnitureId: piece.id })
    }
  }

  private addTeaTable(piece: Furniture): void {
    const { footprint, height } = piece
    this.tag(this.box('wood', footprint.width, 0.06, footprint.depth, { x: footprint.x, y: height - 0.03, z: footprint.z }), { furnitureId: piece.id })
    for (const [legX, legZ] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
      const position = { x: footprint.x + legX * (footprint.width / 2 - 0.08), y: (height - 0.06) / 2, z: footprint.z + legZ * (footprint.depth / 2 - 0.08) }
      this.tag(this.box('darkWood', 0.07, height - 0.06, 0.07, position), { furnitureId: piece.id })
    }
    const cushionSurface: Surface = this.arrangement.cushionColour === 'softBlue' ? 'softBlueCushion' : 'terracottaCushion'
    for (const spot of this.layout.cushionSpots.slice(0, this.arrangement.cushionCount)) {
      this.cylinder(cushionSurface, 0.28, 0.08, { x: spot.x, y: 0.04, z: spot.z }).castShadow = false
    }
  }

  private addItem(spot: ItemSpot): void {
    const mesh = this.itemMesh(spot)
    if (spot.shape === 'figurine') return this.tag(mesh, { figurineId: spot.id })
    if (spot.shape === 'faucet') return this.tag(mesh, { isFaucet: true })
    const furnitureId = furnitureWithinReachOf(this.layout, spot)
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
    const counter = furnitureWithId(this.layout, 'counter')
    const ahead = facingDirection(counter.facing)
    const toTheFront = (counter.facing === 'towardsTheFront' || counter.facing === 'towardsTheBack' ? counter.footprint.depth : counter.footprint.width) / 2
    const heaterForward = (spot.x - counter.footprint.x) * ahead.x + (spot.z - counter.footprint.z) * ahead.z
    const onTheFront = (outward: number) => ({ x: spot.x + ahead.x * (toTheFront - heaterForward + outward), y: spot.y - 0.2, z: spot.z + ahead.z * (toTheFront - heaterForward + outward) })
    const switchPanel = this.box('heaterPlate', 0.32, 0.2, 0.02, onTheFront(0.01))
    switchPanel.rotation.y = turnFacing(counter.facing)
    const switchKnob = this.cylinder('steel', 0.05, 0.04, onTheFront(0.04))
    switchKnob.rotation.set(Math.PI / 2, turnFacing(counter.facing), 0, 'YXZ')
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
    const { faucetSpout } = this.layout
    const reach = Math.hypot(faucetSpout.x - base.x, faucetSpout.z - base.z)
    const faucet = new THREE.Group()
    const turned = new THREE.Group()
    turned.position.set(base.x, base.y, base.z)
    turned.rotation.y = Math.atan2(faucetSpout.x - base.x, faucetSpout.z - base.z)
    const postHeight = faucetSpout.y - base.y + faucetPostAboveTheSpoutMetres
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, postHeight, 0.05), this.materials.materialFor('steel'))
    post.position.set(0, postHeight / 2, 0)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, reach + 0.02), this.materials.materialFor('steel'))
    arm.position.set(0, faucetSpout.y - base.y + 0.02, reach / 2)
    post.castShadow = true
    arm.castShadow = true
    turned.add(post, arm, this.faucetTouchArea(reach, postHeight))
    faucet.add(turned)
    this.root.add(faucet)
    this.addSinkBasin(base.y)
    return faucet
  }

  private faucetTouchArea(reach: number, postHeight: number): THREE.Mesh {
    const bottom = faucetTouchAreaAboveTheCounterMetres
    const top = postHeight + faucetTouchAreaBeyondTheFaucetMetres
    const back = -faucetTouchAreaBeyondTheFaucetMetres
    const front = reach + faucetTouchAreaBeyondTheFaucetMetres
    const area = this.touchArea(faucetTouchAreaWidthMetres, top - bottom, front - back)
    area.position.set(0, (bottom + top) / 2, (back + front) / 2)
    return area
  }

  private addSinkBasin(counterHeight: number): void {
    const basin = new THREE.Group()
    basin.add(...this.sinkBasinInside(counterHeight))
    this.root.add(basin)
    this.tag(basin, { isSink: true })
  }

  private sinkBasinInside(counterHeight: number): THREE.Mesh[] {
    const { sinkBasin } = this.layout
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

function furnitureWithinReachOf(layout: RoomLayout, spot: ItemSpot): FurnitureId | null {
  const piece = layout.furniture.find((candidate) => isWithin(candidate.footprint, spot.position, reachOfFurnitureMetres))
  return piece?.id ?? null
}

function isWithin(footprint: Footprint, point: { x: number; z: number }, margin: number): boolean {
  return Math.abs(point.x - footprint.x) <= footprint.width / 2 + margin && Math.abs(point.z - footprint.z) <= footprint.depth / 2 + margin
}

function pointInTheRoom(wall: WallSide, point: PointOnAWall): WorldPoint {
  const wallFace = -roomHalfSize + point.intoTheRoom
  return wall === 'back' ? { x: point.alongTheWall, y: point.y, z: wallFace } : { x: wallFace, y: point.y, z: point.alongTheWall }
}

function turnFacingTheRoom(wall: WallSide): number {
  return wall === 'back' ? 0 : Math.PI / 2
}

function placeOnTheWall(object: THREE.Object3D, spot: SpotOnAWall, intoTheRoom: number): void {
  const { x, y, z } = pointInTheRoom(spot.wall, { alongTheWall: spot.alongTheWall, y: spot.y, intoTheRoom })
  object.position.set(x, y, z)
  object.rotation.y = turnFacingTheRoom(spot.wall)
}

function turnFacing(facing: Facing): number {
  const ahead = facingDirection(facing)
  return Math.atan2(ahead.x, ahead.z)
}
