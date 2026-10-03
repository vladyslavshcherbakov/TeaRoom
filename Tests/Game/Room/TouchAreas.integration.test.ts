import assert from 'node:assert/strict'
import test from 'node:test'
import { isDeepStrictEqual } from 'node:util'
import * as THREE from 'three'
import { GlassThatClears } from '../../../Apps/Engine/Rendering/Looks.ts'
import { cameraFieldOfViewDegrees, closeUpPose, farthestDistanceShare, nearestDistanceShare, overviewPose, zoomedPose } from '../../../Apps/Game/Room/Camera/CameraPoses.ts'
import { firstPersonFieldOfViewDegrees, firstPersonPose, lookAt } from '../../../Apps/Engine/Camera/FirstPersonLook.ts'
import { eyeHeightMetres, playerHeightByDefaultCentimetres } from '../../../Apps/Engine/Camera/PlayerHeight.ts'
import { carriedShapeOf } from '../../../Apps/Game/Room/Layout/CarriedShapes.ts'
import type { TapTarget, TapTargetTag } from '../../../Apps/Game/Room/Input/TapTarget.ts'
import { furnitureWithId, turnOfItemAt, walkerStart, type FurnitureId } from '../../../Apps/Game/Room/Layout/RoomLayout.ts'
import type { CameraPose, FloorPoint } from '../../../Apps/Engine/Points.ts'
import { fingertipAround, middleOf, touchAreaAround, type ScreenBox } from '../../../Apps/Engine/TouchAreasOnScreen.ts'
import { LyingLids } from '../../../Apps/Game/Room/Layout/Placement.ts'
import { standingAt } from '../../../Apps/Engine/Walking/Walk.ts'
import type { CarriedItemsScene } from '../../../Apps/Game/Room/Rendering/Carried/CarriedItemsScene.ts'
import { newCarriedModel, tagForTaps, type CarriedModel } from '../../../Apps/Game/Room/Rendering/Carried/CarriedModel.ts'
import { showContentsOf } from '../../../Apps/Game/Room/Rendering/Carried/ItemContents.ts'
import { handAreaOnTheScreen, holdInView, placeTheHandsAreaOnTheScreen } from '../../../Apps/Game/Room/Rendering/Carried/Hands/HeldInView.ts'
import { inventoryAreaOnTheScreen, inventorySlots, keepInTheInventory, placeTheInventoryAreaOnTheScreen } from '../../../Apps/Game/Room/Rendering/Carried/Hands/InventoryInView.ts'
import { screenPointThatTapsTheTarget, tapTargetUnderTheFinger, touchablesUnderTheFinger, type TappablePass } from '../../../Apps/Game/Room/Rendering/TapTargetUnderTheFinger.ts'
import type { ItemSetUp } from '../../../Apps/Game/Room/Rendering/Carried/ItemParts.ts'
import type { SurfaceMaterials } from '../../../Apps/Game/Room/Rendering/RoomMaterials.ts'
import { WallThings } from '../../../Apps/Game/Room/Rendering/WallThings.ts'
import { worldViewState } from '../../../Apps/Game/Presentation/WorldPresenter.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn } from '../../../Shared/Engine/Catalog.ts'
import { carriedItemIdsIn, itemLocationIn } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'
import type { DeepReadonly } from '../../../Shared/Engine/DeepReadonly.ts'
import type { HandIndex, SessionState } from '../../../Shared/GameLogic/State/SessionState.ts'
import { TestTeaSession } from '../../Support/TestTeaSession.ts'
import { quietRoomLayout } from '../../Support/TestRoom.ts'

type ViewKind = 'room view' | 'close-up' | 'first person'

type TappableThing = {
  readonly name: string
  readonly root: THREE.Object3D
  readonly targetsOfItsParts: readonly TapTarget[]
  readonly furnitureId: FurnitureId | null
}

type View = {
  readonly kind: ViewKind
  readonly camera: THREE.PerspectiveCamera
}

