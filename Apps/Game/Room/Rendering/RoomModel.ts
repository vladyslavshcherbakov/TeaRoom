import * as THREE from 'three'
import type { TapTargetTag } from '../TapTarget.ts'
import { furnitureWithId, heaterPlate, pointAwayFromTheWall, roomHalfSize, turnFacing, turnFacingTheRoom, type FigurineSpot, type Furniture, type ItemSpot, type RoomLayout, type WallSide, type WallWindow } from '../RoomLayout.ts'
import type { WorldPoint } from '../../../Engine/Points.ts'
import { shelfBoards } from '../../../../Shared/Content/Rooms.ts'
import { facingDirection } from '../../../../Shared/Content/PiecePlacement.ts'
import type { RoomArrangement } from '../RoomArrangement.ts'
import type { AppLog } from '../../../Engine/AppLog.ts'
import { surfaceByCushionColour, surfaceByFigurineId, type RoomMaterials, type Surface } from './RoomMaterials.ts'
import { HeaterControls, type HeaterControlsView } from './HeaterControls.ts'
import { WallThings } from './WallThings.ts'
import type { PuddleView } from '../../Presentation/WorldViewState.ts'
import { floorDistanceBetween } from '../../../Engine/Arithmetic.ts'
import { Decal, roundDecalMask } from '../../../Engine/Rendering/Decal.ts'

