import * as THREE from 'three'
import type { HandIndex } from '../../../../Shared/Simulation/State/SessionState.ts'
import {
  faucetSpout,
  furniture,
  furnitureWithId,
  itemSpots,
  roomHalfSize,
  windowOnBackWall,
  type Footprint,
  type Furniture,
  type FurnitureId,
  type ItemSpot,
  type WorldPoint,
} from '../RoomLayout.ts'
import type { RitualTool } from '../RoomPlay.ts'
import type { RoomMaterials, Surface } from './RoomMaterials.ts'

const wallHeight = 2.6
const wallThickness = 0.12
const reachOfFurnitureMetres = 0.35
const chosenToolLiftMetres = 0.04
const largestPuddleRadiusMetres = 0.25

export type TapTargetTag =
  | { readonly furnitureId: FurnitureId }
  | { readonly isFloor: true }
  | { readonly isHeater: true }
  | { readonly isHeaterSwitch: true }
  | { readonly isFaucet: true }
  | { readonly itemId: string }
  | { readonly handIndex: HandIndex }
  | { readonly lidOfItemId: string }
  | { readonly tool: RitualTool }
  | { readonly figurineId: string }

export class RoomModel {
  readonly root = new THREE.Group()
  readonly tappableMeshes: THREE.Object3D[] = []
  readonly heaterPlate: THREE.Mesh
  private readonly materials: RoomMaterials
  private readonly toolsByName = new Map<RitualTool, THREE.Object3D>()
  private readonly toolGlowsByName = new Map<RitualTool, THREE.Object3D>()
  private readonly spoonLeaves: THREE.Mesh
  private readonly puddle: THREE.Mesh

  constructor(materials: RoomMaterials, heaterSpot: WorldPoint) {
    this.materials = materials
    this.addFloor()
    this.addBackWallWithWindow()
    this.addLeftWall()
    for (const piece of furniture) this.addFurniture(piece)
    for (const spot of itemSpots) this.addItem(spot)
    this.heaterPlate = this.addHeater(heaterSpot)
    this.spoonLeaves = this.addSpoonLeaves()
    this.puddle = this.addPuddle()
  }

  showRitualTools(spoonFillShare: number, chosenTool: RitualTool | null): void {
    for (const [tool, mesh] of this.toolsByName) mesh.position.y = tool === chosenTool ? chosenToolLiftMetres : 0
    for (const [tool, glow] of this.toolGlowsByName) glow.visible = tool === chosenTool
    this.spoonLeaves.visible = spoonFillShare > 0
    this.spoonLeaves.scale.set(0.4 + spoonFillShare * 0.6, 1, 0.4 + spoonFillShare * 0.6)
  }

  showPuddle(puddleShare: number): void {
    this.puddle.visible = puddleShare > 0
    this.puddle.scale.setScalar(Math.sqrt(puddleShare) * largestPuddleRadiusMetres)
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
    this.tag(this.box('wood', footprint.width, height, footprint.depth, { x: footprint.x, y: height / 2, z: footprint.z }), { furnitureId: piece.id })
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
    const cushion = this.cylinder('cushion', 0.28, 0.08, { x: piece.standingPoint.x, y: 0.04, z: piece.standingPoint.z })
    cushion.castShadow = false
  }

  private addItem(spot: ItemSpot): void {
    const mesh = this.itemMesh(spot)
    if (spot.shape === 'spoon' || spot.shape === 'cloth') return this.addTool(spot.shape, mesh, spot.position)
    if (spot.shape === 'figurine') return this.tag(mesh, { figurineId: spot.id })
    if (spot.shape === 'faucet') return this.tag(mesh, { isFaucet: true })
    const furnitureId = furnitureWithinReachOf(spot)
    if (furnitureId !== null) this.tag(mesh, { furnitureId })
  }

  private addTool(tool: RitualTool, mesh: THREE.Object3D, position: WorldPoint): void {
    const tool3D = new THREE.Group()
    this.root.add(tool3D)
    tool3D.add(mesh)
    const touchPad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.22), this.invisibleMaterial())
    touchPad.position.set(position.x, position.y + 0.02, position.z)
    touchPad.castShadow = false
    tool3D.add(touchPad)
    this.tag(tool3D, { tool })
    this.toolsByName.set(tool, tool3D)
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), this.materials.materialFor('chosenGlow'))
    glow.rotation.x = -Math.PI / 2
    glow.position.set(position.x, position.y + 0.003, position.z)
    glow.visible = false
    this.root.add(glow)
    this.toolGlowsByName.set(tool, glow)
  }

  private addSpoonLeaves(): THREE.Mesh {
    const spoonSpot = itemSpots.find((spot) => spot.shape === 'spoon')?.position ?? { x: 0, y: 0, z: 0 }
    const leaves = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.015, 10), this.materials.materialFor('leaves'))
    leaves.position.set(spoonSpot.x + 0.07, spoonSpot.y + 0.025, spoonSpot.z)
    leaves.visible = false
    this.toolsByName.get('spoon')?.add(leaves)
    return leaves
  }

  private addPuddle(): THREE.Mesh {
    const teaTable = furnitureWithId('teaTable')
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 20), this.materials.materialFor('puddle'))
    puddle.rotation.x = -Math.PI / 2
    puddle.position.set(teaTable.footprint.x - 0.2, teaTable.height + 0.002, teaTable.footprint.z + 0.1)
    puddle.visible = false
    this.root.add(puddle)
    return puddle
  }

  private invisibleMaterial(): THREE.Material {
    return new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
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
      case 'spoon':
        return this.spoon({ x, y, z })
      case 'cloth':
        return this.box('cloth', 0.28, 0.02, 0.2, { x, y: y + 0.01, z })
      case 'figurine':
        return this.figurine(spot)
    }
  }

  private faucet(base: WorldPoint): THREE.Object3D {
    const faucet = new THREE.Group()
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), this.materials.materialFor('steel'))
    post.position.set(base.x, base.y + 0.18, base.z)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, faucetSpout.z - base.z + 0.02), this.materials.materialFor('steel'))
    arm.position.set(base.x, faucetSpout.y + 0.02, (base.z + faucetSpout.z) / 2)
    const touchPad = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.3), this.invisibleMaterial())
    touchPad.position.set(base.x, base.y + 0.2, (base.z + faucetSpout.z) / 2)
    touchPad.castShadow = false
    faucet.add(post, arm, touchPad)
    post.castShadow = true
    arm.castShadow = true
    this.root.add(faucet)
    return faucet
  }

  private spoon(base: WorldPoint): THREE.Object3D {
    const spoon = new THREE.Group()
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.025), this.materials.materialFor('darkWood'))
    handle.position.set(base.x - 0.04, base.y + 0.01, base.z)
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.02, 12), this.materials.materialFor('darkWood'))
    bowl.position.set(base.x + 0.07, base.y + 0.012, base.z)
    spoon.add(handle, bowl)
    spoon.traverse((part) => (part.castShadow = true))
    this.root.add(spoon)
    return spoon
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