const smallestPhoneScreen = { left: 0, top: 0, width: 375, height: 667 }
const phoneAspect = smallestPhoneScreen.width / smallestPhoneScreen.height
const cornerInsideTheAreaPixels = 1
const roundingPixels = 0.001
const fingertipPixels = 44
const quietRoomSurroundings = { layout: quietRoomLayout, heaterSpot: definitionIn(defaultCatalog, 'rooms', 'quietRoom').heaterSpot }
const everyHandIndex: readonly HandIndex[] = [0, 1]
const everyZoom = [nearestDistanceShare, farthestDistanceShare]
const everyViewKind: readonly ViewKind[] = ['room view', 'close-up', 'first person']
const screenHeightShareTakenBySticks = 0.34
const noActionsBehindTheHands = (): boolean => false

test('standingItem_everyOneInTheRoomViewACloseUpAndFirstPersonAtEitherZoom_isReachedAnywhereWithin22PixelsOfItsMiddle', () => {
  for (const item of standingItemsOfTheQuietRoom()) {
    const viewKindsChecked = areaChecksOf(item, viewsShowing(item))

    assert.deepEqual(viewKindsChecked, everyViewKind, `${item.name} was seen only in ${viewKindsChecked.join(', ')}`)
  }
})

test('wallControl_everyOneInTheRoomViewACloseUpAndFirstPersonAtEitherZoom_isReachedAnywhereWithin22PixelsOfItsMiddle', () => {
  for (const control of wallControlsOfTheQuietRoom()) {
    const viewKindsChecked = areaChecksOf(control, viewsShowing(control))

    assert.deepEqual(viewKindsChecked, everyViewKind.filter((kind) => kind !== 'close-up' || isSeenInACloseUp(control)), `${control.name} was seen only in ${viewKindsChecked.join(', ')}`)
  }
})

test('heldItem_everyOneInEveryHandInACloseUpOrFirstPerson_isReachedThroughItsHandsAreaAtLeast44PixelsWideAndHigh', () => {
  const camera = cameraAt({ position: { x: 0, y: 1, z: 1 }, target: { x: 0, y: 1, z: 0 } }, cameraFieldOfViewDegrees)

  for (const itemId of carriedItemIdsOfTheQuietRoom()) {
    for (const handIndex of everyHandIndex) {
      for (const heldInView of [{ camera, isFirstPerson: false, screenHeightShareTakenByControls: 0 }, { camera, isFirstPerson: true, screenHeightShareTakenByControls: screenHeightShareTakenBySticks }]) {
        const model = modelWithItsContents(itemId)
        tagForTaps(model, { kind: 'hand', handIndex })
        holdInView(model, handIndex, heldInView)
        const handArea = handAreaOnTheScreen(handIndex)
        placeTheHandsAreaOnTheScreen(handArea, handIndex, heldInView)
        const pass: TappablePass = { camera, tappable: [model.root], areasOnTheScreen: [handArea], isDrawnOverTheScene: true }

        const area = areaWhereATapReaches(pass, middleOnTheScreenOf(model.root, camera), [{ kind: 'hand', handIndex }])

        assert.ok(area !== null && isAtLeastAFingertip(area), `${itemId} in hand ${handIndex}, ${heldInView.isFirstPerson ? 'first person' : 'close-up'}: ${describe(area)}`)
      }
    }
  }
})

test('handArea_aFifthOfTheScreenBesideTheHeldSpoon_letsATapOnNothingThrough', () => {
  const camera = cameraAt({ position: { x: 0, y: 1, z: 1 }, target: { x: 0, y: 1, z: 0 } }, cameraFieldOfViewDegrees)
  const heldInView = { camera, isFirstPerson: false, screenHeightShareTakenByControls: 0 }
  const spoon = modelWithItsContents('spoon')
  tagForTaps(spoon, { kind: 'hand', handIndex: 0 })
  holdInView(spoon, 0, heldInView)
  const handArea = handAreaOnTheScreen(0)
  placeTheHandsAreaOnTheScreen(handArea, 0, heldInView)
  const pass: TappablePass = { camera, tappable: [spoon.root], areasOnTheScreen: [handArea], isDrawnOverTheScene: true }
  const middleOfTheSpoon = middleOnTheScreenOf(spoon.root, camera)
  if (middleOfTheSpoon === null) throw new Error('the held spoon is not on the screen')

  const reach = tapTargetUnderTheFinger({ x: middleOfTheSpoon.x + smallestPhoneScreen.width / 5, y: middleOfTheSpoon.y }, smallestPhoneScreen, [pass], noActionsBehindTheHands)

  assert.equal(reach.target.kind, 'nothing')
})