const puddleReshapedAfterMetres = 0.005
const heaterControlsBelowThePlateMetres = 0.2
const wallHeight = 2.6
const wallThickness = 0.12
const faucetPostAboveTheSpoutMetres = 0.04
const faucetArmUnderThePostTopMetres = 0.018

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
  private readonly log: AppLog
  private readonly heaterPlate: THREE.Mesh
  private readonly wallThings: WallThings
  private readonly heaterControls: HeaterControls
  private readonly puddlesById = new Map<string, ShownPuddle>()
  private readonly puddleReceiversByPlace = new Map<string, THREE.Mesh[]>()
  private readonly puddleMaterial: THREE.Material
  private readonly placesReportedWithoutAPuddleCentre = new Set<string>()
  readonly root = new THREE.Group()
  readonly tappableMeshes: THREE.Object3D[] = []
  readonly prophecyInscription: THREE.Mesh | null

  constructor(materials: RoomMaterials, layout: RoomLayout, arrangement: RoomArrangement, heaterSpot: WorldPoint, log: AppLog) {
    this.materials = materials
    this.layout = layout
    this.arrangement = arrangement
    this.log = log
    this.puddleMaterial = puddleMaterialFrom(materials)
    this.addFloor()
    const inscriptions = wallSides.flatMap((wall) => this.addWall(wall, layout.windows.filter((window) => window.wall === wall)))
    this.prophecyInscription = inscriptions[0] ?? null
    this.wallThings = new WallThings(materials, layout, (object, tag) => this.tag(object, tag))
    this.root.add(...this.wallThings.roots)
    for (const piece of layout.furniture) this.addFurniture(piece)
    for (const spot of layout.itemSpots) this.addItem(spot)
    this.addSinkBasin(furnitureWithId(layout, 'counter').height)
    this.heaterControls = new HeaterControls(materials, (object, tag) => this.tag(object, tag), log)
    this.heaterPlate = this.addHeater(heaterSpot)
  }

  get isTheSettingsGearTurning(): boolean {
    return this.wallThings.settingsGear.isTurning
  }

  showTheMedal(isShown: boolean): void {
    this.wallThings.medal.visible = isShown
  }

  shadowCastersPose(): string {
    return `medal ${this.wallThings.medal.visible ? 'shown' : 'hidden'}`
  }

  turnTheSettingsGearOneTooth(): void {
    this.wallThings.settingsGear.turnOneTooth()
  }

  advanceTheSettingsGear(seconds: number): void {
    this.wallThings.settingsGear.advance(seconds)
  }

  showHeater(isOn: boolean): void {
    this.heaterPlate.material = this.materials.materialFor(isOn ? 'workingHeaterPlate' : 'heaterPlate')
  }

  showHeaterControls(view: HeaterControlsView): void {
    this.heaterControls.show(view)
  }

  showPuddles(puddles: readonly PuddleView[]): void {
    const puddleIdsShown = new Set(puddles.map((puddle) => puddle.puddleId))
    for (const [puddleId, shown] of this.puddlesById) if (!puddleIdsShown.has(puddleId)) this.removeThePuddle(puddleId, shown)
    for (const puddle of puddles) {
      const receivers = this.puddleReceiversByPlace.get(puddle.placeId)
      if (receivers === undefined) {
        if (!this.placesReportedWithoutAPuddleCentre.has(puddle.placeId)) this.log(`${puddle.puddleId} on the ${puddle.placeId} is not drawn, because the room has no furniture for that place`, 'error')
        this.placesReportedWithoutAPuddleCentre.add(puddle.placeId)
        continue
      }
      const shown = this.puddlesById.get(puddle.puddleId) ?? this.addPuddle(puddle.puddleId)
      this.reshapeThePuddle(shown, receivers, puddle.centre, puddle.radiusMetres)
    }
  }

  private addFloor(): void {
    const floor = this.addBox('floor', roomHalfSize * 2, 0.1, roomHalfSize * 2, { x: 0, y: -0.05, z: 0 })
    floor.receiveShadow = true
    this.tag(floor, { kind: 'floor' })
  }

  private addWall(wall: WallSide, windows: readonly WallWindow[]): THREE.Mesh[] {
    const middleOfTheWall = -wallThickness / 2
    const windowsInOrder = [...windows].sort((first, second) => first.centreAlongTheWall - second.centreAlongTheWall)
    let solidFrom = -roomHalfSize
    const inscriptions: THREE.Mesh[] = []
    for (const window of windowsInOrder) {
      const windowStart = window.centreAlongTheWall - window.width / 2
      const windowTop = window.sillHeight + window.height
      this.addWallBox(wall, 'wall', windowStart - solidFrom, wallHeight, wallThickness, { alongTheWall: (solidFrom + windowStart) / 2, y: wallHeight / 2, intoTheRoom: middleOfTheWall })
      this.addWallBox(wall, 'wall', window.width, window.sillHeight, wallThickness, { alongTheWall: window.centreAlongTheWall, y: window.sillHeight / 2, intoTheRoom: middleOfTheWall })
      this.addWallBox(wall, 'wall', window.width, wallHeight - windowTop, wallThickness, { alongTheWall: window.centreAlongTheWall, y: (windowTop + wallHeight) / 2, intoTheRoom: middleOfTheWall })
      this.addWallBox(wall, 'darkWood', window.width + 0.1, 0.05, sillDepthMetres, { alongTheWall: window.centreAlongTheWall, y: window.sillHeight, intoTheRoom: middleOfTheWall + sillIntoTheRoomMetres })
      this.addWallBox(wall, 'darkWood', 0.05, window.height, 0.06, { alongTheWall: window.centreAlongTheWall, y: window.sillHeight + window.height / 2, intoTheRoom: middleOfTheWall })
      this.addSkyBehind(wall, window)
      if (window.hasTheProphecyAbove) inscriptions.push(this.addProphecy(wall, { alongTheWall: window.centreAlongTheWall, y: (windowTop + wallHeight) / 2, intoTheRoom: -wallThickness - 0.002 }))
      solidFrom = window.centreAlongTheWall + window.width / 2
    }
    this.addWallBox(wall, 'wall', roomHalfSize - solidFrom, wallHeight, wallThickness, { alongTheWall: (solidFrom + roomHalfSize) / 2, y: wallHeight / 2, intoTheRoom: middleOfTheWall })
    return inscriptions
  }

  private addSkyBehind(wall: WallSide, window: WallWindow): void {
    const skyStart = Math.max(-roomHalfSize, window.centreAlongTheWall - (window.width + skyBeyondTheWindowMetres) / 2)
    const skyEnd = Math.min(roomHalfSize, window.centreAlongTheWall + (window.width + skyBeyondTheWindowMetres) / 2)
    const distanceToTheWallsEnd = Math.min(skyStart + roomHalfSize, roomHalfSize - skyEnd)
    const gapBehindTheWall = Math.max(smallestSkyGapBehindTheWallMetres, Math.min(skyBehindTheWindowMetres - wallThickness / 2, distanceToTheWallsEnd))
    const size = { width: skyEnd - skyStart, height: window.height + skyBeyondTheWindowMetres }
    this.addWallPlane(wall, 'sky', size, { alongTheWall: (skyStart + skyEnd) / 2, y: window.sillHeight + window.height / 2, intoTheRoom: -wallThickness - gapBehindTheWall }, false)
  }

  private addProphecy(wall: WallSide, point: PointOnAWall): THREE.Mesh {
    return this.addWallPlane(wall, 'prophecyInscription', this.materials.prophecySizeMetres(), point, true)
  }

  private addWallBox(wall: WallSide, surface: Surface, alongTheWall: number, height: number, thickness: number, centre: PointOnAWall): THREE.Mesh {
    const [width, depth] = wall === 'back' ? [alongTheWall, thickness] : [thickness, alongTheWall]
    return this.addBox(surface, width, height, depth, pointInTheRoom(wall, centre))
  }

  private addWallPlane(wall: WallSide, surface: Surface, size: { width: number; height: number }, centre: PointOnAWall, facesOutside: boolean): THREE.Mesh {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(size.width, size.height), this.materials.materialFor(surface))
    const { x, y, z } = pointInTheRoom(wall, centre)
    plane.position.set(x, y, z)
    plane.rotation.y = turnFacingTheRoom(wall) + (facesOutside ? Math.PI : 0)
    this.root.add(plane)
    return plane
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
      this.addBox('wood', footprint.width, sinkBasin.floorHeight, footprint.depth, { x: footprint.x, y: sinkBasin.floorHeight / 2, z: footprint.z }),
      this.addBox('wood', hole.left - left, topHeight, footprint.depth, { x: (left + hole.left) / 2, y: topY, z: footprint.z }),
      this.addBox('wood', right - hole.right, topHeight, footprint.depth, { x: (hole.right + right) / 2, y: topY, z: footprint.z }),
      this.addBox('wood', sinkBasin.width, topHeight, hole.back - back, { x: sinkBasin.x, y: topY, z: (back + hole.back) / 2 }),
      this.addBox('wood', sinkBasin.width, topHeight, front - hole.front, { x: sinkBasin.x, y: topY, z: (hole.front + front) / 2 }),
    ]
    for (const counterPiece of pieces) this.tag(counterPiece, { kind: 'furniture', furnitureId: piece.id })
    this.receivePuddlesOn(piece.id, pieces.slice(1))
  }

  private addShelf(piece: Furniture): void {
    const { footprint, height } = piece
    for (const boardHeight of [...shelfBoards.centreHeightsMetres, height]) {
      const board = this.addBox('darkWood', footprint.width, shelfBoards.thicknessMetres, footprint.depth, { x: footprint.x, y: boardHeight, z: footprint.z })
      this.tag(board, { kind: 'furniture', furnitureId: piece.id })
      this.receivePuddlesOn(piece.id, [board])
    }
    const runsAlongX = footprint.width > footprint.depth
    for (const side of [-1, 1]) {
      const end = runsAlongX ? { x: footprint.x + (side * footprint.width) / 2, y: height / 2, z: footprint.z } : { x: footprint.x, y: height / 2, z: footprint.z + (side * footprint.depth) / 2 }
      const [endWidth, endDepth] = runsAlongX ? [0.04, footprint.depth] : [footprint.width, 0.04]
      this.tag(this.addBox('darkWood', endWidth, height, endDepth, end), { kind: 'furniture', furnitureId: piece.id })
    }
  }

  private addTeaTable(piece: Furniture): void {
    const { footprint, height } = piece
    const top = this.addBox('wood', footprint.width, 0.06, footprint.depth, { x: footprint.x, y: height - 0.03, z: footprint.z })
    this.tag(top, { kind: 'furniture', furnitureId: piece.id })
    this.receivePuddlesOn(piece.id, [top])
    for (const [legX, legZ] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
      const position = { x: footprint.x + legX * (footprint.width / 2 - 0.08), y: (height - 0.06) / 2, z: footprint.z + legZ * (footprint.depth / 2 - 0.08) }
      this.tag(this.addBox('darkWood', 0.07, height - 0.06, 0.07, position), { kind: 'furniture', furnitureId: piece.id })
    }
    const cushionSurface = surfaceByCushionColour[this.arrangement.cushionColour]
    for (const spot of this.layout.cushionSpots.slice(0, this.arrangement.cushionCount)) {
      this.addCylinder(cushionSurface, 0.28, 0.08, { x: spot.x, y: 0.04, z: spot.z }).castShadow = false
    }
  }

  private addItem(spot: ItemSpot): void {
    switch (spot.shape) {
      case 'faucet':
        return this.tag(this.addFaucet(spot.position), { kind: 'faucet' })
      case 'figurine':
        return this.tag(this.addFigurine(spot), { kind: 'figurine', figurineId: spot.id })
    }
  }

  private reshapeThePuddle(shown: ShownPuddle, receivers: readonly THREE.Mesh[], centre: WorldPoint, radiusMetres: number): void {
    const hasMoved = floorDistanceBetween(centre, shown.centre) > puddleReshapedAfterMetres || Math.abs(centre.y - shown.centre.y) > puddleReshapedAfterMetres
    if (!hasMoved && Math.abs(radiusMetres - shown.radiusMetres) <= puddleReshapedAfterMetres) return
    shown.decal.projectDown(receivers, centre, radiusMetres * 2)
    shown.centre = centre
    shown.radiusMetres = radiusMetres
  }

  private addPuddle(puddleId: string): ShownPuddle {
    const shown: ShownPuddle = { decal: new Decal(this.puddleMaterial), centre: { x: 0, y: 0, z: 0 }, radiusMetres: 0 }
    this.puddlesById.set(puddleId, shown)
    this.root.add(shown.decal.mesh)
    return shown
  }

  private removeThePuddle(puddleId: string, shown: ShownPuddle): void {
    shown.decal.free()
    this.puddlesById.delete(puddleId)
  }

  private receivePuddlesOn(placeId: string, tops: readonly THREE.Mesh[]): void {
    this.puddleReceiversByPlace.set(placeId, [...(this.puddleReceiversByPlace.get(placeId) ?? []), ...tops])
  }

  private addHeater(spot: WorldPoint): THREE.Mesh {
    const plate = this.addBox('heaterPlate', heaterPlate.width, heaterPlate.height, heaterPlate.depth, { x: spot.x, y: spot.y - heaterPlate.height / 2, z: spot.z })
    this.tag(plate, { kind: 'heater' })
    const counter = furnitureWithId(this.layout, 'counter')
    const ahead = facingDirection(counter.facing)
    const toTheFront = (counter.facing === 'towardsTheFront' || counter.facing === 'towardsTheBack' ? counter.footprint.depth : counter.footprint.width) / 2
    const heaterForward = (spot.x - counter.footprint.x) * ahead.x + (spot.z - counter.footprint.z) * ahead.z
    const controls = this.heaterControls.root
    controls.position.set(spot.x + ahead.x * (toTheFront - heaterForward), spot.y - heaterControlsBelowThePlateMetres, spot.z + ahead.z * (toTheFront - heaterForward))
    controls.rotation.y = turnFacing(counter.facing)
    this.root.add(controls)
    return plate
  }

  private addFaucet(base: WorldPoint): THREE.Object3D {
    const { faucetSpout } = this.layout
    const reach = floorDistanceBetween(faucetSpout, base)
    const faucet = new THREE.Group()
    const turned = new THREE.Group()
    turned.position.set(base.x, base.y, base.z)
    turned.rotation.y = Math.atan2(faucetSpout.x - base.x, faucetSpout.z - base.z)
    const postHeight = faucetSpout.y - base.y + faucetPostAboveTheSpoutMetres
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, postHeight, 0.05), this.materials.materialFor('steel'))
    post.position.set(0, postHeight / 2, 0)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, reach + 0.02), this.materials.materialFor('faucetArm'))
    arm.position.set(0, faucetSpout.y - base.y + faucetArmUnderThePostTopMetres, reach / 2)
    post.castShadow = true
    arm.castShadow = true
    turned.add(post, arm)
    faucet.add(turned)
    this.root.add(faucet)
    return faucet
  }

  private addSinkBasin(counterHeight: number): void {
    const basin = new THREE.Group()
    basin.add(...this.sinkBasinInside(counterHeight))
    this.root.add(basin)
    this.tag(basin, { kind: 'sink' })
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

  private addFigurine(spot: FigurineSpot): THREE.Object3D {
    const surface = surfaceByFigurineId[spot.id]
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

  private addBox(surface: Surface, width: number, height: number, depth: number, centre: { x: number; y: number; z: number }): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), this.materials.materialFor(surface))
    mesh.position.set(centre.x, centre.y, centre.z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.root.add(mesh)
    return mesh
  }

  private addCylinder(surface: Surface, radius: number, height: number, centre: { x: number; y: number; z: number }): THREE.Mesh {
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

function pointInTheRoom(wall: WallSide, point: PointOnAWall): WorldPoint {
  return pointAwayFromTheWall({ wall, alongTheWall: point.alongTheWall, y: point.y }, point.intoTheRoom)
}

type ShownPuddle = {
  readonly decal: Decal
  centre: WorldPoint
  radiusMetres: number
}

function puddleMaterialFrom(materials: RoomMaterials): THREE.Material {
  const puddle = materials.unsharedMaterialFor('puddle')
  puddle.alphaMap = roundDecalMask()
  puddle.transparent = true
  puddle.depthWrite = false
  puddle.polygonOffset = true
  puddle.polygonOffsetFactor = -4
  return puddle
}
