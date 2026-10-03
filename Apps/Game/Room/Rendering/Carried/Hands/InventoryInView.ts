import * as THREE from 'three'
import type { InventorySlot } from '../../../../../../Shared/GameLogic/GameLogic.ts'
import type { CarriedModel } from '../CarriedModel.ts'
import { roomLayers } from '../../RoomLayers.ts'
import type { TapTargetTag } from '../../../TapTarget.ts'
import type { SurfaceMaterials } from '../../RoomMaterials.ts'
import type { HeldInView } from './HeldInView.ts'

type InventoryShelfFrame = {
  readonly slotWidth: number
  readonly screenHeight: number
  readonly topCentre: THREE.Vector3
  readonly turn: THREE.Quaternion
}

export const inventorySlots: readonly InventorySlot[] = [0, 1]

const inventoryDistanceMetres = 0.8
const slotShareOfScreenWidth = 0.1
const slotWidestShareOfScreenHeight = 0.12
const slotGapShareOfSlotWidth = 0.15
const inventoryShareOfScreenHeightFromBottom = 0.05
const slotAreaShareOfScreenHeight = 0.16
const sideBySlot: Readonly<Record<InventorySlot, number>> = { 0: -1, 1: 1 }
const shelfEndsBeyondTheSlotsShareOfSlotWidth = 0.1
const shelfDepthShareOfSlotWidth = 1.25
const shelfThicknessShareOfSlotWidth = 0.12
const shelfLipDepthShareOfSlotWidth = 0.06
const shelfLipHeightShareOfSlotWidth = 0.2
const itemAboveTheShelfShareOfSlotWidth = 0.01
const itemTurnOnTheShelfRadians = Math.PI / 4
const emptyShelfOpacity = 0.35
const shelfSeenFromAboveRadians = Math.PI / 6

export function keepInTheInventory(model: Pick<CarriedModel, 'root' | 'bodyRadius' | 'heightMetres'>, slotIndex: InventorySlot, inventoryInView: HeldInView): void {
  const frame = inventoryShelfFrame(inventoryInView)
  model.root.position.copy(pointOnTheShelf(frame, slotCentreAcross(frame, slotIndex), frame.slotWidth * itemAboveTheShelfShareOfSlotWidth))
  model.root.quaternion.copy(frame.turn).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), itemTurnOnTheShelfRadians))
  model.root.scale.setScalar(Math.min(frame.slotWidth / (2 * model.bodyRadius), frame.slotWidth / model.heightMetres))
}

export function inventoryAreaOnTheScreen(slotIndex: InventorySlot): THREE.Mesh {
  const area = roomLayers.touchAreaOf(new THREE.PlaneGeometry(1, 1))
  const tag: TapTargetTag = { kind: 'inventorySlot', slotIndex }
  area.userData = { tapTarget: tag }
  return area
}

export function placeTheInventoryAreaOnTheScreen(area: THREE.Object3D, slotIndex: InventorySlot, inventoryInView: HeldInView): void {
  const frame = inventoryShelfFrame(inventoryInView)
  area.position.copy(pointOnTheShelf(frame, slotCentreAcross(frame, slotIndex), frame.slotWidth / 2))
  area.quaternion.copy(inventoryInView.camera.quaternion)
  area.scale.set(frame.slotWidth * (1 + slotGapShareOfSlotWidth), frame.screenHeight * slotAreaShareOfScreenHeight, 1)
}

export function inventoryShelf(materials: Pick<SurfaceMaterials, 'unsharedMaterialFor'>): THREE.Group {
  const board = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials.unsharedMaterialFor('wood'))
  board.name = 'board'
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials.unsharedMaterialFor('darkWood'))
  lip.name = 'lip'
  const shelf = new THREE.Group()
  shelf.add(board, lip)
  roomLayers.putOnLayer(shelf, 'heldInView', 'decoration')
  return shelf
}

export function placeTheInventoryShelf(shelf: THREE.Object3D, inventoryInView: HeldInView, holdsAnything: boolean): void {
  const frame = inventoryShelfFrame(inventoryInView)
  showThroughTheShelfUnless(shelf, holdsAnything)
  const { length, depth } = shelfTopOf(frame)
  const thickness = frame.slotWidth * shelfThicknessShareOfSlotWidth
  const lipDepth = frame.slotWidth * shelfLipDepthShareOfSlotWidth
  const lipHeight = frame.slotWidth * shelfLipHeightShareOfSlotWidth
  shelf.position.copy(frame.topCentre)
  shelf.quaternion.copy(frame.turn)
  const board = shelf.getObjectByName('board')
  board?.scale.set(length, thickness, depth)
  board?.position.set(0, -thickness / 2, 0)
  const lip = shelf.getObjectByName('lip')
  lip?.scale.set(length, lipHeight, lipDepth)
  lip?.position.set(0, -lipHeight / 2, depth / 2 + lipDepth / 2)
}

export function shelfTopOf(frame: Pick<InventoryShelfFrame, 'slotWidth'>): { readonly length: number; readonly depth: number } {
  return {
    length: frame.slotWidth * (2 * (1 + slotGapShareOfSlotWidth) + 2 * shelfEndsBeyondTheSlotsShareOfSlotWidth),
    depth: frame.slotWidth * shelfDepthShareOfSlotWidth,
  }
}

export function inventoryShelfFrame(inventoryInView: HeldInView): InventoryShelfFrame {
  const { camera } = inventoryInView
  const screenHeight = screenHeightAt(camera)
  const screenWidth = screenHeight * camera.aspect
  const slotWidth = Math.min(screenWidth * slotShareOfScreenWidth, screenHeight * slotWidestShareOfScreenHeight)
  const bottom = -screenHeight / 2 + screenHeight * (inventoryShareOfScreenHeightFromBottom + inventoryInView.screenHeightShareTakenByControls)
  const topCentreInCamera = new THREE.Vector3(0, bottom, -inventoryDistanceMetres)
  const lineOfSightBelowTheMiddleRadians = Math.atan2(-topCentreInCamera.y, -topCentreInCamera.z)
  const turn = camera.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), shelfSeenFromAboveRadians - lineOfSightBelowTheMiddleRadians))
  return { slotWidth, screenHeight, topCentre: camera.localToWorld(topCentreInCamera), turn }
}

function showThroughTheShelfUnless(shelf: THREE.Object3D, holdsAnything: boolean): void {
  const opacity = holdsAnything ? 1 : emptyShelfOpacity
  shelf.traverse((part) => {
    if (!(part instanceof THREE.Mesh) || !(part.material instanceof THREE.Material) || part.material.opacity === opacity) return
    part.material.opacity = opacity
    part.material.transparent = opacity < 1
    part.material.depthWrite = opacity === 1
    part.material.needsUpdate = true
  })
}

export function slotCentreAcross(frame: Pick<InventoryShelfFrame, 'slotWidth'>, slotIndex: InventorySlot): number {
  return (sideBySlot[slotIndex] * frame.slotWidth * (1 + slotGapShareOfSlotWidth)) / 2
}

function pointOnTheShelf(frame: InventoryShelfFrame, across: number, up: number): THREE.Vector3 {
  return new THREE.Vector3(across, up, 0).applyQuaternion(frame.turn).add(frame.topCentre)
}

function screenHeightAt(camera: THREE.PerspectiveCamera): number {
  return 2 * inventoryDistanceMetres * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
}