test('inventoryItem_everyOneInEitherPlaceInEveryView_isReachedThroughItsAreaAtLeast44PixelsWideAndHigh', () => {
  const camera = cameraAt({ position: { x: 0, y: 1, z: 1 }, target: { x: 0, y: 1, z: 0 } }, cameraFieldOfViewDegrees)

  for (const itemId of carriedItemIdsOfTheQuietRoom()) {
    for (const slotIndex of inventorySlots) {
      for (const inventoryInView of [{ camera, isFirstPerson: false, screenHeightShareTakenByControls: 0 }, { camera, isFirstPerson: true, screenHeightShareTakenByControls: screenHeightShareTakenBySticks }]) {
        const model = modelWithItsContents(itemId)
        tagForTaps(model, { kind: 'inventorySlot', slotIndex })
        keepInTheInventory(model, slotIndex, inventoryInView)
        const inventoryArea = inventoryAreaOnTheScreen(slotIndex)
        placeTheInventoryAreaOnTheScreen(inventoryArea, slotIndex, inventoryInView)
        const pass: TappablePass = { camera, tappable: [model.root], areasOnTheScreen: [inventoryArea], isDrawnOverTheScene: true }

        const area = areaWhereATapReaches(pass, middleOnTheScreenOf(model.root, camera), [{ kind: 'inventorySlot', slotIndex }])

        assert.ok(area !== null && isAtLeastAFingertip(area), `${itemId} in place ${slotIndex} of the inventory, ${inventoryInView.isFirstPerson ? 'first person' : 'close-up'}: ${describe(area)}`)
      }
    }
  }
})

test('screenPointOfATarget_whenANearerThingCoversItsMiddle_isAPointWhereATapReachesIt', () => {
  const faucet = tappableBox({ kind: 'faucet' }, { width: 0.4, height: 0.4 }, 0)
  const lidInFront = tappableBox({ kind: 'lid', itemId: 'thermos' }, { width: 0.15, height: 0.15 }, 0.3)
  const pass: TappablePass = { camera: cameraAt({ position: { x: 0, y: 0, z: 2 }, target: { x: 0, y: 0, z: 0 } }, cameraFieldOfViewDegrees), tappable: [faucet, lidInFront], areasOnTheScreen: [], isDrawnOverTheScene: false }
  const targetTappedAt = (point: { readonly x: number; readonly y: number }): TapTarget => tapTargetUnderTheFinger(point, smallestPhoneScreen, [pass], noActionsBehindTheHands).target

  const pointOfTheFaucet = screenPointThatTapsTheTarget({ kind: 'faucet' }, [pass], smallestPhoneScreen, targetTappedAt)

  assert.ok(pointOfTheFaucet !== null)
  assert.deepEqual(targetTappedAt(pointOfTheFaucet), { kind: 'faucet' })
})

test('thingInTheRoom_whenOnlyItsBoxOnTheScreenHoldsTheFinger_givesWayToWhatTheFingerTouched', () => {
  const barAcrossTheScreen = tappableBox({ kind: 'guideBook' }, { width: 0.6, height: 0.02 }, 0)
  barAcrossTheScreen.rotation.z = Math.PI / 4
  barAcrossTheScreen.updateMatrixWorld(true)
  const wallBehind = tappableBox({ kind: 'floor' }, { width: 4, height: 4 }, -0.5)
  const pass: TappablePass = { camera: cameraAt({ position: { x: 0, y: 0, z: 2 }, target: { x: 0, y: 0, z: 0 } }, cameraFieldOfViewDegrees), tappable: [barAcrossTheScreen, wallBehind], areasOnTheScreen: [], isDrawnOverTheScene: false }
  const topLeftOfTheBar = screenPointOf(new THREE.Vector3(-0.2, 0.2, 0), pass.camera)

  const reach = tapTargetUnderTheFinger(topLeftOfTheBar, smallestPhoneScreen, [pass], noActionsBehindTheHands)

  assert.equal(reach.target.kind, 'floor')
})

