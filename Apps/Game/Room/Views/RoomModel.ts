import * as THREE from 'three'
import {
  furniture,
  itemSpots,
  roomHalfSize,
  windowOnBackWall,
  type Footprint,
  type Furniture,
  type FurnitureId,
  type ItemSpot,
} from '../RoomLayout.ts'
import type { RoomMaterials, Surface } from './RoomMaterials.ts'

const wallHeight = 2.6
const wallThickness = 0.12
const reachOfFurnitureMetres = 0.35

export type TapTargetTag = { readonly furnitureId: FurnitureId } | { readonly isFloor: true }

export class RoomModel {
  readonly root = new THREE.Group()
  readonly tappableMeshes: THREE.Object3D[] = []
  private readonly materials: RoomMaterials

  constructor(materials: RoomMaterials) {
    this.materials = materials
    this.addFloor()
    this.addBackWallWithWindow()
    this.addLeftWall()
    for (const piece of furniture) this.addFurniture(piece)
    for (const spot of itemSpots) this.addItem(spot)
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
    const furnitureId = furnitureWithinReachOf(spot)
    if (furnitureId !== null) this.tag(mesh, { furnitureId })
  }

  private itemMesh(spot: ItemSpot): THREE.Object3D {
    const { x, y, z } = spot.position
    switch (spot.shape) {
      case 'heater':
        return this.box('heaterPlate', 0.34, 0.05, 0.3, { x, y: y + 0.025, z })
      case 'kettle':
        return this.kettle({ x, y: y + 0.05, z })
      case 'faucet':
        return this.box('steel', 0.05, 0.35, 0.05, { x, y: y + 0.17, z })
      case 'thermos':
        return this.cylinder('steel', 0.07, 0.34, { x, y: y + 0.17, z })
      case 'caddy':
        return this.cylinder('caddyGreen', 0.08, 0.18, { x, y: y + 0.09, z })
      case 'bowl':
        return this.bowl({ x, y, z })
      case 'spoon':
        return this.box('darkWood', 0.2, 0.02, 0.04, { x, y: y + 0.01, z })
      case 'cloth':
        return this.box('cloth', 0.28, 0.02, 0.2, { x, y: y + 0.01, z })
      case 'figurine':
        return this.figurine(spot)
    }
  }

  private kettle(base: { x: number; y: number; z: number }): THREE.Object3D {
    const kettle = new THREE.Group()
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), this.materials.materialFor('clay'))
    body.scale.set(1, 0.8, 1)
    body.position.y = 0.11
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.14, 6), this.materials.materialFor('clay'))
    spout.position.set(0.15, 0.14, 0)
    spout.rotation.z = -0.9
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 10), this.materials.materialFor('darkWood'))
    lid.position.y = 0.23
    kettle.add(body, spout, lid)
    kettle.position.set(base.x, base.y, base.z)
    kettle.traverse((part) => (part.castShadow = true))
    this.root.add(kettle)
    return kettle
  }

  private bowl(base: { x: number; y: number; z: number }): THREE.Object3D {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.06, 12), this.materials.materialFor('porcelain'))
    bowl.position.set(base.x, base.y + 0.03, base.z)
    bowl.castShadow = true
    this.root.add(bowl)
    return bowl
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