test('thingInTheRoom_whenTheFingerTouchesAPlaceWellInFrontOfIt_givesWayToThatPlace', () => {
  const book = tappableBox({ kind: 'guideBook' }, { width: 0.05, height: 0.05 }, 0)
  const counterInFront = tappableBox({ kind: 'floor' }, { width: 1, height: 0.4 }, 1)
  counterInFront.position.y = -0.013 - 0.2
  counterInFront.updateMatrixWorld(true)
  const pass: TappablePass = { camera: cameraAt({ position: { x: 0, y: 0, z: 2 }, target: { x: 0, y: 0, z: 0 } }, cameraFieldOfViewDegrees), tappable: [book, counterInFront], areasOnTheScreen: [], isDrawnOverTheScene: false }
  const justBelowTheBook = { x: smallestPhoneScreen.width / 2, y: smallestPhoneScreen.height / 2 + 19 }

  const reach = tapTargetUnderTheFinger(justBelowTheBook, smallestPhoneScreen, [pass], noActionsBehindTheHands)

  assert.equal(reach.target.kind, 'floor')
})

test('thingInTheRoom_whenTheFingerTouchesAPlaceRightInFrontOfIt_isReached', () => {
  const book = tappableBox({ kind: 'guideBook' }, { width: 0.05, height: 0.05 }, 0)
  const counterUnderIt = tappableBox({ kind: 'floor' }, { width: 1, height: 0.4 }, 0.03)
  counterUnderIt.position.y = -0.028 - 0.2
  counterUnderIt.updateMatrixWorld(true)
  const pass: TappablePass = { camera: cameraAt({ position: { x: 0, y: 0, z: 2 }, target: { x: 0, y: 0, z: 0 } }, cameraFieldOfViewDegrees), tappable: [book, counterUnderIt], areasOnTheScreen: [], isDrawnOverTheScene: false }
  const justBelowTheBook = { x: smallestPhoneScreen.width / 2, y: smallestPhoneScreen.height / 2 + 19 }

  const reach = tapTargetUnderTheFinger(justBelowTheBook, smallestPhoneScreen, [pass], noActionsBehindTheHands)

  assert.deepEqual({ target: reach.target, touched: reach.touched.kind }, { target: { kind: 'guideBook' }, touched: 'floor' })
})

function screenPointOf(point: THREE.Vector3, camera: THREE.PerspectiveCamera): { readonly x: number; readonly y: number } {
  const projected = point.clone().project(camera)
  return { x: ((projected.x + 1) / 2) * smallestPhoneScreen.width, y: ((1 - projected.y) / 2) * smallestPhoneScreen.height }
}

function tappableBox(target: TapTargetTag, size: { readonly width: number; readonly height: number }, distanceTowardsTheCamera: number): THREE.Mesh {
  const box = new THREE.Mesh(new THREE.BoxGeometry(size.width, size.height, 0.05))
  box.position.z = distanceTowardsTheCamera
  box.userData = { tapTarget: target }
  box.updateMatrixWorld(true)
  return box
}

function areaChecksOf(thing: TappableThing, views: readonly View[]): ViewKind[] {
  const viewKindsChecked = new Set<ViewKind>()
  for (const { kind, camera } of views) {
    const middle = middleOnTheScreenOf(thing.root, camera)
    if (middle === null) continue
    const pass: TappablePass = { camera, tappable: [thing.root], areasOnTheScreen: [], isDrawnOverTheScene: false }
    const fingertip = fingertipAroundTheMiddleOf(pass, middle, thing.targetsOfItsParts)

    assert.ok(fingertip !== null && isReachedAtEveryCornerOf(fingertip, pass, thing.targetsOfItsParts), `${thing.name} in the ${kind}: not reached at every corner of a fingertip around its middle`)
    viewKindsChecked.add(kind)
  }
  return everyViewKind.filter((kind) => viewKindsChecked.has(kind))
}

function areaWhereATapReaches(pass: TappablePass, middle: { readonly x: number; readonly y: number } | null, targetsOfItsParts: readonly TapTarget[]): ScreenBox | null {
  if (middle === null) return null
  const [touchable] = touchablesUnderTheFinger(middle, pass, smallestPhoneScreen, null).reached.filter((candidate) => isDeepStrictEqual(candidate.target, targetsOfItsParts[0]))
  if (touchable === undefined) return null
  const area = touchAreaAround(touchable.box)
  return isReachedAtEveryCornerOf(area, pass, targetsOfItsParts) ? area : null
}

function fingertipAroundTheMiddleOf(pass: TappablePass, middle: { readonly x: number; readonly y: number }, targetsOfItsParts: readonly TapTarget[]): ScreenBox | null {
  const [touchable] = touchablesUnderTheFinger(middle, pass, smallestPhoneScreen, null).reached.filter((candidate) => isDeepStrictEqual(candidate.target, targetsOfItsParts[0]))
  return touchable === undefined ? null : fingertipAround(middleOf(touchable.box))
}

function isReachedAtEveryCornerOf(area: ScreenBox, pass: TappablePass, targetsOfItsParts: readonly TapTarget[]): boolean {
  const corners = [
    { x: area.left + cornerInsideTheAreaPixels, y: area.top + cornerInsideTheAreaPixels },
    { x: area.right - cornerInsideTheAreaPixels, y: area.top + cornerInsideTheAreaPixels },
    { x: area.left + cornerInsideTheAreaPixels, y: area.bottom - cornerInsideTheAreaPixels },
    { x: area.right - cornerInsideTheAreaPixels, y: area.bottom - cornerInsideTheAreaPixels },
  ]
  return corners.every((corner) => targetsOfItsParts.some((target) => isDeepStrictEqual(tapTargetUnderTheFinger(corner, smallestPhoneScreen, [pass], noActionsBehindTheHands).target, target)))
}

function isAtLeastAFingertip(area: ScreenBox): boolean {
  return area.right - area.left >= fingertipPixels - roundingPixels && area.bottom - area.top >= fingertipPixels - roundingPixels
}

function describe(area: ScreenBox | null): string {
  return area === null ? 'no area reaches it at its middle and every corner' : `an area of ${(area.right - area.left).toFixed(1)} by ${(area.bottom - area.top).toFixed(1)} px`
}

function viewsShowing(thing: TappableThing): View[] {
  const roomViews = everyZoom.map((zoom) => ({ kind: 'room view' as const, camera: cameraAt(zoomedPose(overviewPose(walkerStart, phoneAspect), zoom), cameraFieldOfViewDegrees) }))
  const closeUps = quietRoomLayout.furniture.flatMap((piece) => piece.sides.flatMap((side) => everyZoom.map((zoom) => ({ kind: 'close-up' as const, camera: cameraAt(zoomedPose(closeUpPose(side.closeUp, phoneAspect), zoom), cameraFieldOfViewDegrees) }))))
  const firstPerson = { kind: 'first person' as const, camera: cameraAt(firstPersonPoseLookingAt(thing), firstPersonFieldOfViewDegrees) }
  return [...roomViews, ...closeUps, firstPerson]
}

function firstPersonPoseLookingAt(thing: TappableThing): CameraPose {
  const standingPoint = thing.furnitureId === null ? walkerStart : nearestSideOf(thing.furnitureId, thing.root.position)
  const eyeHeight = eyeHeightMetres(playerHeightByDefaultCentimetres, 0)
  const middle = new THREE.Box3().setFromObject(thing.root).getCenter(new THREE.Vector3())
  return firstPersonPose(standingPoint, lookAt(middle, { x: standingPoint.x, y: eyeHeight, z: standingPoint.z }), eyeHeight)
}

function nearestSideOf(furnitureId: FurnitureId, point: FloorPoint): FloorPoint {
  const sidesNearestFirst = [...furnitureWithId(quietRoomLayout, furnitureId).sides].sort((first, second) => distanceBetween(first.standingPoint, point) - distanceBetween(second.standingPoint, point))
  return sidesNearestFirst[0]?.standingPoint ?? walkerStart
}

function distanceBetween(first: FloorPoint, second: FloorPoint): number {
  return Math.hypot(first.x - second.x, first.z - second.z)
}

function isSeenInACloseUp(thing: TappableThing): boolean {
  return viewsShowing(thing).some(({ kind, camera }) => kind === 'close-up' && middleOnTheScreenOf(thing.root, camera) !== null)
}

function cameraAt(pose: CameraPose, fieldOfViewDegrees: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(fieldOfViewDegrees, phoneAspect, 0.1, 100)
  camera.position.set(pose.position.x, pose.position.y, pose.position.z)
  camera.lookAt(pose.target.x, pose.target.y, pose.target.z)
  camera.updateMatrixWorld(true)
  return camera
}

function middleOnTheScreenOf(root: THREE.Object3D, camera: THREE.PerspectiveCamera): { readonly x: number; readonly y: number } | null {
  root.updateWorldMatrix(true, true)
  const middle = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3())
  if (middle.clone().applyMatrix4(camera.matrixWorldInverse).z > -camera.near) return null
  const projected = middle.project(camera)
  if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) return null
  return { x: ((projected.x + 1) / 2) * smallestPhoneScreen.width, y: ((1 - projected.y) / 2) * smallestPhoneScreen.height }
}

function standingItemsOfTheQuietRoom(): TappableThing[] {
  const state = new TestTeaSession(defaultCatalog, 'quietRoom').state
  return carriedItemIdsOfTheQuietRoom().flatMap((itemId) => {
    const location = itemLocationIn(state, itemId)
    if (location?.kind !== 'onSurface') return []
    const model = modelWithItsContents(itemId)
    model.root.position.set(location.spot.x, location.spot.y, location.spot.z)
    model.root.rotation.y = turnOfItemAt(quietRoomLayout, location.spot)
    tagForTaps(model, { kind: 'item', itemId })
    const targetsOfItsParts: TapTarget[] = [{ kind: 'item', itemId }, { kind: 'lid', itemId }, { kind: 'opening', itemId }]
    return [{ name: itemId, root: model.root, targetsOfItsParts, furnitureId: furnitureIdOf(location.spot.placeId) }]
  })
}

function wallControlsOfTheQuietRoom(): TappableThing[] {
  const tagAsATapTarget = (object: THREE.Object3D, tag: object): void => object.traverse((part) => (part.userData = { ...part.userData, tapTarget: tag }))
  const wallThings = new WallThings(plainSurfaceMaterials(), quietRoomLayout, tagAsATapTarget)
  wallThings.medal.visible = true
  return [
    { name: 'the medal', root: wallThings.medal, targetsOfItsParts: [{ kind: 'medal' }], furnitureId: null },
    { name: 'the settings gear', root: wallThings.settingsGear.root, targetsOfItsParts: [{ kind: 'settingsGear' }], furnitureId: null },
    { name: 'the guide book', root: wallThings.guideBook, targetsOfItsParts: [{ kind: 'guideBook' }], furnitureId: null },
  ]
}

function modelWithItsContents(itemId: string): CarriedModel {
  const state = new TestTeaSession(defaultCatalog, 'quietRoom').state
  const model = newCarriedModel(itemId, carriedShapeOfTheQuietRoom(itemId), plainItemSetUp())
  showContentsOf(model, sceneOf(state), new LyingLids(() => {}).layOpenLids(state, quietRoomSurroundings))
  return model
}

function sceneOf(state: DeepReadonly<SessionState>): CarriedItemsScene {
  return { state, view: worldViewState(state, defaultCatalog), walk: standingAt({ x: 0, z: 0 }), heldInView: null, inventoryInView: { camera: new THREE.PerspectiveCamera(), isFirstPerson: false, screenHeightShareTakenByControls: 0 }, inspected: null, aimedPour: null, clothWiping: null, handsThatTakeTaps: [], inventorySlotsThatTakeTaps: [], sipGesture: null, timeSeconds: 0, temperatureUnitShown: null, distantDetail: null }
}

function carriedItemIdsOfTheQuietRoom(): string[] {
  return [...carriedItemIdsIn(new TestTeaSession(defaultCatalog, 'quietRoom').state)]
}

function carriedShapeOfTheQuietRoom(itemId: string): NonNullable<ReturnType<typeof carriedShapeOf>> {
  const shape = carriedShapeOf(new TestTeaSession(defaultCatalog, 'quietRoom').state, itemId)
  if (shape === undefined) throw new Error(`${itemId} has no shape in the room`)
  return shape
}

function plainSurfaceMaterials(): SurfaceMaterials {
  const plain = (): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide })
  return { materialFor: plain, unsharedMaterialFor: plain, glassThatClears: () => new GlassThatClears('#ffffff', null), colourOf: () => new THREE.Color(), colourOfACloth: () => new THREE.Color() }
}

function plainItemSetUp(): ItemSetUp {
  return { room: plainSurfaceMaterials(), clothPatternOf: () => 'blueStripes', bowlIdWithTheToadUnderneath: 'bowl1', log: () => {} }
}

function furnitureIdOf(placeId: string): FurnitureId | null {
  return quietRoomLayout.furniture.find((piece) => piece.id === placeId)?.id ?? null
}
